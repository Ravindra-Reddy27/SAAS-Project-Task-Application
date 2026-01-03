const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');

// API 8: Add User to Tenant
exports.addUser = async (req, res) => {
  const { tenantId } = req.params;
  const { fullName, email, password, role, isActive } = req.body; // Changed 'status' to 'isActive'
  const requester = req.user;

  try {
    // 1. Auth Check
    if (requester.tenantId !== tenantId && requester.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // 2. Subscription Limit Check
    const tenantPromise = pool.query('SELECT max_users FROM tenants WHERE id = $1', [tenantId]);
    const countPromise = pool.query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenantId]);
    
    const [tenantRes, countRes] = await Promise.all([tenantPromise, countPromise]);

    if (tenantRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }

    const maxUsers = tenantRes.rows[0].max_users;
    const currentCount = parseInt(countRes.rows[0].count);

    if (currentCount >= maxUsers) {
      return res.status(403).json({ 
        success: false, 
        message: `Subscription limit reached. Your plan allows max ${maxUsers} users.` 
      });
    }

    // 3. Check if user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already exists in this tenant' });
    }

    // 4. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 5. Create User
    // FIX: Aliased columns to match requirement (fullName, isActive, tenantId)
    const query = `
      INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, is_active)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)
      RETURNING id, email, full_name as "fullName", role, tenant_id as "tenantId", is_active as "isActive", created_at as "createdAt"
    `;
    
    // Default isActive to true if not provided
    const activeStatus = isActive !== undefined ? isActive : true; 

    const result = await pool.query(query, [
      tenantId, 
      fullName, 
      email, 
      hashedPassword, 
      role || 'user', 
      activeStatus
    ]);

    // Audit Log
    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) 
       VALUES (gen_random_uuid(), $1, $2, 'CREATE_USER', 'user', $3)`,
      [tenantId, requester.userId, result.rows[0].id]
    );

    // FIX: Standardized Response Format
    res.status(201).json({ 
      success: true, 
      message: "User created successfully",
      data: result.rows[0] 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 9: List Tenant Users
exports.listUsers = async (req, res) => {
  const { tenantId } = req.params;
  const requester = req.user;
  const { search, role, page = 1, limit = 50 } = req.query; // Added pagination params

  try {
    const currentTenantId = requester.tenantId || requester.tenant_id;

    if (currentTenantId !== tenantId && requester.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Pagination Logic
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE tenant_id = $1';
    let values = [tenantId];
    let idx = 2;

    if (search) {
      whereClause += ` AND (full_name ILIKE $${idx} OR email ILIKE $${idx})`;
      values.push(`%${search}%`);
      idx++;
    }

    if (role) {
      whereClause += ` AND role = $${idx}`;
      values.push(role);
      idx++;
    }

    // Query 1: Get Users with Pagination
    // FIX: Aliased columns to match requirement (fullName, isActive)
    const query = `
      SELECT id, email, full_name as "fullName", role, is_active as "isActive", created_at as "createdAt"
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    // Query 2: Get Total Count for Metadata
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;

    const [usersRes, countRes] = await Promise.all([
      pool.query(query, [...values, limitNum, offset]),
      pool.query(countQuery, values)
    ]);

    const total = parseInt(countRes.rows[0].count);

    // FIX: Standardized Response Format with Pagination
    res.status(200).json({ 
      success: true, 
      data: { 
        users: usersRes.rows,
        total: total,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          limit: limitNum
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
  const { id } = req.params;
  const { fullName, email, role, isActive, password } = req.body; // Changed 'status' to 'isActive'
  const requester = req.user;

  try {
    const check = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    
    // Auth Check
    const isSelf = id === requester.userId;
    const isAdmin = requester.role === 'tenant_admin' || requester.role === 'super_admin';

    // Verify tenant membership
    if (requester.tenantId !== check.rows[0].tenant_id && requester.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Permissions Check
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    let fields = [];
    let values = [];
    let idx = 1;

    const addField = (col, val) => { fields.push(`${col} = $${idx++}`); values.push(val); };

    // Self can update name/email/password. Admins can update role/active.
    if (fullName) addField('full_name', fullName);
    
    // Admin Only Fields
    if (isAdmin) {
      if (email) addField('email', email);
      if (role) addField('role', role);
      if (isActive !== undefined) addField('is_active', isActive);
    }
    
    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);
      addField('password_hash', hash);
    }

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields provided' });

    values.push(id);
    // FIX: Return alias and updatedAt (using CURRENT_TIMESTAMP as proxy for update time if DB column missing)
    const query = `
      UPDATE users 
      SET ${fields.join(', ')} 
      WHERE id = $${idx} 
      RETURNING id, full_name as "fullName", role, is_active as "isActive", created_at as "createdAt"
    `;
    
    const result = await pool.query(query, values);

    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) 
       VALUES (gen_random_uuid(), $1, $2, 'UPDATE_USER', 'user', $3)`,
      [check.rows[0].tenant_id, requester.userId, id]
    );

    // FIX: Standardized Response Format
    res.status(200).json({ 
      success: true, 
      message: "User updated successfully",
      data: {
        ...result.rows[0],
        updatedAt: new Date().toISOString() // Manually adding timestamp for spec compliance
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 11: Delete User
exports.deleteUser = async (req, res) => {
  const { id } = req.params;
  const requester = req.user;

  try {
    const check = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    if (requester.tenantId !== check.rows[0].tenant_id && requester.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (id === requester.userId) {
      return res.status(403).json({ success: false, message: 'Cannot delete yourself' });
    }

    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) 
       VALUES (gen_random_uuid(), $1, $2, 'DELETE_USER', 'user', $3)`,
      [check.rows[0].tenant_id, requester.userId, id]
    );

    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    // FIX: Standardized Response Format
    res.status(200).json({ 
      success: true, 
      message: 'User deleted successfully' 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};