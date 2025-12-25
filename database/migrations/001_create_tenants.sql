-- ================================
-- Migration: Create tenants table (CORRECTED)
-- ================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'suspended', 'trial')),
    
    -- Default to 'free' plan if not specified [cite: 51]
    subscription_plan VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (subscription_plan IN ('free', 'pro', 'enterprise')),
    
    -- Default limits match the 'free' plan requirements (5 users, 3 projects) 
    max_users INTEGER NOT NULL DEFAULT 5,
    max_projects INTEGER NOT NULL DEFAULT 3,
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster tenant lookups via subdomain (Required for login) [cite: 19]
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);