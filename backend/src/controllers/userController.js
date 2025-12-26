const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

// API 8: Add User to Tenant
exports.addUser = async (req, res) => {
  const { tenantId } = req.params;
  const { email, password, fullName, role } = req.body;
  const requester = req.user;

  // Authorization: Tenant Admin only (or Super Admin)
  if (requester.role !== 'tenant_admin' && requester.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  if (requester.role === 'tenant_admin' && requester.tenantId !== tenantId) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check Subscription Limits
    const tenantRes = await client.query('SELECT max_users FROM tenants WHERE id = $1', [tenantId]);
    const currentCountRes = await client.query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenantId]);
    
    const maxUsers = tenantRes.rows[0].max_users;
    const currentUsers = parseInt(currentCountRes.rows[0].count);

    if (currentUsers >= maxUsers) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Subscription limit reached' });
    }

    // 2. Check email uniqueness in tenant
    const emailCheck = await client.query('SELECT id FROM users WHERE tenant_id = $1 AND email = $2', [tenantId, email]);
    if (emailCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Email already exists in this tenant' });
    }

    // 3. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Create User
    const insertQuery = `
      INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      RETURNING id, email, full_name, role, tenant_id, is_active as "isActive", created_at as "createdAt"
    `;
    const result = await client.query(insertQuery, [tenantId, email, hashedPassword, fullName, role || 'user']);

    // 5. Audit Log
    await client.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) VALUES (gen_random_uuid(), $1, $2, 'CREATE_USER', 'user', $3)`,
      [tenantId, requester.userId, result.rows[0].id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: result.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

// API 9: List Tenant Users
exports.listUsers = async (req, res) => {
  const { tenantId } = req.params;
  const { search, role, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  // Auth: User must belong to tenant
  if (req.user.tenantId !== tenantId && req.user.role !== 'super_admin') {
     return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    let whereClause = 'WHERE tenant_id = $1';
    let values = [tenantId];
    let paramCount = 2;

    if (search) {
      whereClause += ` AND (full_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      values.push(`%${search}%`);
      paramCount++;
    }
    if (role) {
      whereClause += ` AND role = $${paramCount}`;
      values.push(role);
      paramCount++;
    }

    const query = `
      SELECT id, email, full_name as "fullName", role, is_active as "isActive", created_at as "createdAt"
      FROM users ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;

    const listValues = [...values, limit, offset];
    const usersRes = await pool.query(query, listValues);
    const countRes = await pool.query(countQuery, values);

    res.status(200).json({
      success: true,
      data: {
        users: usersRes.rows,
        total: parseInt(countRes.rows[0].count),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(parseInt(countRes.rows[0].count) / limit),
          limit: parseInt(limit)
        }
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 10: Update User
exports.updateUser = async (req, res) => {
  const { userId } = req.params;
  const { fullName, role, isActive } = req.body;
  const requester = req.user;

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const targetUser = userCheck.rows[0];

    // Auth: Tenant Admin or Self
    const isSelf = requester.userId === userId;
    const isAdmin = requester.role === 'tenant_admin' || requester.role === 'super_admin';

    if (!isSelf && !isAdmin) return res.status(403).json({ success: false, message: 'Unauthorized' });
    if (!isAdmin && requester.tenantId !== targetUser.tenant_id) return res.status(403).json({ success: false, message: 'Unauthorized' });

    // Restrictions
    if (!isAdmin && (role || isActive !== undefined)) {
      return res.status(403).json({ success: false, message: 'Only admins can update role or status' });
    }

    let fields = [];
    let values = [];
    let idx = 1;

    if (fullName) { fields.push(`full_name = $${idx++}`); values.push(fullName); }
    if (role && isAdmin) { fields.push(`role = $${idx++}`); values.push(role); }
    if (isActive !== undefined && isAdmin) { fields.push(`is_active = $${idx++}`); values.push(isActive); }
    
    fields.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, full_name as "fullName", role, updated_at as "updatedAt"`;
    const result = await pool.query(query, values);

    // Audit Log
    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) VALUES (gen_random_uuid(), $1, $2, 'UPDATE_USER', 'user', $3)`,
      [targetUser.tenant_id, requester.userId, userId]
    );

    res.status(200).json({ success: true, message: 'User updated successfully', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 11: Delete User
exports.deleteUser = async (req, res) => {
  const { userId } = req.params;
  const requester = req.user;

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const targetUser = userCheck.rows[0];

    // Auth: Tenant Admin Only
    if (requester.role !== 'tenant_admin' && requester.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (requester.tenantId !== targetUser.tenant_id && requester.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    if (userId === requester.userId) {
      return res.status(403).json({ success: false, message: 'Cannot delete yourself' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    // Audit Log
    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) VALUES (gen_random_uuid(), $1, $2, 'DELETE_USER', 'user', $3)`,
      [targetUser.tenant_id, requester.userId, userId]
    );

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};