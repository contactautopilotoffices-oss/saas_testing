/**
 * GST Calculation Engine
 *
 * Purpose: Compute GST rates and tax breakdowns for Purchase Orders.
 * - Determines interstate vs intrastate from GSTIN state codes
 * - Applies HSN-code-based GST rate rules
 * - Fetches active GST entities from Supabase for an organization
 */

import { GSTCalculation, GSTEntity } from './types';
import { createClient } from '@/frontend/utils/supabase/server';

// ============================================
// STATE CODE MAPPING (GSTIN first 2 digits)
// ============================================

/** Map of GST state codes to state names */
const STATE_CODE_MAP: Record<string, string> = {
    '27': 'Maharashtra',
    '29': 'Karnataka',
    '33': 'Tamil Nadu',
    '36': 'Telangana',
    '24': 'Gujarat',
    '06': 'Haryana',
    '09': 'Uttar Pradesh',
    '07': 'Delhi',
    '23': 'Madhya Pradesh',
    '21': 'Odisha',
    '10': 'Bihar',
    '20': 'Jharkhand',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '08': 'Rajasthan',
    '30': 'Goa',
    '32': 'Kerala',
    '34': 'Puducherry',
    '35': 'Andaman and Nicobar Islands',
    '37': 'Dadra and Nagar Haveli and Daman and Diu',
    '38': 'Dadra and Nagar Haveli and Daman and Diu (Old)',
    '39': 'Ladakh',
    '96': 'Jammu and Kashmir',
};

// ============================================
// HSN CODE RATE RULES
// ============================================

/** Default GST rate for goods & services: 18% total */
const DEFAULT_RATE = { cgst: 9, sgst: 9, igst: 18 };

/** Essential goods rate: 5% total (HSN 01-24, 1001-2409) */
const ESSENTIAL_RATE = { cgst: 2.5, sgst: 2.5, igst: 5 };

/**
 * Extract the state name from a 15-character GSTIN.
 * The first 2 digits represent the state code.
 */
export function getStateFromGSTIN(gstin: string): string {
    if (!gstin || gstin.length < 2) {
        return 'Unknown';
    }
    const stateCode = gstin.substring(0, 2);
    return STATE_CODE_MAP[stateCode] || 'Unknown';
}

/**
 * Extract the 2-digit state code from a GSTIN.
 */
export function getStateCodeFromGSTIN(gstin: string): string {
    if (!gstin || gstin.length < 2) {
        return '';
    }
    return gstin.substring(0, 2);
}

/**
 * Determine if a transaction is intra-state (same state).
 * Both vendorState and entityState should be state *names*.
 */
export function isIntraState(vendorState: string, entityState: string): boolean {
    if (!vendorState || !entityState) return false;
    return vendorState.trim().toLowerCase() === entityState.trim().toLowerCase();
}

/**
 * Determine the appropriate GST calculation for a set of line items
 * based on vendor state, entity GSTIN, and HSN codes.
 */
export function determineGSTCalculation(
    vendorState: string,
    entityGSTIN: string,
    lineItems: Array<{ taxable_value: number; hsn_code?: string }>
): GSTCalculation {
    const entityState = getStateFromGSTIN(entityGSTIN);
    const intraState = isIntraState(vendorState, entityState);

    // Calculate total taxable value
    const taxableValue = lineItems.reduce((sum, item) => sum + (item.taxable_value || 0), 0);

    // Determine applicable GST rate based on HSN codes
    // If all items are essential goods, use essential rate; otherwise use default
    const allEssential = lineItems.length > 0 && lineItems.every((item) => isEssentialHSN(item.hsn_code));
    const rate = allEssential ? ESSENTIAL_RATE : DEFAULT_RATE;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (intraState) {
        // Intra-state: CGST + SGST
        cgstAmount = parseFloat(((taxableValue * rate.cgst) / 100).toFixed(2));
        sgstAmount = parseFloat(((taxableValue * rate.sgst) / 100).toFixed(2));
        igstAmount = 0;
    } else {
        // Inter-state: IGST only
        cgstAmount = 0;
        sgstAmount = 0;
        igstAmount = parseFloat(((taxableValue * rate.igst) / 100).toFixed(2));
    }

    const totalTax = parseFloat((cgstAmount + sgstAmount + igstAmount).toFixed(2));
    const totalAmount = parseFloat((taxableValue + totalTax).toFixed(2));

    return {
        is_intra_state: intraState,
        cgst_rate: intraState ? rate.cgst : 0,
        sgst_rate: intraState ? rate.sgst : 0,
        igst_rate: intraState ? 0 : rate.igst,
        total_tax_rate: intraState ? rate.cgst + rate.sgst : rate.igst,
        cgst_amount: cgstAmount,
        sgst_amount: sgstAmount,
        igst_amount: igstAmount,
        taxable_value: taxableValue,
        total_amount: totalAmount,
    };
}

