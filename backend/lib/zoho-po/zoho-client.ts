// ============================================
// Zoho Books API Client — Production-Ready
// ============================================

import { z } from 'zod';
import { createAdminClient } from '@/frontend/utils/supabase/admin';
import type {
    ZohoPOSettings,
    ZohoVendor,
    ZohoOrganization,
    ZohoPORecord,
    ZohoPOPayload,
    NewVendorInput,
} from '@/backend/lib/zoho-po/types';

// ---------- Zod Schemas for API Validation ----------

const ZohoTokenResponseSchema = z.object({
    access_token: z.string(),
    refresh_token: z.string().optional(),
    expires_in: z.number().int().positive(),
    token_type: z.string(),
});

const ZohoContactSchema = z.object({
    contact_id: z.string(),
    contact_name: z.string(),
    company_name: z.string().optional(),
    contact_type: z.string().optional(),
    gst_treatment: z.string().optional(),
    gst_no: z.string().optional(),
    pan: z.string().optional(),
    billing_address: z
        .object({
            address: z.string(),
            street2: z.string().optional(),
            city: z.string(),
            state: z.string(),
            zip: z.string(),
            country: z.string(),
        })
        .optional(),
    contact_persons: z
        .array(
            z.object({
                first_name: z.string(),
                last_name: z.string().optional(),
                email: z.string(),
                phone: z.string().optional(),
            })
        )
        .optional(),
    status: z.string().optional(),
});

const ZohoVendorListSchema = z.object({
    code: z.number(),
    message: z.string(),
    contacts: z.array(ZohoContactSchema).default([]),
    page_context: z
        .object({
            page: z.number(),
            per_page: z.number(),
            has_more_page: z.boolean(),
        })
        .optional(),
});

const ZohoSingleContactSchema = z.object({
    code: z.number(),
    message: z.string(),
    contact: ZohoContactSchema.optional(),
});

const ZohoPOCreateResponseSchema = z.object({
    code: z.number(),
    message: z.string(),
    purchaseorder: z
        .object({
            purchaseorder_id: z.string(),
            purchaseorder_number: z.string(),
            status: z.string(),
            total: z.number(),
        })
        .optional(),
});

const ZohoPOGetSchema = z.object({
    code: z.number(),
    message: z.string(),
    purchaseorder: z
        .object({
            purchaseorder_id: z.string(),
            purchaseorder_number: z.string(),
            date: z.string(),
            status: z.string(),
            vendor_id: z.string(),
            vendor_name: z.string(),
            total: z.number(),
            sub_total: z.number(),
            tax_total: z.number(),
            line_items: z
                .array(
                    z.object({
                        line_item_id: z.string(),
                        item_id: z.string().optional(),
                        name: z.string(),
                        description: z.string(),
                        quantity: z.number(),
                        unit: z.string(),
                        rate: z.number(),
                        tax_id: z.string().optional(),
                        tax_name: z.string(),
                        tax_percentage: z.number(),
                        item_total: z.number(),
                        hsn_or_sac: z.string().optional(),
                    })
                )
                .default([]),
        })
        .optional(),
});

const ZohoOrgListSchema = z.object({
    code: z.number(),
    message: z.string(),
    organizations: z
        .array(
            z.object({
                organization_id: z.string(),
                name: z.string(),
                country: z.string().optional(),
                currency_code: z.string().optional(),
                time_zone: z.string().optional(),
            })
        )
        .default([]),
});

// ---------- Token Storage Types ----------

interface ZohoTokenRecord {
    id: string;
    organization_id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string; // ISO timestamp
    created_at: string;
    updated_at: string;
}

// ---------- Custom Error ----------

export class ZohoBooksError extends Error {
    constructor(
        message: string,
        public readonly statusCode?: number,
        public readonly zohoCode?: number,
        public readonly retryable: boolean = false
    ) {
        super(message);
        this.name = 'ZohoBooksError';
    }
}

// ---------- Utility ----------

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// Zoho Books API Client
// ============================================

export class ZohoBooksClient {
    private orgSettings: ZohoPOSettings;
    private baseUrl = 'https://www.zohoapis.com/books/v3';

