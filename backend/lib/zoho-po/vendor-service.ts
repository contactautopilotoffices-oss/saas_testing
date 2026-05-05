// ============================================
// Vendor Service — Fuzzy Matching, GST Validation & Cache Management
// ============================================

import { z } from 'zod';
import { createAdminClient } from '@/frontend/utils/supabase/admin';
import { ZohoBooksClient } from '@/backend/lib/zoho-po/zoho-client';
import type {
    ZohoPOSettings,
    ZohoVendor,
    VendorCacheRecord,
    VendorMatch,
    NewVendorInput,
} from '@/backend/lib/zoho-po/types';

// ==========================================
// GSTIN Validation
// ==========================================

/**
 * Valid Indian state codes for GSTIN (first 2 digits).
 */
const VALID_STATE_CODES: ReadonlySet<string> = new Set([
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
    '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
    '31', '32', '33', '34', '35', '36', '37', '38', '97', '99',
]);

/**
 * GSTIN checksum character lookup.
 */
const CHECKSUM_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Calculate the checksum digit for a GSTIN using the weighted sum algorithm.
 */
function calculateGSTINChecksum(gstinWithoutChecksum: string): string {
    const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;

    for (let i = 0; i < gstinWithoutChecksum.length; i++) {
        const char = gstinWithoutChecksum[i].toUpperCase();
        const value = CHECKSUM_CHARS.indexOf(char);
        if (value === -1) return '';
        const product = value * weights[i];
        sum += Math.floor(product / 36) + (product % 36);
    }

    const checksumIndex = (36 - (sum % 36)) % 36;
    return CHECKSUM_CHARS[checksumIndex];
}

/**
 * Validate a GSTIN (Goods and Services Tax Identification Number).
 * Format: 2-digit state code + 10-char PAN-like + 1 entity number + 'Z' + 1 checksum
 */
export function isValidGSTIN(gstin: string): boolean {
    if (!gstin || typeof gstin !== 'string') return false;
    if (gstin.length !== 15) return false;

    // Must be all uppercase alphanumeric
    if (!/^[0-9A-Z]{15}$/.test(gstin.toUpperCase())) return false;

    const normalized = gstin.toUpperCase();

    // Check state code (first 2 digits)
    const stateCode = normalized.substring(0, 2);
    if (!VALID_STATE_CODES.has(stateCode)) return false;

    // Check that 13th char is a digit (entity number)
    if (!/^[0-9]$/.test(normalized[12])) return false;

    // Check that 14th char is 'Z'
    if (normalized[13] !== 'Z') return false;

    // Validate checksum (15th character)
    const withoutChecksum = normalized.substring(0, 14);
    const expectedChecksum = calculateGSTINChecksum(withoutChecksum);
    if (!expectedChecksum || normalized[14] !== expectedChecksum) return false;

    return true;
}

// ==========================================
// PAN Validation
// ==========================================

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * Validate a PAN (Permanent Account Number).
 * Format: 5 letters + 4 digits + 1 letter
 */
export function isValidPAN(pan: string): boolean {
    if (!pan || typeof pan !== 'string') return false;
    return PAN_REGEX.test(pan.toUpperCase());
}

// ==========================================
// Levenshtein Distance & Similarity
// ==========================================

/**
 * Calculate the Levenshtein edit distance between two strings.
 * Uses dynamic programming with space optimization (O(min(m,n)) space).
 */
export function levenshteinDistance(a: string, b: string): number {
    // Ensure 'a' is the shorter string for space optimization
    if (a.length > b.length) {
        [a, b] = [b, a];
    }

    const m = a.length;
    const n = b.length;

    if (m === 0) return n;
    if (n === 0) return m;

    // Use two rows instead of full matrix
    let prev: number[] = new Array(m + 1);
    let curr: number[] = new Array(m + 1);

    for (let i = 0; i <= m; i++) {
        prev[i] = i;
    }

    for (let j = 1; j <= n; j++) {
        curr[0] = j;
        for (let i = 1; i <= m; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            curr[i] = Math.min(
                prev[i] + 1,      // deletion
                curr[i - 1] + 1,  // insertion
                prev[i - 1] + cost // substitution
            );
        }
        [prev, curr] = [curr, prev]; // Swap rows
    }

    return prev[m];
}

/**
 * Calculate a similarity score (0–1) between two strings
 * based on Levenshtein distance.
 */
export function similarityScore(a: string, b: string): number {
    if (!a && !b) return 1;
    if (!a || !b) return 0;

    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;

    const distance = levenshteinDistance(a, b);
    return 1 - distance / maxLen;
}

// ==========================================
// String Normalization
// ==========================================

/**
 * Normalize a string for fuzzy comparison:
 * - Lowercase
 * - Remove punctuation and special characters
 * - Collapse multiple spaces
 * - Trim
 */
