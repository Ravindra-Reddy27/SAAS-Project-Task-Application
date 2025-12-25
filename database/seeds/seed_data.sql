-- ================================
-- Seed Data for Multi-Tenant SaaS
-- ================================

-- 1. TENANT
INSERT INTO tenants (
    id, name, subdomain, status, subscription_plan, max_users, max_projects
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Demo Company',
    'demo',
    'active',
    'pro',
    25,
    15
);

-- 2. SUPER ADMIN (tenant_id = NULL)
INSERT INTO users (
    id, tenant_id, email, password_hash, full_name, role
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    NULL,
    'superadmin@system.com',
    '$2b$10$m2ZU1.KZ1P06DnR5f4qQw.fY72tOAeCw3E9y.d.uWvigffoHitX9m', -- Admin@123
    'System Administrator',
    'super_admin'
);

-- 3. TENANT ADMIN
INSERT INTO users (
    id, tenant_id, email, password_hash, full_name, role
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'admin@demo.com',
    '$2b$10$V6gIQ85pJMT8bRwMu9MFxe10v/dUJAGNr2MGfKtve1O/GIdVQ9Y8y', -- Demo@123
    'Demo Admin',
    'tenant_admin'
);

-- 4. REGULAR USERS (2 Users)
INSERT INTO users (
    id, tenant_id, email, password_hash, full_name, role
) VALUES
(
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'user1@demo.com',
    '$2b$10$DerenKawvQayoFNxLkiZl.xVvaJ4TCfxC2plDFTn2xSNXbh9Eandq', -- User@123
    'User One',
    'user'
),
(
    '55555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'user2@demo.com',
    '$2b$10$DerenKawvQayoFNxLkiZl.xVvaJ4TCfxC2plDFTn2xSNXbh9Eandq', -- User@123
    'User Two',
    'user'
);

-- 5. PROJECTS (2 Projects)
INSERT INTO projects (
    id, tenant_id, name, description, status, created_by
) VALUES
(
    '66666666-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111111',
    'Project Alpha',
    'First demo project',
    'active',
    '33333333-3333-3333-3333-333333333333'
),
(
    '77777777-7777-7777-7777-777777777777',
    '11111111-1111-1111-1111-111111111111',
    'Project Beta',
    'Second demo project',
    'active',
    '33333333-3333-3333-3333-333333333333'
);

-- 6. TASKS (5 Tasks total, distributed across projects)
INSERT INTO tasks (
    id, project_id, tenant_id, title, status, priority, assigned_to
) VALUES
-- Task 1 (Project Alpha)
(
    '88888888-8888-8888-8888-888888888888',
    '66666666-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111111',
    'Initial Task Alpha',
    'todo',
    'high',
    '44444444-4444-4444-4444-444444444444'
),
-- Task 2 (Project Beta)
(
    '99999999-9999-9999-9999-999999999999',
    '77777777-7777-7777-7777-777777777777',
    '11111111-1111-1111-1111-111111111111',
    'Initial Task Beta',
    'todo',
    'medium',
    '55555555-5555-5555-5555-555555555555'
),
-- Task 3 (Project Alpha) - ADDED
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '66666666-6666-6666-6666-666666666666',
    '11111111-1111-1111-1111-111111111111',
    'Design Database Schema',
    'in_progress',
    'high',
    '33333333-3333-3333-3333-333333333333'
),
-- Task 4 (Project Beta) - ADDED
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '77777777-7777-7777-7777-777777777777',
    '11111111-1111-1111-1111-111111111111',
    'Setup Docker Container',
    'completed',
    'medium',
    '44444444-4444-4444-4444-444444444444'
),
-- Task 5 (Project Beta) - ADDED
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '77777777-7777-7777-7777-777777777777',
    '11111111-1111-1111-1111-111111111111',
    'API Documentation',
    'todo',
    'low',
    '55555555-5555-5555-5555-555555555555'
);