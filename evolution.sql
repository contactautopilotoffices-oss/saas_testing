-- =========================================================
-- AUTOPILOT | SCHEMA EVOLUTION (MODE B)
-- SAFE • ADDITIVE • SUPABASE-READY
-- Designed for safe re-runs without breaking data.
-- =========================================================

-- ---------------------------------------------------------
-- 1. IDENTIFIER ALIGNMENT (slug -> code)
-- ---------------------------------------------------------
DO $$
BEGIN
  -- If 'slug' exists in 'organizations' but 'code' does not, rename it
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'slug') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'code') THEN
    ALTER TABLE organizations RENAME COLUMN slug TO code;
  END IF;
END $$;

-- ---------------------------------------------------------
-- 2. ENUMS (Guarded DO blocks)
-- ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('master_admin', 'org_super_admin', 'property_admin', 'staff', 'tenant');
  END IF;
END $$;

-- ---------------------------------------------------------
-- 3. COLUMN ADDITIONS (ADD COLUMN IF NOT EXISTS)
-- ---------------------------------------------------------

-- Organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS deletion_secret text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS available_modules text[] DEFAULT ARRAY['ticketing','viewer','analytics'];
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Memberships
ALTER TABLE organization_memberships ADD COLUMN IF NOT EXISTS role app_role;
ALTER TABLE organization_memberships ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE property_memberships ADD COLUMN IF NOT EXISTS role app_role;
ALTER TABLE property_memberships ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Activities
ALTER TABLE property_activities ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
ALTER TABLE property_activities ADD COLUMN IF NOT EXISTS type text;
ALTER TABLE property_activities ADD COLUMN IF NOT EXISTS status text DEFAULT 'open';

-- ---------------------------------------------------------
-- 4. SECURITY (RLS & Policies)
-- ---------------------------------------------------------
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_activities ENABLE ROW LEVEL SECURITY;

-- Organization Policies
DROP POLICY IF EXISTS org_read_policy ON organizations;
CREATE POLICY org_read_policy ON organizations FOR SELECT USING (
  EXISTS(SELECT 1 FROM organization_memberships om WHERE om.user_id = auth.uid() AND om.organization_id = organizations.id)
  OR EXISTS(SELECT 1 FROM organization_memberships om WHERE om.user_id = auth.uid() AND om.role = 'master_admin')
  OR (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('masterooshi@gmail.com', 'ranganathanlohitaksha@gmail.com')
);

DROP POLICY IF EXISTS master_admin_org_all ON organizations;
CREATE POLICY master_admin_org_all ON organizations FOR ALL USING (
  EXISTS(SELECT 1 FROM organization_memberships om WHERE om.user_id = auth.uid() AND om.role = 'master_admin')
  OR (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('masterooshi@gmail.com', 'ranganathanlohitaksha@gmail.com')
);

-- Property Policies
DROP POLICY IF EXISTS prop_read_policy ON properties;
CREATE POLICY prop_read_policy ON properties FOR SELECT USING (
  EXISTS(SELECT 1 FROM property_memberships pm WHERE pm.user_id = auth.uid() AND pm.property_id = properties.id)
  OR EXISTS(SELECT 1 FROM organization_memberships om WHERE om.user_id = auth.uid() AND om.organization_id = properties.organization_id AND om.role IN ('org_super_admin', 'master_admin'))
  OR (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('masterooshi@gmail.com', 'ranganathanlohitaksha@gmail.com')
);

DROP POLICY IF EXISTS master_admin_prop_all ON properties;
CREATE POLICY master_admin_prop_all ON properties FOR ALL USING (
  EXISTS(SELECT 1 FROM organization_memberships om WHERE om.user_id = auth.uid() AND om.role = 'master_admin')
  OR (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('masterooshi@gmail.com', 'ranganathanlohitaksha@gmail.com')
);

-- Activity Policies
DROP POLICY IF EXISTS strict_property_policy ON property_activities;
CREATE POLICY strict_property_policy ON property_activities FOR ALL USING (
  EXISTS(SELECT 1 FROM property_memberships pm WHERE pm.user_id = auth.uid() AND pm.property_id = property_activities.property_id AND pm.is_active)
);

DROP POLICY IF EXISTS org_super_policy ON property_activities;
CREATE POLICY org_super_policy ON property_activities FOR ALL USING (
  EXISTS(SELECT 1 FROM organization_memberships om WHERE om.user_id = auth.uid() AND om.organization_id = property_activities.organization_id AND om.role = 'org_super_admin')
);

DROP POLICY IF EXISTS master_admin_policy ON property_activities;
CREATE POLICY master_admin_policy ON property_activities FOR ALL USING (
  EXISTS(SELECT 1 FROM organization_memberships om WHERE om.user_id = auth.uid() AND om.role = 'master_admin')
  OR (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('masterooshi@gmail.com', 'ranganathanlohitaksha@gmail.com')
);

-- ---------------------------------------------------------
-- 5. PERFORMANCE (Indexes)
-- ---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_prop_members_user_prop ON property_memberships(user_id, property_id);
CREATE INDEX IF NOT EXISTS idx_prop_activity_scope ON property_activities(organization_id, property_id);
CREATE INDEX IF NOT EXISTS idx_org_code_evolve ON organizations(code);

-- ---------------------------------------------------------
-- 6. CACHE REFRESH
-- ---------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- =========================================================
-- END OF FILE — SAFE TO RE-RUN
-- =========================================================