    constructor(orgSettings: ZohoPOSettings) {
        if (!orgSettings.zoho_organization_id) {
            throw new ZohoBooksError(
                'Zoho organization ID is not configured in settings',
                undefined,
                undefined,
                false
            );
        }
        this.orgSettings = orgSettings;
    }

    // ==========================================
    // Token Management
    // ==========================================

    /**
     * Get a valid access token, refreshing if necessary.
     */
    private async getValidAccessToken(): Promise<string> {
        const orgId = this.orgSettings.organization_id;
        const supabase = createAdminClient();

        // Fetch current token record from DB
        const { data: tokenRecord, error } = await supabase
            .from('zoho_po_tokens')
            .select('*')
            .eq('organization_id', orgId)
            .single();

        if (error || !tokenRecord) {
            throw new ZohoBooksError(
                `No Zoho token found for organization ${orgId}. Please authenticate via Zoho OAuth first.`,
                undefined,
                undefined,
                false
            );
        }

        const typedRecord = tokenRecord as unknown as ZohoTokenRecord;
        const now = new Date();
        const expiresAt = new Date(typedRecord.expires_at);

        // If token expires within 5 minutes, refresh it
        if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
            await this.refreshAccessToken();
            // Re-fetch after refresh
            const { data: refreshed, error: refreshErr } = await supabase
                .from('zoho_po_tokens')
                .select('access_token')
                .eq('organization_id', orgId)
                .single();

            if (refreshErr || !refreshed) {
                throw new ZohoBooksError(
                    'Failed to retrieve refreshed access token',
                    undefined,
                    undefined,
                    false
                );
            }
            return refreshed.access_token;
        }

