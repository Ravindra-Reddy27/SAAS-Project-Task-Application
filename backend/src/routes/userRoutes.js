const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// GET /api/users/me is usually handled in authRoutes, but we handle updates/deletes here
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;