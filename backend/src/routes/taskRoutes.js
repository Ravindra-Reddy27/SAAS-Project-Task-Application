const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// API 18: Update Status
router.patch('/:taskId/status', taskController.updateTaskStatus);

// API 19: Full Update
router.put('/:taskId', taskController.updateTask);

// API 20: Delete Task (This is required for the controller to work)
router.delete('/:taskId', taskController.deleteTask);

module.exports = router;