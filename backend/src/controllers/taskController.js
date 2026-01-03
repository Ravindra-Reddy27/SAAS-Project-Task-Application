const { pool } = require('../config/db');

// Helper: Check valid UUID
const isValidUUID = (uuid) => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuid && regex.test(uuid);
};

// Helper: Map DB Row to API Response Format (CamelCase)
const mapTaskToResponse = (row) => ({
  id: row.id,
  projectId: row.project_id,
  tenantId: row.tenant_id,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  dueDate: row.due_date, // pg driver usually converts this to Date object or string
  assignedTo: row.assignee_id ? {
    id: row.assignee_id,
    fullName: row.assignee_name,
    email: row.assignee_email
  } : (row.assigned_to || null), // Fallback if not joined
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

// API 16: Create Task
exports.createTask = async (req, res) => {
  const { projectId } = req.params;
  const { title, description, assignedTo, priority, dueDate } = req.body;
  const { tenantId, userId } = req.user;

  if (!isValidUUID(projectId)) return res.status(404).json({ success: false, message: 'Project not found (Invalid ID)' });

  try {
    const projectCheck = await pool.query('SELECT id, tenant_id FROM projects WHERE id = $1', [projectId]);
    if (projectCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Project not found' });
    
    const project = projectCheck.rows[0];
    if (project.tenant_id !== tenantId && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Security Check: Ensure assigned user belongs to same tenant
    let validatedAssignedTo = null;
    if (assignedTo) {
      if (!isValidUUID(assignedTo)) return res.status(400).json({ success: false, message: 'Invalid User ID format' });
      
      const userCheck = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [assignedTo]);
      if (userCheck.rows.length === 0 || userCheck.rows[0].tenant_id !== project.tenant_id) {
        return res.status(400).json({ success: false, message: 'Assigned user invalid or not in tenant' });
      }
      validatedAssignedTo = assignedTo;
    }

    const query = `
      INSERT INTO tasks (id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'todo', $5, $6, $7)
      RETURNING id, project_id, tenant_id, title, description, status, priority, assigned_to, due_date, created_at
    `;

    const result = await pool.query(query, [
      projectId, 
      project.tenant_id, 
      title, 
      description, 
      priority || 'medium', 
      validatedAssignedTo, 
      dueDate || null
    ]);

    const newTask = result.rows[0];

    // Audit Log
    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) 
       VALUES (gen_random_uuid(), $1, $2, 'CREATE_TASK', 'task', $3)`,
      [project.tenant_id, userId, newTask.id]
    );

    // Map response to CamelCase
    res.status(201).json({ 
      success: true, 
      data: {
        id: newTask.id,
        projectId: newTask.project_id,
        tenantId: newTask.tenant_id,
        title: newTask.title,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority,
        assignedTo: newTask.assigned_to, // Requirement asks for UUID here
        dueDate: newTask.due_date,
        createdAt: newTask.created_at
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 17: List Tasks (With Pagination & Sorting)
exports.listProjectTasks = async (req, res) => {
  const { projectId } = req.params;
  const { status, assignedTo, priority, search, page = 1, limit = 50 } = req.query;
  const { tenantId } = req.user;
  const offset = (page - 1) * limit;

  if (!isValidUUID(projectId)) return res.status(404).json({ success: false, message: 'Project not found' });

  try {
    const projectCheck = await pool.query('SELECT tenant_id FROM projects WHERE id = $1', [projectId]);
    if (projectCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Project not found' });
    
    if (projectCheck.rows[0].tenant_id !== tenantId && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    let whereClause = 'WHERE t.project_id = $1';
    let values = [projectId];
    let idx = 2;

    if (status) { whereClause += ` AND t.status = $${idx++}`; values.push(status); }
    if (assignedTo) { whereClause += ` AND t.assigned_to = $${idx++}`; values.push(assignedTo); }
    if (priority) { whereClause += ` AND t.priority = $${idx++}`; values.push(priority); }
    if (search) { whereClause += ` AND t.title ILIKE $${idx++}`; values.push(`%${search}%`); }

    // Logic: Sort by Priority (High > Medium > Low) then Due Date ASC
    // We use a CASE statement for custom priority sorting
    const query = `
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at,
             u.id as assignee_id, u.full_name as assignee_name, u.email as assignee_email
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      ${whereClause}
      ORDER BY 
        CASE t.priority 
          WHEN 'high' THEN 1 
          WHEN 'medium' THEN 2 
          WHEN 'low' THEN 3 
          ELSE 4 
        END ASC,
        t.due_date ASC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;

    const countQuery = `SELECT COUNT(*) FROM tasks t ${whereClause}`;

    const [tasksRes, countRes] = await Promise.all([
      pool.query(query, [...values, limit, offset]),
      pool.query(countQuery, values)
    ]);
    
    const tasks = tasksRes.rows.map(mapTaskToResponse);
    const total = parseInt(countRes.rows[0].count);

    res.status(200).json({ 
      success: true, 
      data: { 
        tasks,
        total,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          limit: parseInt(limit)
        }
      } 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 18: Update Status
exports.updateTaskStatus = async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;

  if (!isValidUUID(taskId)) return res.status(404).json({ success: false, message: 'Task not found' });

  try {
    const result = await pool.query(
      'UPDATE tasks SET status = $1 WHERE id = $2 RETURNING id, status, updated_at', 
      [status, taskId]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found' });
    
    res.status(200).json({ 
      success: true, 
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        updatedAt: result.rows[0].updated_at || new Date().toISOString()
      } 
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 19: Full Update
exports.updateTask = async (req, res) => {
  const { taskId } = req.params;
  const { title, description, status, priority, dueDate, assignedTo } = req.body;
  const requester = req.user;

  if (!isValidUUID(taskId)) return res.status(404).json({ success: false, message: 'Task not found' });

  try {
    // 1. Get current task
    const currentTask = await pool.query('SELECT tenant_id FROM tasks WHERE id = $1', [taskId]);
    if (currentTask.rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found' });
    
    if (requester.tenantId !== currentTask.rows[0].tenant_id && requester.role !== 'super_admin') {
       return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // 2. Validate Assignment
    if (assignedTo && assignedTo !== '') {
      if (!isValidUUID(assignedTo)) return res.status(400).json({ success: false, message: 'Invalid User ID format' });

      const userCheck = await pool.query('SELECT tenant_id FROM users WHERE id = $1', [assignedTo]);
      
      if (userCheck.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'Assigned user does not exist' });
      }
      
      if (userCheck.rows[0].tenant_id !== currentTask.rows[0].tenant_id) {
        return res.status(400).json({ success: false, message: 'Cannot assign task to user from different tenant' });
      }
    }

    let fields = [];
    let values = [];
    let idx = 1;
    const addField = (col, val) => { fields.push(`${col} = $${idx++}`); values.push(val); };

    if (title) addField('title', title);
    if (description) addField('description', description);
    if (status) addField('status', status);
    if (priority) addField('priority', priority);
    if (dueDate !== undefined) addField('due_date', dueDate === '' ? null : dueDate);
    if (assignedTo !== undefined) addField('assigned_to', assignedTo === '' ? null : assignedTo);

    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields provided' });

    values.push(taskId);
    
    // Perform Update
    const query = `UPDATE tasks SET ${fields.join(', ')} WHERE id = $${idx}`;
    await pool.query(query, values);

    // 3. Fetch Updated Task with Joined User Info (Required for Response)
    const fetchQuery = `
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at, t.updated_at,
             u.id as assignee_id, u.full_name as assignee_name, u.email as assignee_email
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = $1
    `;
    const updatedTaskRes = await pool.query(fetchQuery, [taskId]);
    
    // 4. Audit Log
    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) 
       VALUES (gen_random_uuid(), $1, $2, 'UPDATE_TASK', 'task', $3)`,
      [currentTask.rows[0].tenant_id, requester.userId, taskId]
    );

    res.status(200).json({ 
      success: true, 
      message: "Task updated successfully",
      data: mapTaskToResponse(updatedTaskRes.rows[0])
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 20: Delete Task
exports.deleteTask = async (req, res) => {
  const { taskId } = req.params;
  const requester = req.user;

  if (!isValidUUID(taskId)) return res.status(404).json({ success: false, message: 'Task not found' });

  try {
    const taskCheck = await pool.query('SELECT tenant_id FROM tasks WHERE id = $1', [taskId]);
    if (taskCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Task not found' });

    if (requester.tenantId !== taskCheck.rows[0].tenant_id && requester.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await pool.query(
      `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id) 
       VALUES (gen_random_uuid(), $1, $2, 'DELETE_TASK', 'task', $3)`,
      [taskCheck.rows[0].tenant_id, requester.userId, taskId]
    );

    await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    res.status(200).json({ success: true, message: 'Task deleted successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};