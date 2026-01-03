const { pool } = require('../config/db');

// API 12: Create Project
exports.createProject = async (req, res) => {
  // FIX: Accept 'targetTenantId' from body (for Super Admins)
  const { name, description, status, targetTenantId } = req.body;
  const { tenantId: userTenantId, userId, role } = req.user;

  try {
    // 1. Determine the Target Tenant
    let finalTenantId = userTenantId;

    if (role === 'super_admin') {
      // If Super Admin, they MUST specify which tenant this project belongs to
      if (!targetTenantId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Super Admins does not have Tenant ID to create a project.' 
        });
      }
      finalTenantId = targetTenantId;
    }

    // 2. Check Subscription Limits
    // We check the limit of the FINAL tenant, not the user's null tenant
    const tenantRes = await pool.query('SELECT max_projects FROM tenants WHERE id = $1', [finalTenantId]);
    
    if (tenantRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Target tenant not found' });
    }

    const countRes = await pool.query('SELECT COUNT(*) FROM projects WHERE tenant_id = $1', [finalTenantId]);
    
    if (parseInt(countRes.rows[0].count) >= tenantRes.rows[0].max_projects) {
      return res.status(403).json({ success: false, message: 'Project limit reached for this tenant' });
    }

    // 3. Create Project
    const query = `
      INSERT INTO projects (id, tenant_id, name, description, status, created_by)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      RETURNING id, tenant_id as "tenantId", name, description, status, created_by as "createdBy", created_at as "createdAt"
    `;
    const result = await pool.query(query, [finalTenantId, name, description, status || 'active', userId]);

    // Audit Log
    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) VALUES (gen_random_uuid(), $1, $2, 'CREATE_PROJECT', 'project', $3)`,
      [finalTenantId, userId, result.rows[0].id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 13: List Projects (FIXED FOR SUPER ADMIN)
exports.listProjects = async (req, res) => {
  const { tenantId, role } = req.user;
  const { status, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let whereClause = '';
    let values = [];
    let idx = 1;

    // Super Admin sees ALL, Tenant Admin sees OWN
    if (role === 'super_admin') {
      whereClause = 'WHERE 1=1'; 
    } else {
      whereClause = `WHERE p.tenant_id = $${idx++}`;
      values.push(tenantId);
    }

    if (status) { whereClause += ` AND p.status = $${idx++}`; values.push(status); }
    if (search) { whereClause += ` AND p.name ILIKE $${idx++}`; values.push(`%${search}%`); }

    // Join with Users for creator name, Subquery for task counts
    const query = `
      SELECT p.id, p.name, p.description, p.status, p.created_at as "createdAt",
             u.id as "creatorId", u.full_name as "creatorName",
             t.name as "tenantName",  -- Added Tenant Name for Super Admin visibility
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as "taskCount",
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') as "completedTaskCount"
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      LEFT JOIN tenants t ON p.tenant_id = t.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const countQuery = `SELECT COUNT(*) FROM projects p ${whereClause}`;
    
    const listValues = [...values, limit, offset];
    const projectsRes = await pool.query(query, listValues);
    const countRes = await pool.query(countQuery, values);

    // Format response
    const projects = projectsRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: row.createdAt,
      tenantName: row.tenantName, // Helpful for Super Admin
      createdBy: { id: row.creatorId, fullName: row.creatorName },
      taskCount: parseInt(row.taskCount),
      completedTaskCount: parseInt(row.completedTaskCount)
    }));

    res.status(200).json({
      success: true,
      data: {
        projects,
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

// API 14: Update Project
exports.updateProject = async (req, res) => {
  const { projectId } = req.params;
  const { name, description, status } = req.body;
  const requester = req.user;

  try {
    const checkRes = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (checkRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Project not found' });
    const project = checkRes.rows[0];

    // Auth: Tenant Admin OR Creator OR Super Admin
    if (requester.role !== 'super_admin' && requester.tenantId !== project.tenant_id) {
       return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    const isCreator = requester.userId === project.created_by;
    const isAdmin = requester.role === 'tenant_admin' || requester.role === 'super_admin';
    
    if (!isCreator && !isAdmin) return res.status(403).json({ success: false, message: 'Unauthorized' });

    let fields = [];
    let values = [];
    let idx = 1;

    if (name) { fields.push(`name = $${idx++}`); values.push(name); }
    if (description) { fields.push(`description = $${idx++}`); values.push(description); }
    if (status) { fields.push(`status = $${idx++}`); values.push(status); }
    
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields' });

    fields.push(`updated_at = NOW()`);
    values.push(projectId);

    const query = `UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, name, description, status, updated_at as "updatedAt"`;
    const result = await pool.query(query, values);

    // Audit Log
    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) VALUES (gen_random_uuid(), $1, $2, 'UPDATE_PROJECT', 'project', $3)`,
      [project.tenant_id, requester.userId, projectId]
    );

    res.status(200).json({ success: true, message: 'Project updated successfully', data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 15: Delete Project
exports.deleteProject = async (req, res) => {
  const { projectId } = req.params;
  const requester = req.user;

  try {
    const checkRes = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (checkRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Project not found' });
    const project = checkRes.rows[0];

    // Auth
    if (requester.role !== 'super_admin' && requester.tenantId !== project.tenant_id) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const isCreator = requester.userId === project.created_by;
    const isAdmin = requester.role === 'tenant_admin' || requester.role === 'super_admin';
    if (!isCreator && !isAdmin) return res.status(403).json({ success: false, message: 'Unauthorized' });

    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);

    // Audit Log
    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) VALUES (gen_random_uuid(), $1, $2, 'DELETE_PROJECT', 'project', $3)`,
      [project.tenant_id, requester.userId, projectId]
    );

    res.status(200).json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// API: Get Single Project Details
exports.getProjectById = async (req, res) => {
  const { projectId } = req.params;
  const { tenantId, role } = req.user;

  try {
    const query = `
      SELECT p.id, p.tenant_id, p.name, p.description, p.status, p.created_at as "createdAt",
             u.id as "creatorId", u.full_name as "creatorName"
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [projectId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = result.rows[0];

    // Security Check
    if (role !== 'super_admin' && project.tenant_id !== tenantId) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Format for frontend
    const responseData = {
        ...project,
        createdBy: { id: project.creatorId, fullName: project.creatorName }
    };
    
    res.status(200).json({ success: true, data: responseData });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};