-- ============================================
-- Zoho PO Module — Database Migrations
-- Run this to set up all tables for the PO creation module
-- ============================================

-- 1. Audit Log Table
CREATE TABLE IF NOT EXISTS zoho_po_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    property_id UUID REFERENCES properties(id),
    created_by UUID NOT NULL REFERENCES auth.users(id),

    -- Input
    invoice_filename TEXT NOT NULL,
    invoice_file_url TEXT,
    parsed_invoice_data JSONB,
    user_context JSONB,
    ai_model_used TEXT NOT NULL,

    -- Processing
    vendor_id TEXT,
    vendor_name TEXT,
    is_new_vendor BOOLEAN DEFAULT false,

    -- Output
    po_id TEXT,
    po_number TEXT,
    po_amount DECIMAL(12,2),
    po_status TEXT DEFAULT 'pending',
    zoho_response JSONB,

    -- Metrics
    processing_time_ms INTEGER,
    extraction_confidence DECIMAL(3,2),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,

    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_zoho_po_audit_org ON zoho_po_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_zoho_po_audit_created ON zoho_po_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_zoho_po_audit_status ON zoho_po_audit_log(po_status);

-- 2. Vendor Cache Table
CREATE TABLE IF NOT EXISTS zoho_po_vendor_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Zoho vendor data
    zoho_vendor_id TEXT NOT NULL,
    vendor_name TEXT NOT NULL,
    legal_name TEXT,
    gstin TEXT,
    pan TEXT,
    billing_address JSONB,
    payment_terms TEXT,
    bank_details JSONB,
    contact_email TEXT,
    contact_phone TEXT,

    -- Status
    is_empanelled BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    last_synced_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(organization_id, zoho_vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_cache_org ON zoho_po_vendor_cache(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_cache_gstin ON zoho_po_vendor_cache(gstin);
CREATE INDEX IF NOT EXISTS idx_vendor_cache_name ON zoho_po_vendor_cache USING gin(to_tsvector('simple', vendor_name));

-- 3. Entity Master Table (GSTIN <-> Entity <-> Address)
CREATE TABLE IF NOT EXISTS zoho_po_entity_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),

    -- Entity info
    entity_name TEXT NOT NULL,
    legal_entity_name TEXT,
    gstin TEXT NOT NULL,
    state_code TEXT NOT NULL,
    state_name TEXT NOT NULL,

    -- Address
    billing_address JSONB NOT NULL,
    shipping_address JSONB,

    -- Zoho mapping
    zoho_organization_id TEXT,

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(organization_id, gstin)
);

CREATE INDEX IF NOT EXISTS idx_entity_master_org ON zoho_po_entity_master(organization_id);
CREATE INDEX IF NOT EXISTS idx_entity_master_state ON zoho_po_entity_master(state_code);

-- 4. Module Settings Table
CREATE TABLE IF NOT EXISTS zoho_po_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id),

    -- Zoho credentials
    zoho_organization_id TEXT,
    zoho_access_token TEXT,
    zoho_refresh_token TEXT,
    zoho_token_expires_at TIMESTAMPTZ,

    -- AI Configuration
    ai_model_provider TEXT DEFAULT 'claude',
    ai_model_name TEXT,

    -- Business rules
    po_approval_threshold DECIMAL(12,2) DEFAULT 100000,
    auto_retry_enabled BOOLEAN DEFAULT true,
    max_retry_count INTEGER DEFAULT 3,

    -- Feature flags
    is_enabled BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE zoho_po_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_po_vendor_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_po_entity_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_po_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit log
CREATE POLICY "Users can view audit logs for their org"
    ON zoho_po_audit_log FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_memberships
        WHERE organization_id = zoho_po_audit_log.organization_id
        AND user_id = auth.uid()
    ));

CREATE POLICY "Users can create audit logs for their org"
    ON zoho_po_audit_log FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM organization_memberships
        WHERE organization_id = zoho_po_audit_log.organization_id
        AND user_id = auth.uid()
    ));

-- RLS Policies for vendor cache
CREATE POLICY "Users can view vendor cache for their org"
    ON zoho_po_vendor_cache FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_memberships
        WHERE organization_id = zoho_po_vendor_cache.organization_id
        AND user_id = auth.uid()
    ));

-- RLS Policies for entity master
CREATE POLICY "Users can view entity master for their org"
    ON zoho_po_entity_master FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM organization_memberships
        WHERE organization_id = zoho_po_entity_master.organization_id
        AND user_id = auth.uid()
    ));

-- RLS Policies for settings (org super admin only)
CREATE POLICY "Org admins can manage PO settings"
    ON zoho_po_settings FOR ALL
    USING (EXISTS (
        SELECT 1 FROM organization_memberships
        WHERE organization_id = zoho_po_settings.organization_id
        AND user_id = auth.uid()
        AND role IN ('org_super_admin', 'admin')
    ));

-- 5. Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
DROP TRIGGER IF EXISTS update_zoho_po_vendor_cache_updated_at ON zoho_po_vendor_cache;
CREATE TRIGGER update_zoho_po_vendor_cache_updated_at
    BEFORE UPDATE ON zoho_po_vendor_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_zoho_po_entity_master_updated_at ON zoho_po_entity_master;
CREATE TRIGGER update_zoho_po_entity_master_updated_at
    BEFORE UPDATE ON zoho_po_entity_master
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_zoho_po_settings_updated_at ON zoho_po_settings;
CREATE TRIGGER update_zoho_po_settings_updated_at
    BEFORE UPDATE ON zoho_po_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
