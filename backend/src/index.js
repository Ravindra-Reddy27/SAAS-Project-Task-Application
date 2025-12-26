const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));

// --- IMPORT ROUTE FILES ---
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');

// --- IMPORT CONTROLLERS & MIDDLEWARE (For Nested Routes) ---
const userController = require('./controllers/userController');
const taskController = require('./controllers/taskController');
const authMiddleware = require('./middleware/authMiddleware');

// --- REGISTER STANDARD ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

// --- REGISTER NESTED ROUTES ---

// 1. Tenant Users (API 8 & 9): /api/tenants/:tenantId/users
const tenantUserRouter = express.Router({ mergeParams: true });
tenantUserRouter.use(authMiddleware);
tenantUserRouter.post('/', userController.addUser);
tenantUserRouter.get('/', userController.listUsers);
app.use('/api/tenants/:tenantId/users', tenantUserRouter);

// 2. Project Tasks (API 16 & 17): /api/projects/:projectId/tasks
const projectTaskRouter = express.Router({ mergeParams: true });
projectTaskRouter.use(authMiddleware);
projectTaskRouter.post('/', taskController.createTask);
projectTaskRouter.get('/', taskController.listProjectTasks);
app.use('/api/projects/:projectId/tasks', projectTaskRouter);

// --- HEALTH CHECK ---
app.get('/api/health', async (req, res) => {
  const db = require('./config/db');
  try {
    await db.pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});