        return typedRecord.access_token;
    }

    /**
     * Refresh the access token using the stored refresh token.
     */
    private async refreshAccessToken(): Promise<void> {
        const orgId = this.orgSettings.organization_id;
        const supabase = createAdminClient();

        // Get the refresh token
        const { data: tokenRecord, error } = await supabase
            .from('zoho_po_tokens')
            .select('refresh_token')
            .eq('organization_id', orgId)
            .single();

        if (error || !tokenRecord) {
            throw new ZohoBooksError(
                `Cannot refresh token: no token record found for org ${orgId}`,
                undefined,
                undefined,
                false
            );
        }

        const refreshToken = (tokenRecord as unknown as ZohoTokenRecord).refresh_token;

        // Call Zoho token refresh endpoint
        const params = new URLSearchParams({
            refresh_token: refreshToken,
            client_id: process.env.ZOHO_CLIENT_ID || '',
            client_secret: process.env.ZOHO_CLIENT_SECRET || '',
            grant_type: 'refresh_token',
        });

        const response = await fetch(`https://accounts.zoho.com/oauth/v2/token?${params.toString()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new ZohoBooksError(
                `Token refresh failed: HTTP ${response.status} — ${errorBody}`,
                response.status,
                undefined,
                response.status >= 500
            );
        }

        const rawData = await response.json();
        const parsed = ZohoTokenResponseSchema.safeParse(rawData);

        if (!parsed.success) {
            throw new ZohoBooksError(
                `Invalid token response from Zoho: ${JSON.stringify(rawData)}`,
                undefined,
                undefined,
                false
            );
        }

        const { access_token, expires_in } = parsed.data;

        // Calculate expiry with 5-minute buffer
        const expiresAt = new Date(Date.now() + expires_in * 1000 - 5 * 60 * 1000);

        // Update token in DB
        const { error: upsertErr } = await supabase
            .from('zoho_po_tokens')
            .update({
                access_token,
                expires_at: expiresAt.toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('organization_id', orgId);

        if (upsertErr) {
            throw new ZohoBooksError(
                `Failed to store refreshed token: ${upsertErr.message}`,
                undefined,
                undefined,
                false
            );
        }
    }

    // ==========================================
    // HTTP Helper
    // ==========================================

    /**
     * Core HTTP request helper with auth headers, retry logic, and error handling.
     */
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = await this.getValidAccessToken();
        const orgId = this.orgSettings.zoho_organization_id!;

        // Build URL with organization_id query param
        const separator = endpoint.includes('?') ? '&' : '?';
        const url = `${this.baseUrl}${endpoint}${separator}organization_id=${orgId}`;

        const headers: Record<string, string> = {
            Authorization: `Zoho-oauthtoken ${token}`,
            'X-com-zoho-books-organizationid': orgId,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...((options.headers as Record<string, string>) || {}),
        };

        let lastError: Error | null = null;
        let rateLimitRetries = 0;
        const maxRateLimitRetries = 3;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                const response = await fetch(url, {
                    ...options,
                    headers,
                });

                // Handle 401 Unauthorized — try refresh token once and retry
                if (response.status === 401) {
                    if (lastError instanceof ZohoBooksError && lastError.statusCode === 401) {
                        throw new ZohoBooksError(
                            'Zoho authentication failed after token refresh. Token may be revoked.',
                            401,
                            undefined,
                            false
                        );
                    }
                    await this.refreshAccessToken();
                    const newToken = await this.getValidAccessToken();
                    headers.Authorization = `Zoho-oauthtoken ${newToken}`;
                    lastError = new ZohoBooksError('Token expired, refreshed', 401);
                    continue; // Retry with new token
                }

                // Handle 429 Rate Limit — exponential backoff
                if (response.status === 429) {
                    if (rateLimitRetries >= maxRateLimitRetries) {
                        throw new ZohoBooksError(
                            `Zoho rate limit exceeded after ${maxRateLimitRetries} retries`,
                            429,
                            undefined,
                            true
                        );
                    }
                    const backoffMs = Math.pow(2, rateLimitRetries) * 1000; // 1s, 2s, 4s
                    await sleep(backoffMs);
                    rateLimitRetries++;
                    continue;
                }

                // Handle 500+ server errors — retry once
                if (response.status >= 500) {
                    if (lastError instanceof ZohoBooksError && lastError.statusCode === response.status) {
                        throw new ZohoBooksError(
                            `Zoho server error ${response.status} persisted after retry`,
                            response.status,
                            undefined,
                            true
                        );
                    }
                    await sleep(1000);
                    lastError = new ZohoBooksError(`Server error ${response.status}`, response.status);
                    continue;
                }

                // Handle non-OK responses
                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new ZohoBooksError(
                        `Zoho API error: HTTP ${response.status} — ${errorBody}`,
                        response.status,
                        undefined,
                        response.status >= 500 || response.status === 429
                    );
                }

                // Parse JSON response
                const data = await response.json();
                return data as T;
            } catch (err) {
                if (err instanceof ZohoBooksError) {
                    throw err;
                }
                // Network errors — retry once
                if (lastError instanceof ZohoBooksError && lastError.statusCode === undefined) {
                    throw new ZohoBooksError(
                        `Network request failed: ${err instanceof Error ? err.message : String(err)}`,
                        undefined,
                        undefined,
                        true
                    );
                }
                lastError = err instanceof Error ? err : new Error(String(err));
                await sleep(1000);
            }
        }
    }

    // ==========================================
    // Vendor Operations
    // ==========================================

    /**
     * Get vendors from Zoho Books with optional search and pagination.
     */
    async getVendors(filters?: { search?: string; page?: number }): Promise<ZohoVendor[]> {
        const params = new URLSearchParams();
        params.set('contact_type', 'vendor');
        if (filters?.search) {
            params.set('search_text', filters.search);
        }
        if (filters?.page) {
            params.set('page', String(filters.page));
        }
        params.set('per_page', '200');

        const response = await this.request<unknown>(`/contacts?${params.toString()}`);
        const parsed = ZohoVendorListSchema.safeParse(response);

        if (!parsed.success) {
            throw new ZohoBooksError(
                `Invalid vendor list response: ${parsed.error.message}`,
                undefined,
                undefined,
                false
            );
        }

        return (parsed.data.contacts || []).map((c) => this.mapContactToVendor(c));
    }

    /**
     * Get a single vendor by their Zoho contact ID.
     */
    async getVendor(vendorId: string): Promise<ZohoVendor> {
        const response = await this.request<unknown>(`/contacts/${vendorId}`);
        const parsed = ZohoSingleContactSchema.safeParse(response);

        if (!parsed.success || !parsed.data.contact) {
            throw new ZohoBooksError(
                `Vendor not found or invalid response: ${parsed.error?.message || 'unknown'}`,
                undefined,
                undefined,
                false
            );
        }

        return this.mapContactToVendor(parsed.data.contact);
    }

    /**
     * Search vendors by a free-text query.
     */
    async searchVendors(query: string): Promise<ZohoVendor[]> {
        return this.getVendors({ search: query });
    }

    /**
     * Create a new vendor (contact) in Zoho Books.
     */
    async createVendor(
        vendorData: NewVendorInput
    ): Promise<{ contact_id: string; contact_name: string }> {
        const body: Record<string, unknown> = {
            contact_name: vendorData.legal_name,
            contact_type: 'vendor',
            gst_treatment: 'business_gst',
            gst_no: vendorData.gstin,
            ...(vendorData.pan ? { pan: vendorData.pan } : {}),
            billing_address: {
                address: vendorData.billing_address.line1,
                street2: vendorData.billing_address.line2 || '',
                city: vendorData.billing_address.city,
                state: vendorData.billing_address.state,
                zip: vendorData.billing_address.pincode,
                country: vendorData.billing_address.country || 'India',
            },
        };

        if (vendorData.contact_email) {
            body.contact_persons = [
                {
                    first_name: vendorData.legal_name,
                    email: vendorData.contact_email,
                    phone: vendorData.contact_phone || '',
                },
            ];
        }

        const response = await this.request<unknown>('/contacts', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        const parsed = ZohoSingleContactSchema.safeParse(response);

        if (!parsed.success || !parsed.data.contact) {
            throw new ZohoBooksError(
                `Failed to create vendor: ${parsed.error?.message || JSON.stringify(response)}`,
                undefined,
                undefined,
                false
            );
        }

        const { contact_id, contact_name } = parsed.data.contact;

        return { contact_id, contact_name };
    }

    // ==========================================
    // PO Operations
    // ==========================================

    /**
     * Create a purchase order in Zoho Books.
     */
    async createPurchaseOrder(payload: ZohoPOPayload): Promise<{
        purchaseorder_id: string;
        purchaseorder_number: string;
        status: string;
        total: number;
    }> {
        const body: Record<string, unknown> = {
            vendor_id: payload.vendor_id,
            date: payload.date,
            reference_number: payload.reference_number || '',
            notes: payload.notes || '',
            terms: payload.terms || '',
            line_items: payload.line_items.map((item) => ({
                name: item.name,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                rate: item.rate,
                ...(item.tax_id ? { tax_id: item.tax_id } : {}),
                ...(item.hsn_or_sac ? { hsn_or_sac: item.hsn_or_sac } : {}),
                item_total: item.item_total,
            })),
        };

        if (payload.delivery_date) {
            body.delivery_date = payload.delivery_date;
        }

        if (payload.purchaseorder_number) {
            body.purchaseorder_number = payload.purchaseorder_number;
        }

        const response = await this.request<unknown>('/purchaseorders', {
            method: 'POST',
            body: JSON.stringify(body),
        });

        const parsed = ZohoPOCreateResponseSchema.safeParse(response);

        if (!parsed.success || !parsed.data.purchaseorder) {
            throw new ZohoBooksError(
                `Failed to create purchase order: ${parsed.error?.message || JSON.stringify(response)}`,
                undefined,
                undefined,
                false
            );
        }

        return parsed.data.purchaseorder;
    }

    /**
     * Get a purchase order by ID.
     */
    async getPurchaseOrder(poId: string): Promise<ZohoPORecord> {
        const response = await this.request<unknown>(`/purchaseorders/${poId}`);
        const parsed = ZohoPOGetSchema.safeParse(response);

        if (!parsed.success || !parsed.data.purchaseorder) {
            throw new ZohoBooksError(
                `Purchase order not found or invalid response: ${parsed.error?.message || 'unknown'}`,
                undefined,
                undefined,
                false
            );
        }

        const po = parsed.data.purchaseorder;

        return {
            purchaseorder_id: po.purchaseorder_id,
            purchaseorder_number: po.purchaseorder_number,
            date: po.date,
            status: po.status,
            vendor_id: po.vendor_id,
            vendor_name: po.vendor_name,
            total: po.total,
            sub_total: po.sub_total,
            tax_total: po.tax_total,
            line_items: po.line_items,
        };
    }

    // ==========================================
    // Organization
    // ==========================================

    /**
     * Get Zoho Books organization details.
     */
    async getOrganizationDetails(): Promise<ZohoOrganization> {
        const response = await this.request<unknown>('/organizations');
        const parsed = ZohoOrgListSchema.safeParse(response);

        if (!parsed.success) {
            throw new ZohoBooksError(
                `Invalid organization response: ${parsed.error.message}`,
                undefined,
                undefined,
                false
            );
        }

        const org = parsed.data.organizations.find(
            (o) => o.organization_id === this.orgSettings.zoho_organization_id
        );

        if (!org) {
            throw new ZohoBooksError(
                `Organization ${this.orgSettings.zoho_organization_id} not found in Zoho`,
                undefined,
                undefined,
                false
            );
        }

        return {
            organization_id: org.organization_id,
            name: org.name,
            country: org.country || 'India',
            currency_code: org.currency_code || 'INR',
            time_zone: org.time_zone || 'Asia/Kolkata',
        };
    }

    // ==========================================
    // Sync
    // ==========================================

    /**
     * Sync all vendors from Zoho to the local cache table.
     * Returns the number of vendors synced.
     */
    async syncVendorsToCache(): Promise<number> {
        const supabase = createAdminClient();
        const orgId = this.orgSettings.organization_id;
        let page = 1;
        let hasMore = true;
        let totalSynced = 0;

        while (hasMore) {
            const response = await this.request<unknown>(
                `/contacts?contact_type=vendor&page=${page}&per_page=200`
            );
            const parsed = ZohoVendorListSchema.safeParse(response);

            if (!parsed.success) {
                throw new ZohoBooksError(
                    `Invalid vendor list during sync: ${parsed.error.message}`,
                    undefined,
                    undefined,
                    false
                );
            }

            const vendors = parsed.data.contacts || [];
            hasMore = parsed.data.page_context?.has_more_page ?? false;

            if (vendors.length === 0) {
                break;
            }

            // Upsert into cache table
            const records = vendors.map((v) => ({
                organization_id: orgId,
                zoho_vendor_id: v.contact_id,
                vendor_name: v.contact_name,
                legal_name: v.company_name || v.contact_name,
                gstin: v.gst_no || null,
                pan: v.pan || null,
                billing_address: v.billing_address
                    ? {
                        line1: v.billing_address.address || '',
                        line2: v.billing_address.street2 || '',
                        city: v.billing_address.city || '',
                        state: v.billing_address.state || '',
                        pincode: v.billing_address.zip || '',
                        country: v.billing_address.country || 'India',
                    }
                    : null,
                is_empanelled: true,
                is_active: true,
                synced_at: new Date().toISOString(),
            }));

            // Upsert in batches of 100 to avoid payload limits
            const batchSize = 100;
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                const { error } = await supabase
                    .from('zoho_po_vendor_cache')
                    .upsert(batch, {
                        onConflict: 'organization_id,zoho_vendor_id',
                        ignoreDuplicates: false,
                    });

                if (error) {
                    throw new ZohoBooksError(
                        `Failed to upsert vendor cache batch: ${error.message}`,
                        undefined,
                        undefined,
                        false
                    );
                }
            }

            totalSynced += vendors.length;
            page++;
        }

        // Deactivate vendors that weren't synced (no longer in Zoho)
        // This is handled by comparing synced_at timestamp
        const cutoffTime = new Date(Date.now() - 60 * 1000).toISOString(); // 1 min ago
        const { error: deactivateErr } = await supabase
            .from('zoho_po_vendor_cache')
            .update({ is_active: false })
            .eq('organization_id', orgId)
            .lt('synced_at', cutoffTime);

        if (deactivateErr) {
            console.error('[ZOHO] Failed to deactivate stale vendors:', deactivateErr.message);
        }

        return totalSynced;
    }

    // ==========================================
    // Mapper
    // ==========================================

    /**
     * Map a Zoho contact response to our ZohoVendor type.
     */
    private mapContactToVendor(contact: z.infer<typeof ZohoContactSchema>): ZohoVendor {
        return {
            contact_id: contact.contact_id,
            contact_name: contact.contact_name,
            company_name: contact.company_name,
            gst_treatment: contact.gst_treatment,
            gst_no: contact.gst_no,
            pan: contact.pan,
            billing_address: contact.billing_address,
            contact_persons: contact.contact_persons,
        };
    }
}
