const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// API 10 & 11 (General User Operations)
router.put('/:userId', userController.updateUser);
router.delete('/:userId', userController.deleteUser);

// Note: API 8 & 9 are mounted in index.js under /api/tenants/:tenantId/users
module.exports = router;