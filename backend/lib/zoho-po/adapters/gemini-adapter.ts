/**
 * Gemini Model Adapter
 *
 * Uses fetch() to call the Google Gemini API for invoice parsing and Zoho PO mapping.
 * - Model: gemini-2.0-flash
 * - Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent
 * - Timeout: 15s for parse, 10s for map
 * - Retry: 1 retry on timeout
 */

import {
    AIParseResult,
    AIMiddlewareResponse,
    AIModelConfig,
    ParsedInvoice,
    UserContext,
    GSTCalculation,
} from '../types';
import { z } from 'zod';

// ============================================
// CONFIGURATION
// ============================================

const DEFAULT_MODEL = 'gemini-2.0-flash';
const PARSE_TIMEOUT_MS = 15000;
const MAP_TIMEOUT_MS = 10000;
const MAX_RETRIES = 1;

// ============================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================

const ParsedInvoiceSchema = z.object({
    vendor_name: z.string().min(1),
    vendor_gstin: z.string().optional(),
    vendor_address: z.string().optional(),
    invoice_number: z.string().min(1),
    invoice_date: z.string().min(1),
    line_items: z.array(
        z.object({
            description: z.string().min(1),
            quantity: z.number().positive(),
            unit: z.string().min(1),
            unit_price: z.number().nonnegative(),
            total_price: z.number().nonnegative(),
            tax_rate: z.number().optional(),
            tax_amount: z.number().optional(),
            hsn_code: z.string().optional(),
        })
    ).min(1),
    subtotal: z.number().nonnegative(),
    tax_amount: z.number().nonnegative(),
    total_amount: z.number().positive(),
    currency: z.string().default('INR'),
    confidence: z.number().min(0).max(1),
});

// ============================================
// PROMPT BUILDERS
// ============================================

function buildExtractionPrompt(): string {
    return `You are an expert invoice parsing system. Extract the following fields from this Proforma Invoice document and return ONLY valid JSON matching this exact schema:

{
  "vendor_name": string (required),
  "vendor_gstin": string (optional, 15-character GSTIN),
  "vendor_address": string (optional),
  "invoice_number": string (required),
  "invoice_date": "YYYY-MM-DD" (required),
  "line_items": [
    {
      "description": string (required),
      "quantity": number (required),
      "unit": string (required, e.g., pcs, kg, m, nos, set),
      "unit_price": number (required),
      "total_price": number (required),
      "tax_rate": number (percentage, optional),
      "tax_amount": number (optional),
      "hsn_code": string (optional, 4-8 digit code)
    }
  ],
  "subtotal": number (required),
  "tax_amount": number (required),
  "total_amount": number (required),
  "currency": string (default "INR"),
  "confidence": number (0-1, your confidence)
}

Rules:
- Extract ALL line items from the invoice
- Do NOT calculate or invent values
- For dates use YYYY-MM-DD format
- If unclear, use null or best-effort value
- Confidence: 1.0=perfect, 0.5=blurry, 0.0=unreadable`;
}

function buildMappingPrompt(
    parsedInvoice: ParsedInvoice,
    userContext: UserContext,
    gstCalculation: GSTCalculation
): string {
    return `You are a Zoho Purchase Order mapping expert. Convert the parsed invoice data into a Zoho PO payload.

Parsed Invoice:
${JSON.stringify(parsedInvoice, null, 2)}

User Context:
${JSON.stringify(userContext, null, 2)}

GST Calculation:
${JSON.stringify(gstCalculation, null, 2)}

Return ONLY valid JSON with this exact structure:
{
  "zoho_payload": {
    "vendor_id": string (from userContext.vendor_id or "new"),
    "purchaseorder_number": string (optional),
    "date": string (YYYY-MM-DD),
    "delivery_date": string (optional, YYYY-MM-DD),
    "reference_number": string (original invoice number),
    "line_items": [
      {
        "name": string (item description),
        "description": string (detailed description),
        "quantity": number,
        "unit": string,
        "rate": number (unit price),
        "tax_percentage": number,
        "tax_type": "cgst" | "sgst" | "igst",
        "item_total": number,
        "hsn_or_sac": string (optional)
      }
    ],
    "notes": string (optional),
    "terms": string (optional),
    "is_intra_state": boolean,
    "gst_treatment": string,
    "entity_gstin": string,
    "billing_address": { line1, line2?, city, state, pincode, country },
    "shipping_address": { line1, line2?, city, state, pincode, country } (optional)
  },
  "processing_notes": string[],
  "confidence": number
}

Rules:
- Map each line item preserving quantities and prices exactly
- Set tax_type based on is_intra_state (cgst/sgst for intra, igst for inter)
- Include the entity GSTIN from user context
- Set reference_number to the original invoice number
- Add processing_notes explaining any assumptions or adjustments`;
}

// ============================================
// API CLIENT HELPERS
// ============================================

function getApiKey(): string | null {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.warn('[GeminiAdapter] GEMINI_API_KEY not configured');
    }
    return key || null;
}

function getApiUrl(model: string): string {
    const apiKey = getApiKey();
    return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

/**
 * Execute a fetch with timeout and abort controller.
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeoutMs: number
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`Request timed out after ${timeoutMs}ms`);
        }
        throw error;
    }
}

/**
 * Extract JSON from a string that may contain markdown fences.
 */
function extractJSON(text: string): string {
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
        return fenceMatch[1].trim();
    }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
        return text.substring(start, end + 1);
    }
    return text.trim();
}

// ============================================
// MAIN ADAPTER CLASS
// ============================================

export class GeminiAdapter {
    private model: string;
    private config: AIModelConfig;

