const { pool } = require('../config/db');

// API 12: Create Project
exports.createProject = async (req, res) => {
  const { name, description, status } = req.body;
  const { tenantId, userId } = req.user;

  try {
    // 1. Check Subscription Limits
    const tenantRes = await pool.query('SELECT max_projects FROM tenants WHERE id = $1', [tenantId]);
    const countRes = await pool.query('SELECT COUNT(*) FROM projects WHERE tenant_id = $1', [tenantId]);
    
    if (parseInt(countRes.rows[0].count) >= tenantRes.rows[0].max_projects) {
      return res.status(403).json({ success: false, message: 'Project limit reached' });
    }

    // 2. Create Project
    const query = `
      INSERT INTO projects (id, tenant_id, name, description, status, created_by)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
      RETURNING id, tenant_id as "tenantId", name, description, status, created_by as "createdBy", created_at as "createdAt"
    `;
    const result = await pool.query(query, [tenantId, name, description, status || 'active', userId]);

    // Audit Log
    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) VALUES (gen_random_uuid(), $1, $2, 'CREATE_PROJECT', 'project', $3)`,
      [tenantId, userId, result.rows[0].id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 13: List Projects
exports.listProjects = async (req, res) => {
  const { tenantId } = req.user;
  const { status, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let whereClause = 'WHERE p.tenant_id = $1';
    let values = [tenantId];
    let idx = 2;

    if (status) { whereClause += ` AND p.status = $${idx++}`; values.push(status); }
    if (search) { whereClause += ` AND p.name ILIKE $${idx++}`; values.push(`%${search}%`); }

    // Join with Users for creator name, Subquery for task counts
    const query = `
      SELECT p.id, p.name, p.description, p.status, p.created_at as "createdAt",
             u.id as "creatorId", u.full_name as "creatorName",
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as "taskCount",
             (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') as "completedTaskCount"
      FROM projects p
      LEFT JOIN users u ON p.created_by = u.id
      ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const countQuery = `SELECT COUNT(*) FROM projects p ${whereClause}`;
    
    const listValues = [...values, limit, offset];
    const projectsRes = await pool.query(query, listValues);
    const countRes = await pool.query(countQuery, values);

    // Format response to match spec structure
    const projects = projectsRes.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      status: row.status,
      createdAt: row.createdAt,
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

    // Auth: Tenant Admin OR Creator
    if (requester.tenantId !== project.tenant_id && requester.role !== 'super_admin') return res.status(404).json({ success: false, message: 'Project not found' });
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
    if (requester.tenantId !== project.tenant_id && requester.role !== 'super_admin') return res.status(404).json({ success: false, message: 'Project not found' });
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