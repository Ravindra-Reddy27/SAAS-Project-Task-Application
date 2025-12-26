const { pool } = require('../config/db');

// API 16: Create Task
exports.createTask = async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assignedTo, priority, dueDate } = req.body;
  const { tenantId, userId } = req.user;

  try {
    // 1. Verify Project exists and belongs to user's tenant
    // Spec Requirement: "Get tenantId from project (not from JWT)" - though we must verify it matches user's access
    const projectCheck = await pool.query('SELECT id, tenant_id FROM projects WHERE id = $1', [projectId]);
    
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const project = projectCheck.rows[0];

    // Security Check: Does project belong to the requester's tenant?
    if (project.tenant_id !== tenantId && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Project does not belong to your tenant' });
    }

    // 2. Validate Assigned User (if provided)
    if (assignedTo) {
      const userCheck = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [assignedTo]);
      if (userCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Assigned user does not exist' });
      }
      if (userCheck.rows[0].tenant_id !== project.tenant_id) {
        return res.status(400).json({ success: false, message: 'Assigned user does not belong to the same tenant' });
      }
    }

    // 3. Create Task
    const query = `
      INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'todo', $5, $6, $7)
      RETURNING id, project_id as "projectId", tenant_id as "tenantId", title, description, status, priority, assigned_to as "assignedTo", due_date as "dueDate", created_at as "createdAt"
    `;

    const result = await pool.query(query, [
      projectId,
      project.tenant_id,
      title,
      description,
      priority || 'medium',
      assignedTo || null,
      dueDate || null
    ]);

    // Audit Log (Optional but good practice)
    // await pool.query(...) 

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 17: List Project Tasks
exports.listProjectTasks = async (req, res) => {
  const { projectId } = req.params;
  const { status, assignedTo, priority, search, page = 1, limit = 50 } = req.query;
  const { tenantId } = req.user;
  const offset = (page - 1) * limit;

  try {
    // 1. Verify Project Access
    const projectCheck = await pool.query('SELECT tenant_id FROM projects WHERE id = $1', [projectId]);
    if (projectCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Project not found' });
    if (projectCheck.rows[0].tenant_id !== tenantId && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // 2. Build Query
    let whereClause = 'WHERE t.project_id = $1';
    let values = [projectId];
    let idx = 2;

    if (status) { whereClause += ` AND t.status = $${idx++}`; values.push(status); }
    if (assignedTo) { whereClause += ` AND t.assigned_to = $${idx++}`; values.push(assignedTo); }
    if (priority) { whereClause += ` AND t.priority = $${idx++}`; values.push(priority); }
    if (search) { whereClause += ` AND t.title ILIKE $${idx++}`; values.push(`%${search}%`); }

    // Sorting: Priority (High->Med->Low) then DueDate ASC
    // We use a CASE statement to map enum strings to sortable integers
    const orderBy = `
      ORDER BY 
      CASE t.priority 
        WHEN 'high' THEN 1 
        WHEN 'medium' THEN 2 
        WHEN 'low' THEN 3 
        ELSE 4 
      END ASC, 
      t.due_date ASC
    `;

    const query = `
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date as "dueDate", t.created_at as "createdAt",
             u.id as "assigneeId", u.full_name as "assigneeName", u.email as "assigneeEmail"
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      ${whereClause}
      ${orderBy}
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const countQuery = `SELECT COUNT(*) FROM tasks t ${whereClause}`;

    const listValues = [...values, limit, offset];
    const tasksRes = await pool.query(query, listValues);
    const countRes = await pool.query(countQuery, values);

    // Format Data
    const tasks = tasksRes.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      dueDate: row.dueDate,
      createdAt: row.createdAt,
      assignedTo: row.assigneeId ? {
        id: row.assigneeId,
        fullName: row.assigneeName,
        email: row.assigneeEmail
      } : null
    }));

    res.status(200).json({
      success: true,
      data: {
        tasks,
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

// API 18: Update Task Status
exports.updateTaskStatus = async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;
  const { tenantId } = req.user;

  if (!status || !['todo', 'in_progress', 'completed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    const checkRes = await pool.query('SELECT tenant_id FROM tasks WHERE id = $1', [taskId]);
    if (checkRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found' });
    
    if (checkRes.rows[0].tenant_id !== tenantId && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const result = await pool.query(
      'UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, status, updated_at as "updatedAt"',
      [status, taskId]
    );

    res.status(200).json({ success: true, data: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 19: Update Task (Full)
exports.updateTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, description, status, priority, assignedTo, dueDate } = req.body;
  const { tenantId, userId } = req.user;

  try {
    const checkRes = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
    if (checkRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found' });
    const task = checkRes.rows[0];

    // Auth
    if (task.tenant_id !== tenantId && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Validate Assigned User if changing
    if (assignedTo) {
       const userCheck = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [assignedTo]);
       if (userCheck.rows.length === 0 || userCheck.rows[0].tenant_id !== task.tenant_id) {
          return res.status(400).json({ success: false, message: 'Assigned user invalid or different tenant' });
       }
    }

    // Build Query
    let fields = [];
    let values = [];
    let idx = 1;

    if (title) { fields.push(`title = $${idx++}`); values.push(title); }
    if (description) { fields.push(`description = $${idx++}`); values.push(description); }
    if (status) { fields.push(`status = $${idx++}`); values.push(status); }
    if (priority) { fields.push(`priority = $${idx++}`); values.push(priority); }
    if (assignedTo !== undefined) { fields.push(`assigned_to = $${idx++}`); values.push(assignedTo); } // Allow null
    if (dueDate !== undefined) { fields.push(`due_date = $${idx++}`); values.push(dueDate); } // Allow null

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields' });

    fields.push(`updated_at = NOW()`);
    values.push(taskId);

    const query = `
      UPDATE tasks SET ${fields.join(', ')} 
      WHERE id = $${idx} 
      RETURNING id, title, description, status, priority, assigned_to, due_date, updated_at as "updatedAt"
    `;

    const result = await pool.query(query, values);

    // Audit Log
    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) VALUES (gen_random_uuid(), $1, $2, 'UPDATE_TASK', 'task', $3)`,
      [task.tenant_id, userId, taskId]
    );

    // Fetch assignee details for response
    const updatedTask = result.rows[0];
    let assigneeDetails = null;
    
    if (updatedTask.assigned_to) {
        const uRes = await pool.query('SELECT id, full_name as "fullName", email FROM users WHERE id = $1', [updatedTask.assigned_to]);
        assigneeDetails = uRes.rows[0];
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: {
        ...updatedTask,
        assignedTo: assigneeDetails
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};