function normalizeForComparison(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Get unique words from a normalized string.
 */
function getWords(str: string): string[] {
    const normalized = normalizeForComparison(str);
    return normalized.split(' ').filter((w) => w.length > 0);
}

/**
 * Calculate word overlap ratio between two strings.
 * Returns: count(shared words) / max(total words)
 */
function wordOverlapScore(a: string, b: string): number {
    const wordsA = new Set(getWords(a));
    const wordsB = getWords(b);

    if (wordsA.size === 0 && wordsB.length === 0) return 1;
    if (wordsA.size === 0 || wordsB.length === 0) return 0;

    let shared = 0;
    for (const word of wordsB) {
        if (wordsA.has(word)) shared++;
    }

    return shared / Math.max(wordsA.size, wordsB.length);
}

// ==========================================
// Fuzzy Matching
// ==========================================

/**
 * Calculate a composite match score between a query and a vendor name.
 * Returns a score between 0 and 1, along with a human-readable reason.
 */
function calculateMatchScore(query: string, vendorName: string): { score: number; reason: string } {
    const normalizedQuery = normalizeForComparison(query);
    const normalizedVendor = normalizeForComparison(vendorName);

    if (!normalizedQuery || !normalizedVendor) {
        return { score: 0, reason: 'Empty query or vendor name' };
    }

    // Exact match
    if (normalizedQuery === normalizedVendor) {
        return { score: 1.0, reason: 'Exact match' };
    }

    // Contains (query is fully inside vendor name)
    if (normalizedVendor.includes(normalizedQuery)) {
        return { score: 0.85, reason: 'Vendor name contains full query' };
    }

    // Reverse contains (vendor name inside query)
    if (normalizedQuery.includes(normalizedVendor)) {
        return { score: 0.8, reason: 'Query contains full vendor name' };
    }

    // Word overlap
    const wordScore = wordOverlapScore(query, vendorName);
    if (wordScore >= 0.7) {
        return { score: 0.6 + wordScore * 0.3, reason: 'High word overlap' };
    }

    // Levenshtein similarity
    const levScore = similarityScore(normalizedQuery, normalizedVendor);
    if (levScore >= 0.7) {
        return { score: levScore * 0.85, reason: 'Similar spelling' };
    }

    // Composite score: blend word overlap and Levenshtein
    const composite = wordScore * 0.5 + levScore * 0.5;

    if (composite >= 0.5) {
        return { score: composite * 0.7, reason: 'Partial match' };
    }

    return { score: composite, reason: 'Low similarity' };
}

// ==========================================
// Zod Schemas
// ==========================================

const VendorCacheRowSchema = z.object({
    id: z.string(),
    zoho_vendor_id: z.string(),
    vendor_name: z.string(),
    legal_name: z.string().nullable().optional(),
    gstin: z.string().nullable().optional(),
    pan: z.string().nullable().optional(),
    billing_address: z.record(z.unknown()).nullable().optional(),
    payment_terms: z.string().nullable().optional(),
    is_empanelled: z.boolean(),
    is_active: z.boolean().optional(),
});

// ==========================================
// Database Helpers
// ==========================================

/**
 * Map a raw Supabase row to VendorCacheRecord type.
 */
function mapRowToCacheRecord(row: z.infer<typeof VendorCacheRowSchema>): VendorCacheRecord {
    const parsed = VendorCacheRowSchema.parse(row);
    return {
        id: parsed.id,
        zoho_vendor_id: parsed.zoho_vendor_id,
        vendor_name: parsed.vendor_name,
        legal_name: parsed.legal_name || undefined,
        gstin: parsed.gstin || undefined,
        pan: parsed.pan || undefined,
        billing_address: parsed.billing_address as unknown as VendorCacheRecord['billing_address'],
        payment_terms: parsed.payment_terms || undefined,
        is_empanelled: parsed.is_empanelled,
    };
}

// ==========================================
// Public API
// ==========================================

/**
 * Search empanelled vendors with fuzzy matching.
 * Scores results and returns sorted matches above minScore threshold.
 */
export async function searchEmpanelledVendors(
    orgId: string,
    query: string,
    options?: { minScore?: number; limit?: number }
): Promise<VendorMatch[]> {
    const minScore = options?.minScore ?? 0.6;
    const limit = options?.limit ?? 20;

    if (!query || query.trim().length === 0) {
        return [];
    }

    const supabase = createAdminClient();

    // Fetch active empanelled vendors for the org
    const { data: rows, error } = await supabase
        .from('zoho_po_vendor_cache')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .eq('is_empanelled', true);

    if (error) {
        throw new Error(`Failed to search vendors: ${error.message}`);
    }

    if (!rows || rows.length === 0) {
        return [];
    }

    // Score each vendor with fuzzy matching
    const matches: VendorMatch[] = rows
        .map((row: Record<string, unknown>) => {
            const record = mapRowToCacheRecord(row as z.infer<typeof VendorCacheRowSchema>);
            const { score, reason } = calculateMatchScore(query, record.vendor_name);

            // Also check legal_name if different from vendor_name
            let finalScore = score;
            let finalReason = reason;

            if (record.legal_name && record.legal_name !== record.vendor_name) {
                const { score: legalScore, reason: legalReason } = calculateMatchScore(
                    query,
                    record.legal_name
                );
                if (legalScore > finalScore) {
                    finalScore = legalScore;
                    finalReason = legalReason;
                }
            }

            return {
                vendor: record,
                match_score: finalScore,
                match_reason: finalReason,
            };
        })
        .filter((m: VendorMatch) => m.match_score >= minScore)
        .sort((a: VendorMatch, b: VendorMatch) => b.match_score - a.match_score)
        .slice(0, limit);

    return matches;
}

/**
 * Find the best matching vendor for a given vendor name (from parsed invoice).
 * Returns the single best match or null if no match exceeds the threshold.
 */
export async function findVendorMatch(
    orgId: string,
    vendorName: string
): Promise<VendorMatch | null> {
    const matches = await searchEmpanelledVendors(orgId, vendorName, {
        minScore: 0.5,
        limit: 5,
    });

    if (matches.length === 0) {
        return null;
    }

    return matches[0];
}

/**
 * Get a single vendor by their Zoho contact ID from the local cache.
 */
export async function getVendorById(
    orgId: string,
    zohoVendorId: string
): Promise<VendorCacheRecord | null> {
    const supabase = createAdminClient();

    const { data: row, error } = await supabase
        .from('zoho_po_vendor_cache')
        .select('*')
        .eq('organization_id', orgId)
        .eq('zoho_vendor_id', zohoVendorId)
        .eq('is_active', true)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to get vendor by ID: ${error.message}`);
    }

    if (!row) {
        return null;
    }

    return mapRowToCacheRecord(row as z.infer<typeof VendorCacheRowSchema>);
}

/**
 * Create a new vendor in Zoho Books and add to local cache.
 * Validates GSTIN and PAN before creation. Checks for existing vendor by GSTIN.
 */
export async function createNewVendor(
    orgId: string,
    vendorData: NewVendorInput,
    settings: ZohoPOSettings
): Promise<{ vendor_id: string; vendor_name: string }> {
    // ── Validate GSTIN ──────────────────────────────────────────
    if (!vendorData.gstin) {
        throw new Error('GSTIN is required for new vendor creation');
    }

    const normalizedGSTIN = vendorData.gstin.toUpperCase().trim();
    if (!isValidGSTIN(normalizedGSTIN)) {
        throw new Error(`Invalid GSTIN format: ${vendorData.gstin}`);
    }

    // ── Validate PAN (if provided) ─────────────────────────────
    if (vendorData.pan && !isValidPAN(vendorData.pan)) {
        throw new Error(`Invalid PAN format: ${vendorData.pan}`);
    }

    // ── Validate legal name ────────────────────────────────────
    if (!vendorData.legal_name || vendorData.legal_name.trim().length === 0) {
        throw new Error('Legal name is required for new vendor creation');
    }

    // ── Validate billing address ───────────────────────────────
    if (!vendorData.billing_address) {
        throw new Error('Billing address is required for new vendor creation');
    }
    if (!vendorData.billing_address.line1 || !vendorData.billing_address.city) {
        throw new Error('Billing address must include at least line1 and city');
    }

    const supabase = createAdminClient();

    // ── Check if vendor already exists by GSTIN ────────────────
    const { data: existingByGSTIN } = await supabase
        .from('zoho_po_vendor_cache')
        .select('*')
        .eq('organization_id', orgId)
        .eq('gstin', normalizedGSTIN)
        .eq('is_active', true)
        .maybeSingle();

    if (existingByGSTIN) {
        const record = mapRowToCacheRecord(existingByGSTIN as z.infer<typeof VendorCacheRowSchema>);
        return {
            vendor_id: record.zoho_vendor_id,
            vendor_name: record.vendor_name,
        };
    }

    // ── Check for similar vendor by name (fuzzy) ──────────────
    const { data: existingByName } = await supabase
        .from('zoho_po_vendor_cache')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .ilike('vendor_name', `%${vendorData.legal_name.trim()}%`)
        .limit(1);

    if (existingByName && existingByName.length > 0) {
        const record = mapRowToCacheRecord(existingByName[0] as z.infer<typeof VendorCacheRowSchema>);
        // If same GSTIN or no GSTIN on existing record, return it
        if (!record.gstin || record.gstin === normalizedGSTIN) {
            return {
                vendor_id: record.zoho_vendor_id,
                vendor_name: record.vendor_name,
            };
        }
    }

    // ── Create vendor in Zoho ──────────────────────────────────
    const client = new ZohoBooksClient(settings);

    const zohoVendor = await client.createVendor({
        ...vendorData,
        gstin: normalizedGSTIN,
        pan: vendorData.pan ? vendorData.pan.toUpperCase().trim() : vendorData.pan,
    });

    // ── Insert into local cache ────────────────────────────────
    const { error: cacheError } = await supabase.from('zoho_po_vendor_cache').insert({
        organization_id: orgId,
        zoho_vendor_id: zohoVendor.contact_id,
        vendor_name: zohoVendor.contact_name,
        legal_name: vendorData.legal_name,
        gstin: normalizedGSTIN,
        pan: vendorData.pan ? vendorData.pan.toUpperCase().trim() : null,
        billing_address: vendorData.billing_address,
        payment_terms: vendorData.payment_terms,
        is_empanelled: false, // New vendors start as non-empanelled
        is_active: true,
        synced_at: new Date().toISOString(),
    });

    if (cacheError) {
        // Log but don't fail — vendor exists in Zoho
        console.error(
            `[VENDOR] Created in Zoho but failed to cache: ${cacheError.message}`,
            zohoVendor
        );
    }

    return {
        vendor_id: zohoVendor.contact_id,
        vendor_name: zohoVendor.contact_name,
    };
}

/**
 * Sync all vendors from Zoho Books to the local cache.
 * Returns counts of synced vendors and errors encountered.
 */
export async function syncVendorCache(
    orgId: string,
    settings: ZohoPOSettings
): Promise<{ synced: number; errors: number }> {
    if (!settings.zoho_organization_id) {
        throw new Error('Zoho organization ID is not configured');
    }

    const client = new ZohoBooksClient(settings);

    let synced = 0;
    let errors = 0;

    try {
        synced = await client.syncVendorsToCache();
    } catch (err) {
        console.error(`[VENDOR] Sync failed for org ${orgId}:`, err);
        errors = 1;
    }

    return { synced, errors };
}

/**
 * Get all vendors for an organization from the local cache,
 * with optional search, pagination, and limit.
 */
export async function getVendorsForOrg(
    orgId: string,
    options?: { search?: string; limit?: number; offset?: number }
): Promise<VendorCacheRecord[]> {
    const supabase = createAdminClient();
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    let query = supabase
        .from('zoho_po_vendor_cache')
        .select('*')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('vendor_name', { ascending: true })
        .range(offset, offset + limit - 1);

    if (options?.search) {
        query = query.ilike('vendor_name', `%${options.search}%`);
    }

    const { data: rows, error } = await query;

    if (error) {
        throw new Error(`Failed to get vendors: ${error.message}`);
    }

    if (!rows || rows.length === 0) {
        return [];
    }

    return rows.map((row: Record<string, unknown>) =>
        mapRowToCacheRecord(row as z.infer<typeof VendorCacheRowSchema>)
    );
}

/**
 * Check if a vendor exists in the cache by GSTIN.
 * Returns the cached record or null.
 */
export async function findVendorByGSTIN(
    orgId: string,
    gstin: string
): Promise<VendorCacheRecord | null> {
    const normalizedGSTIN = gstin.toUpperCase().trim();

    if (!isValidGSTIN(normalizedGSTIN)) {
        return null;
    }

    const supabase = createAdminClient();

    const { data: row, error } = await supabase
        .from('zoho_po_vendor_cache')
        .select('*')
        .eq('organization_id', orgId)
        .eq('gstin', normalizedGSTIN)
        .eq('is_active', true)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to find vendor by GSTIN: ${error.message}`);
    }

    if (!row) {
        return null;
    }

    return mapRowToCacheRecord(row as z.infer<typeof VendorCacheRowSchema>);
}

/**
 * Bulk import vendors from a list.
 * Creates each vendor in Zoho and caches it. Returns summary counts.
 */
export async function bulkImportVendors(
    orgId: string,
    vendors: NewVendorInput[],
    settings: ZohoPOSettings
): Promise<{
    created: number;
    existing: number;
    failed: number;
    errors: Array<{ vendor: string; error: string }>;
}> {
    const results = {
        created: 0,
        existing: 0,
        failed: 0,
        errors: [] as Array<{ vendor: string; error: string }>,
    };

    for (const vendorData of vendors) {
        try {
            // Check if vendor exists by GSTIN
            const existing = vendorData.gstin
                ? await findVendorByGSTIN(orgId, vendorData.gstin)
                : null;

            if (existing) {
                results.existing++;
                continue;
            }

            // Create new vendor
            await createNewVendor(orgId, vendorData, settings);
            results.created++;
        } catch (err) {
            results.failed++;
            results.errors.push({
                vendor: vendorData.legal_name || 'unknown',
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }

    return results;
}