/**
 * Check if an HSN code qualifies as essential goods (5% rate).
 * Essential goods: HSN chapters 01-24 (agriculture, food, etc.)
 * and tariff items 1001-2409.
 */
function isEssentialHSN(hsnCode?: string): boolean {
    if (!hsnCode) return false;

    // Normalize: remove spaces and take only digits
    const code = hsnCode.replace(/\s/g, '').replace(/\D/g, '');
    if (code.length === 0) return false;

    const numericCode = parseInt(code, 10);
    if (isNaN(numericCode)) return false;

    // Check chapters 01-24 (2-digit codes 1-24, or 4+ digit codes starting 0101-2499)
    const chapter = parseInt(code.substring(0, 2), 10);
    if (chapter >= 1 && chapter <= 24) {
        return true;
    }

    // Check tariff items 1001-2409 (4-digit range)
    if (numericCode >= 1001 && numericCode <= 2409) {
        return true;
    }

    return false;
}

/**
 * Get the default GST rate for a given HSN code.
 * Returns CGST/SGST/IGST percentages.
 */
export function getDefaultGSTRate(hsnCode?: string): { cgst: number; sgst: number; igst: number } {
    if (isEssentialHSN(hsnCode)) {
        return { ...ESSENTIAL_RATE };
    }
    return { ...DEFAULT_RATE };
}

// ============================================
// SUPABASE DATA ACCESS
// ============================================

/**
 * Fetch all active GST entities for an organization.
 * Queries the zoho_po_entity_master table in Supabase.
 */
export async function getGSTEntitiesForOrg(orgId: string): Promise<GSTEntity[]> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('zoho_po_entity_master')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_active', true);

        if (error) {
            console.error('[GSTEngine] Error fetching GST entities for org:', error.message);
            return [];
        }

        return (data || []).map(mapRowToGSTEntity);
    } catch (err) {
        console.error('[GSTEngine] Unexpected error fetching GST entities:', err);
        return [];
    }
}

/**
 * Fetch active GST entities for an organization filtered by city.
 * Useful when the user has specified a city/site location.
 */
export async function getGSTEntitiesByCity(orgId: string, city: string): Promise<GSTEntity[]> {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('zoho_po_entity_master')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .ilike('city', `%${city}%`);

        if (error) {
            console.error('[GSTEngine] Error fetching GST entities by city:', error.message);
            return [];
        }

        return (data || []).map(mapRowToGSTEntity);
    } catch (err) {
        console.error('[GSTEngine] Unexpected error fetching GST entities by city:', err);
        return [];
    }
}

/**
 * Map a Supabase row to the GSTEntity type.
 * Handles missing fields gracefully with sensible defaults.
 */
function mapRowToGSTEntity(row: Record<string, unknown>): GSTEntity {
    const billingAddress = row.billing_address as Record<string, unknown> | undefined;

    return {
        id: String(row.id ?? ''),
        entity_name: String(row.entity_name ?? ''),
        gstin: String(row.gstin ?? ''),
        state_code: String(row.state_code ?? ''),
        state_name: String(row.state_name ?? ''),
        billing_address: {
            line1: String(billingAddress?.line1 ?? row.address_line1 ?? ''),
            line2: billingAddress?.line2 ? String(billingAddress.line2) : undefined,
            city: String(billingAddress?.city ?? row.city ?? ''),
            state: String(billingAddress?.state ?? row.state_name ?? ''),
            pincode: String(billingAddress?.pincode ?? row.pincode ?? ''),
            country: String(billingAddress?.country ?? 'India'),
        },
    };
}
