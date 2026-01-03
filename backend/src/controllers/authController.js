const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const generateToken = require('../utils/jwtGenerator');

// API 1: Tenant Registration
exports.registerTenant = async (req, res) => {
  const { tenantName, subdomain, adminEmail, adminPassword, adminFullName } = req.body;
  
  if (!tenantName || !subdomain || !adminEmail || !adminPassword || !adminFullName) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if subdomain exists
    const subCheck = await client.query('SELECT id FROM tenants WHERE subdomain = $1', [subdomain]);
    if (subCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Subdomain already exists' });
    }

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // 3. Create Tenant
    const tenantResult = await client.query(
      `INSERT INTO tenants (id, name, subdomain, status, subscription_plan, max_users, max_projects)
       VALUES (gen_random_uuid(), $1, $2, 'active', 'free', 5, 3)
       RETURNING id, subdomain`,
      [tenantName, subdomain]
    );
    const newTenant = tenantResult.rows[0];

    // 4. Create Admin User
    const userResult = await client.query(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'tenant_admin')
       RETURNING id, email, full_name, role`,
      [newTenant.id, adminEmail, hashedPassword, adminFullName]
    );
    const newUser = userResult.rows[0];

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Tenant registered successfully',
      data: {
        tenantId: newTenant.id,
        subdomain: newTenant.subdomain,
        adminUser: newUser
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  } finally {
    client.release();
  }
};

// API 2: User Login (FIXED: Returns Tenant Name now)
exports.login = async (req, res) => {
  const { email, password, tenantSubdomain } = req.body;

  if (!email || !password || !tenantSubdomain) {
    return res.status(400).json({ success: false, message: 'Email, password, and tenant subdomain are required' });
  }

  try {
    let user = null;
    let tenantDetails = null;

    // --- SUPER ADMIN BYPASS ---
    if (tenantSubdomain.toLowerCase() === 'system') {
      const superAdminRes = await pool.query(
        "SELECT * FROM users WHERE email = $1 AND role = 'super_admin' AND tenant_id IS NULL",
        [email]
      );
      
      if (superAdminRes.rows.length > 0) {
        user = superAdminRes.rows[0];
      }
    } else {
      // --- STANDARD TENANT LOGIN ---
      // 1. Find Tenant (FIX: Fetch 'name' as well)
      const tenantRes = await pool.query('SELECT id, name, status FROM tenants WHERE subdomain = $1', [tenantSubdomain]);
      if (tenantRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Tenant not found' });
      }
      const tenant = tenantRes.rows[0];

      if (tenant.status !== 'active') {
        return res.status(403).json({ success: false, message: 'Tenant account is not active' });
      }

      tenantDetails = { id: tenant.id, name: tenant.name }; // Capture name for response

      // 2. Find User in this specific tenant
      const tenantUserRes = await pool.query(
        'SELECT * FROM users WHERE email = $1 AND tenant_id = $2', 
        [email, tenant.id]
      );

      if (tenantUserRes.rows.length > 0) {
        user = tenantUserRes.rows[0];
      }
    }

    // If still no user found
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.is_active) {
       return res.status(403).json({ success: false, message: 'Account suspended/inactive' });
    }

    // 3. Verify Password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 4. Generate Token
    const token = generateToken(user.id, user.tenant_id, user.role);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          tenantId: user.tenant_id,
          // FIX: Return tenant object so Profile.jsx can show Organization Name immediately
          tenant: tenantDetails 
        },
        token,
        expiresIn: 86400
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 3: Get Current User
exports.getMe = async (req, res) => {
  try {
    const { userId } = req.user;

    const query = `
      SELECT u.id, u.email, u.full_name as "fullName", u.role, u.is_active as "isActive",
             t.id as "tenantId", t.name as "tenantName", t.subdomain, 
             t.subscription_plan as "subscriptionPlan", t.max_users as "maxUsers", t.max_projects as "maxProjects"
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const row = result.rows[0];

    res.status(200).json({
      success: true,
      data: {
        id: row.id,
        email: row.email,
        fullName: row.fullName,
        role: row.role,
        isActive: row.isActive,
        tenant: row.tenantId ? {
          id: row.tenantId,
          name: row.tenantName,
          subdomain: row.subdomain,
          subscriptionPlan: row.subscriptionPlan,
          maxUsers: row.maxUsers,
          maxProjects: row.maxProjects
        } : null 
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// API 4: Logout
exports.logout = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};