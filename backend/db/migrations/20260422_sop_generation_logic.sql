-- Migration: SOP Generation Logic
-- Description: Function to pre-generate checklist slots for a given date.
-- Date: 2026-04-22

CREATE OR REPLACE FUNCTION generate_sop_completions(p_target_date DATE)
RETURNS void AS $$
DECLARE
    template_rec RECORD;
    slot_time TIME;
    slot_due_at TIMESTAMPTZ;
    interval_hours INTEGER;
    window_duration_mins INTEGER;
    offset_mins INTEGER;
BEGIN
    FOR template_rec IN 
        SELECT id, property_id, organization_id, frequency, start_time, end_time 
        FROM sop_templates 
        WHERE is_active = true
    LOOP
        -- Handle Daily
        IF template_rec.frequency = 'daily' THEN
            -- Use start_time if provided, else midnight
            slot_due_at := (p_target_date + COALESCE(template_rec.start_time, '00:00:00'::TIME))::TIMESTAMPTZ;
            
            INSERT INTO sop_completions (
                template_id, 
                property_id, 
                organization_id, 
                due_at, 
                status, 
                completion_date
            )
            VALUES (
                template_rec.id, 
                template_rec.property_id, 
                template_rec.organization_id, 
                slot_due_at, 
                'pending', 
                p_target_date
            )
            ON CONFLICT (template_id, due_at) DO NOTHING;
            
        -- Handle Hourly (e.g. every_1_hour, every_2_hours)
        ELSIF template_rec.frequency LIKE 'every_%_hour%' THEN
            -- Extract N from 'every_N_hours'
            interval_hours := (substring(template_rec.frequency from 'every_(\d+)_hour')::INTEGER);
            
            IF interval_hours IS NULL OR interval_hours = 0 THEN
                CONTINUE;
            END IF;

            -- Calculate total window duration in minutes
            IF template_rec.end_time < template_rec.start_time THEN
                -- Overnight: end is on the next calendar day
                window_duration_mins := (EXTRACT(EPOCH FROM (template_rec.end_time + INTERVAL '1 day' - template_rec.start_time)) / 60)::INTEGER;
            ELSE
                window_duration_mins := (EXTRACT(EPOCH FROM (template_rec.end_time - template_rec.start_time)) / 60)::INTEGER;
            END IF;

            offset_mins := 0;
            
            -- Generate slots starting from start_time up to start_time + duration
            WHILE offset_mins <= window_duration_mins LOOP
                slot_due_at := (p_target_date + template_rec.start_time)::TIMESTAMPTZ + (offset_mins || ' minutes')::INTERVAL;
                
                INSERT INTO sop_completions (
                    template_id, 
                    property_id, 
                    organization_id, 
                    due_at, 
                    status, 
                    completion_date
                )
                VALUES (
                    template_rec.id, 
                    template_rec.property_id, 
                    template_rec.organization_id, 
                    slot_due_at, 
                    'pending', 
                    (slot_due_at AT TIME ZONE 'UTC')::DATE -- Store the actual date this slot falls on
                )
                ON CONFLICT (template_id, due_at) DO NOTHING;
                
                offset_mins := offset_mins + (interval_hours * 60);
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Helper to mark missed checklists
CREATE OR REPLACE FUNCTION update_missed_sop_completions()
RETURNS void AS $$
BEGIN
    UPDATE sop_completions
    SET status = 'missed'
    WHERE status IN ('pending', 'in_progress')
      AND due_at < (NOW() - INTERVAL '1 hour'); -- Allow 1 hour grace period, or adjust as needed
END;
$$ LANGUAGE plpgsql;