    constructor(config: AIModelConfig) {
        this.model = config.modelName || DEFAULT_MODEL;
        this.config = config;
    }

    /**
     * Parse a base64-encoded invoice document into structured invoice data.
     * Retries once on timeout.
     */
    async parseInvoice(documentBase64: string, filename: string): Promise<AIParseResult> {
        const startTime = Date.now();
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await this._doParse(documentBase64, filename);
                return {
                    ...result,
                    latency_ms: Date.now() - startTime,
                };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`[GeminiAdapter] parseInvoice attempt ${attempt + 1} failed:`, lastError.message);

                if (attempt < MAX_RETRIES && lastError.message.includes('timed out')) {
                    continue;
                }
                break;
            }
        }

        throw new Error(
            `[GeminiAdapter] parseInvoice failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`
        );
    }

    /**
     * Map parsed invoice data to a Zoho PO payload.
     * Retries once on timeout.
     */
    async mapToZohoPayload(
        parsedInvoice: ParsedInvoice,
        userContext: UserContext,
        gstCalculation: GSTCalculation
    ): Promise<AIMiddlewareResponse> {
        const startTime = Date.now();
        let lastError: Error | null = null;

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const result = await this._doMap(parsedInvoice, userContext, gstCalculation);
                return {
                    ...result,
                    latency_ms: Date.now() - startTime,
                };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                console.warn(`[GeminiAdapter] mapToZohoPayload attempt ${attempt + 1} failed:`, lastError.message);

                if (attempt < MAX_RETRIES && lastError.message.includes('timed out')) {
                    continue;
                }
                break;
            }
        }

        throw new Error(
            `[GeminiAdapter] mapToZohoPayload failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`
        );
    }

    // ============================================
    // INTERNAL API CALLS
    // ============================================

    private async _doParse(
        documentBase64: string,
        filename: string
    ): Promise<Omit<AIParseResult, 'latency_ms'>> {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const mimeType = this._inferMediaType(filename);

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: buildExtractionPrompt() },
                        {
                            text: `Parse this Proforma Invoice document (${filename}). Extract all fields and return valid JSON only.`,
                        },
                        {
                            inlineData: {
                                mimeType,
                                data: documentBase64,
                            },
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: this.config.temperature ?? 0.1,
                maxOutputTokens: this.config.maxTokens || 4096,
                responseMimeType: 'application/json',
            },
        };

        const response = await fetchWithTimeout(
            getApiUrl(this.model),
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            },
            this.config.timeoutMs || PARSE_TIMEOUT_MS
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[GeminiAdapter] API error:', response.status, errorText);
            throw new Error(`Gemini API error: ${response.status} — ${errorText}`);
        }

        const data = await response.json();

        // Extract text from Gemini response structure
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
            throw new Error('Empty response from Gemini API');
        }

        const jsonStr = extractJSON(content);
        let parsed: unknown;
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            throw new Error(`Failed to parse JSON from Gemini response: ${content.substring(0, 200)}`);
        }

        const validation = ParsedInvoiceSchema.safeParse(parsed);
        if (!validation.success) {
            throw new Error(`Invalid invoice schema: ${validation.error.message}`);
        }

        return {
            parsed_invoice: validation.data as ParsedInvoice,
            raw_response: content,
            model_used: this.model,
            latency_ms: 0,
        };
    }

    private async _doMap(
        parsedInvoice: ParsedInvoice,
        userContext: UserContext,
        gstCalculation: GSTCalculation
    ): Promise<Omit<AIMiddlewareResponse, 'latency_ms'>> {
        const apiKey = getApiKey();
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY not configured');
        }

        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: buildMappingPrompt(parsedInvoice, userContext, gstCalculation) },
                        {
                            text: 'Convert this parsed invoice to a Zoho Purchase Order payload. Return valid JSON only.',
                        },
                    ],
                },
            ],
            generationConfig: {
                temperature: this.config.temperature ?? 0.1,
                maxOutputTokens: this.config.maxTokens || 4096,
                responseMimeType: 'application/json',
            },
        };

        const response = await fetchWithTimeout(
            getApiUrl(this.model),
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            },
            this.config.timeoutMs || MAP_TIMEOUT_MS
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[GeminiAdapter] API error:', response.status, errorText);
            throw new Error(`Gemini API error: ${response.status} — ${errorText}`);
        }

        const data = await response.json();

        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
            throw new Error('Empty response from Gemini API during mapping');
        }

        const jsonStr = extractJSON(content);
        let parsed: unknown;
        try {
            parsed = JSON.parse(jsonStr);
        } catch {
            throw new Error(`Failed to parse JSON from Gemini mapping response: ${content.substring(0, 200)}`);
        }

        const obj = parsed as Record<string, unknown>;

        return {
            zoho_payload: obj.zoho_payload as AIMiddlewareResponse['zoho_payload'],
            processing_notes: Array.isArray(obj.processing_notes)
                ? obj.processing_notes.map(String)
                : [],
            confidence: typeof obj.confidence === 'number' ? obj.confidence : parsedInvoice.confidence,
            model_used: this.model,
            latency_ms: 0,
        };
    }

    // ============================================
    // HELPERS
    // ============================================

    /**
     * Infer the MIME media type from the filename extension.
     */
    private _inferMediaType(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const types: Record<string, string> = {
            pdf: 'application/pdf',
            png: 'image/png',
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            gif: 'image/gif',
            webp: 'image/webp',
            tiff: 'image/tiff',
            tif: 'image/tiff',
            bmp: 'image/bmp',
        };
        return types[ext] || 'image/jpeg';
    }
}
