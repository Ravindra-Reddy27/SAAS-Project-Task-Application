const { pool } = require('../config/db');

// Define Plan Limits configuration
const PLAN_LIMITS = {
  free: { maxUsers: 5, maxProjects: 3 },
  pro: { maxUsers: 25, maxProjects: 15 },
  enterprise: { maxUsers: 100, maxProjects: 50 }
};

// API 5: Get Tenant Details
exports.getTenantDetails = async (req, res) => {
  const { tenantId } = req.params;
  const { role, tenantId: userTenantId } = req.user;

  // Authorization: User must belong to this tenant OR be super_admin
  if (role !== 'super_admin' && userTenantId !== tenantId) {
    return res.status(403).json({ success: false, message: 'Unauthorized access' });
  }

  try {
    // 1. Get Tenant Basic Info
    const tenantRes = await pool.query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenantRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Tenant not found' });
    }
    const tenant = tenantRes.rows[0];

    // 2. Calculate Stats (Users, Projects, Tasks)
    const userCountRes = await pool.query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenantId]);
    const projectCountRes = await pool.query('SELECT COUNT(*) FROM projects WHERE tenant_id = $1', [tenantId]);
    const taskCountRes = await pool.query('SELECT COUNT(*) FROM tasks WHERE tenant_id = $1', [tenantId]);

    const stats = {
      totalUsers: parseInt(userCountRes.rows[0].count),
      totalProjects: parseInt(projectCountRes.rows[0].count),
      totalTasks: parseInt(taskCountRes.rows[0].count)
    };

    res.status(200).json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        status: tenant.status,
        subscriptionPlan: tenant.subscription_plan,
        maxUsers: tenant.max_users,
        maxProjects: tenant.max_projects,
        createdAt: tenant.created_at,
        stats: stats
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 6: Update Tenant (FIXED: Automatic Limit Updates)
exports.updateTenant = async (req, res) => {
  const { tenantId } = req.params;
  const { role } = req.user;
  // We accept basic fields. Note: We do NOT rely on maxUsers/maxProjects from body if plan is changing.
  const { name, status, subscriptionPlan } = req.body;

  // Authorization: Only tenant_admin or super_admin
  if (role !== 'super_admin' && role !== 'tenant_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  // Authorization: Tenant Admin can ONLY update name
  if (role === 'tenant_admin') {
      if (status || subscriptionPlan) {
          return res.status(403).json({ success: false, message: 'Tenant admins can only update name' });
      }
      if (req.user.tenantId !== tenantId) {
          return res.status(403).json({ success: false, message: 'Unauthorized to update this tenant' });
      }
  }

  try {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Dynamic Query Building
        let updateFields = [];
        let values = [];
        let paramCount = 1;

        if (name) {
            updateFields.push(`name = $${paramCount}`);
            values.push(name);
            paramCount++;
        }
        
        // Super Admin Logic
        if (role === 'super_admin') {
            if (status) { 
                updateFields.push(`status = $${paramCount}`); 
                values.push(status); 
                paramCount++; 
            }
            
            // --- FIX START: Automatic Limit Updates based on Plan ---
            if (subscriptionPlan) {
                // 1. Update the plan field
                updateFields.push(`subscription_plan = $${paramCount}`);
                values.push(subscriptionPlan);
                paramCount++;

                // 2. Automatically lookup and set Limits if plan is valid
                if (PLAN_LIMITS[subscriptionPlan]) {
                    const { maxUsers, maxProjects } = PLAN_LIMITS[subscriptionPlan];
                    
                    updateFields.push(`max_users = $${paramCount}`);
                    values.push(maxUsers);
                    paramCount++;

                    updateFields.push(`max_projects = $${paramCount}`);
                    values.push(maxProjects);
                    paramCount++;
                }
            }
            // --- FIX END ---
        }

        if (updateFields.length === 0) {
             await client.query('ROLLBACK');
             return res.status(400).json({ success: false, message: 'No fields provided for update' });
        }

        updateFields.push(`updated_at = NOW()`);

        // Final Query
        const query = `
            UPDATE tenants 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramCount}
            RETURNING id, name, subscription_plan, max_users, max_projects, updated_at
        `;
        values.push(tenantId);

        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Tenant not found' });
        }

        // Audit Logging
        const logQuery = `
            INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id)
            VALUES (gen_random_uuid(), $1, $2, 'UPDATE_TENANT', 'tenant', $3)
        `;
        await client.query(logQuery, [tenantId, req.user.userId, tenantId]);

        await client.query('COMMIT');

        res.status(200).json({
            success: true,
            message: "Tenant updated successfully",
            data: result.rows[0]
        });

    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 7: List All Tenants
exports.listTenants = async (req, res) => {
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({ success: false, message: 'Not authorized. Super Admin only.' });
    }

    const { page = 1, limit = 10, status, subscriptionPlan } = req.query;
    const offset = (page - 1) * limit;

    try {
        let whereClause = 'WHERE 1=1';
        let values = [];
        let paramCount = 1;

        if (status) {
            whereClause += ` AND status = $${paramCount}`;
            values.push(status);
            paramCount++;
        }
        if (subscriptionPlan) {
            whereClause += ` AND subscription_plan = $${paramCount}`;
            values.push(subscriptionPlan);
            paramCount++;
        }

        const query = `
            SELECT t.id, t.name, t.subdomain, t.status, t.subscription_plan as "subscriptionPlan", 
            t.max_users as "maxUsers", t.max_projects as "maxProjects", t.created_at as "createdAt",
            (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as "totalUsers",
            (SELECT COUNT(*) FROM projects p WHERE p.tenant_id = t.id) as "totalProjects"
            FROM tenants t
            ${whereClause}
            ORDER BY t.created_at DESC
            LIMIT $${paramCount} OFFSET $${paramCount + 1}
        `;
        
        const countQuery = `SELECT COUNT(*) FROM tenants ${whereClause}`;

        const listValues = [...values, limit, offset];
        const tenantsRes = await pool.query(query, listValues);
        const totalRes = await pool.query(countQuery, values);

        const totalTenants = parseInt(totalRes.rows[0].count);
        const totalPages = Math.ceil(totalTenants / limit);

        res.status(200).json({
            success: true,
            data: {
                tenants: tenantsRes.rows.map(t => ({
                    ...t,
                    totalUsers: parseInt(t.totalUsers),
                    totalProjects: parseInt(t.totalProjects)
                })),
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: totalPages,
                    totalTenants: totalTenants,
                    limit: parseInt(limit)
                }
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};