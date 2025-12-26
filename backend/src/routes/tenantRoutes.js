const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes here require authentication
router.use(authMiddleware);

// API 7: List All Tenants (Super Admin)
router.get('/', tenantController.listTenants);

// API 5: Get Tenant Details
router.get('/:tenantId', tenantController.getTenantDetails);

// API 6: Update Tenant
router.put('/:tenantId', tenantController.updateTenant);

module.exports = router;