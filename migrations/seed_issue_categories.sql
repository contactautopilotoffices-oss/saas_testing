-- =========================================================
-- MIGRATION: Seed Issue Categories & Link to Skills
-- Purpose: Map precise issue categories (e.g. water_leakage) 
-- to specific skill groups (e.g. plumbing) for auto-assignment.
-- =========================================================

DO $$
DECLARE
    r_prop RECORD;
    v_tech_id uuid;
    v_plum_id uuid;
    v_soft_id uuid;
    v_vendor_id uuid;
BEGIN
    FOR r_prop IN SELECT id FROM properties LOOP
        
        -- 1. Get Skill Group IDs for this property
        SELECT id INTO v_tech_id FROM skill_groups WHERE property_id = r_prop.id AND code = 'technical';
        SELECT id INTO v_plum_id FROM skill_groups WHERE property_id = r_prop.id AND code = 'plumbing';
        SELECT id INTO v_soft_id FROM skill_groups WHERE property_id = r_prop.id AND code = 'soft_services';
        SELECT id INTO v_vendor_id FROM skill_groups WHERE property_id = r_prop.id AND code = 'vendor';

        -- 2. Insert/Update Issue Categories (Technical)
        -- AC, Power, Wifi, Lighting, DG -> Technical
        INSERT INTO issue_categories (property_id, code, name, skill_group_id, priority) VALUES
        (r_prop.id, 'ac_breakdown', 'AC Breakdown', v_tech_id, 'high'),
        (r_prop.id, 'power_outage', 'Power Outage', v_tech_id, 'urgent'),
        (r_prop.id, 'wifi_down', 'Wifi Issue', v_tech_id, 'medium'),
        (r_prop.id, 'lighting_issue', 'Lighting', v_tech_id, 'medium'),
        (r_prop.id, 'dg_issue', 'DG / Power Backup', v_tech_id, 'high')
        ON CONFLICT (property_id, code) DO UPDATE SET skill_group_id = v_tech_id;

        -- 3. Insert/Update Issue Categories (Plumbing)
        -- Water Leakage, No Water, Washroom -> Plumbing
        INSERT INTO issue_categories (property_id, code, name, skill_group_id, priority) VALUES
        (r_prop.id, 'water_leakage', 'Water Leakage', v_plum_id, 'high'),
        (r_prop.id, 'no_water_supply', 'No Water Supply', v_plum_id, 'urgent'),
        (r_prop.id, 'washroom_issue', 'Washroom / Plumbing', v_plum_id, 'medium')
        ON CONFLICT (property_id, code) DO UPDATE SET skill_group_id = v_plum_id;

        -- 4. Insert/Update Issue Categories (Vendor)
        -- Lift, Fire, Painting -> Vendor
        INSERT INTO issue_categories (property_id, code, name, skill_group_id, priority) VALUES
        (r_prop.id, 'lift_breakdown', 'Lift Breakdown', v_vendor_id, 'urgent'),
        (r_prop.id, 'stuck_lift', 'Person Stuck in Lift', v_vendor_id, 'urgent'),
        (r_prop.id, 'fire_alarm_l2', 'Fire Alarm', v_vendor_id, 'critical'),
        (r_prop.id, 'painting', 'Painting', v_vendor_id, 'low')
        ON CONFLICT (property_id, code) DO UPDATE SET skill_group_id = v_vendor_id;

        -- 5. Insert/Update Issue Categories (Soft Services)
        -- Cleaning, Deep Cleaning, Furniture -> Soft Services
        INSERT INTO issue_categories (property_id, code, name, skill_group_id, priority) VALUES
        (r_prop.id, 'deep_cleaning', 'Deep Cleaning', v_soft_id, 'low'),
        (r_prop.id, 'chair_broken', 'Furniture Repair', v_soft_id, 'medium'),
        (r_prop.id, 'desk_alignment', 'desk_alignment', v_soft_id, 'low')
        ON CONFLICT (property_id, code) DO UPDATE SET skill_group_id = v_soft_id;

    END LOOP;
END $$;
