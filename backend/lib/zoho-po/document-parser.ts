/**
 * Document Parser — Invoice Document Processing Pipeline
 *
 * Purpose: Parse base64-encoded invoice documents into structured invoice data.
 * - Validates output with Zod schemas
 * - Enforces minimum confidence threshold
 * - Delegates AI extraction to the model adapter via ai-middleware
 */

import { z } from 'zod';
import {
    ParsedInvoice,
    ParsedLineItem,
    AIModelConfig,
    AIParseResult,
} from './types';
import { getDefaultAdapter, getModelAdapter } from './ai-middleware';

// ============================================
// CONFIGURATION
// ============================================

/** Minimum confidence threshold for accepting parsed results (default 0.8) */
const MIN_CONFIDENCE = parseFloat(process.env.ZOHO_PO_MIN_CONFIDENCE || '0.8');

// ============================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================

/** Zod schema for a single line item */
const ParsedLineItemSchema = z.object({
    description: z.string().min(1, 'Line item description is required'),
    quantity: z.number().positive('Quantity must be positive'),
    unit: z.string().min(1, 'Unit is required'),
    unit_price: z.number().nonnegative('Unit price must be non-negative'),
    total_price: z.number().nonnegative('Total price must be non-negative'),
    tax_rate: z.number().optional(),
    tax_amount: z.number().optional(),
    hsn_code: z.string().optional(),
});

/** Zod schema for the full parsed invoice */
const ParsedInvoiceSchema = z.object({
    vendor_name: z.string().min(1, 'Vendor name is required'),
    vendor_gstin: z
        .string()
        .length(15, 'GSTIN must be 15 characters')
        .regex(/^[0-9A-Z]{15}$/, 'Invalid GSTIN format')
        .optional()
        .or(z.literal('')),
    vendor_address: z.string().optional(),
    invoice_number: z.string().min(1, 'Invoice number is required'),
    invoice_date: z.string().min(1, 'Invoice date is required'),
    line_items: z
        .array(ParsedLineItemSchema)
        .min(1, 'At least one line item is required'),
    subtotal: z.number().nonnegative('Subtotal must be non-negative'),
    tax_amount: z.number().nonnegative('Tax amount must be non-negative'),
    total_amount: z.number().positive('Total amount must be positive'),
    currency: z.string().default('INR'),
    confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
});

// ============================================
// MAIN PARSING FUNCTION
// ============================================

/**
 * Parse a base64-encoded invoice document into structured invoice data.
 *
 * @param documentBase64 — Base64-encoded document content (PDF or image)
 * @param filename — Original filename with extension (used for MIME type detection)
 * @param modelConfig — Optional AI model configuration (uses default adapter if not provided)
 * @returns ParsedInvoice with validated structure
 * @throws Error if parsing fails or confidence is below threshold
 */
export async function parseInvoiceDocument(
    documentBase64: string,
    filename: string,
    modelConfig?: AIModelConfig
): Promise<ParsedInvoice> {
    console.log(`[DocumentParser] Starting parse for "${filename}" (base64 length: ${documentBase64.length})`);

    // Validate inputs
    if (!documentBase64 || documentBase64.trim().length === 0) {
        throw new Error('Document base64 content is empty');
    }
    if (!filename || filename.trim().length === 0) {
        throw new Error('Filename is required');
    }

    // Get the appropriate model adapter
    const adapter = modelConfig ? getModelAdapter(modelConfig) : getDefaultAdapter();

    // Call the adapter to parse the document
    let parseResult: AIParseResult;
    try {
        parseResult = await adapter.parseInvoice(documentBase64, filename);
    } catch (error) {
        console.error('[DocumentParser] Adapter parseInvoice failed:', error);
        throw new Error(
            `Invoice parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }

    // Validate the parsed output with Zod schema
    let validatedInvoice: ParsedInvoice;
    try {
        validatedInvoice = validateParsedInvoice(parseResult.parsed_invoice);
    } catch (error) {
        console.error('[DocumentParser] Validation failed:', error);
        throw new Error(
            `Parsed invoice validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }

    // Calculate and check confidence score
    const confidenceScore = calculateConfidenceScore(validatedInvoice);
    console.log(`[DocumentParser] Parse complete: confidence=${confidenceScore.toFixed(3)}, threshold=${MIN_CONFIDENCE}`);

    if (confidenceScore < MIN_CONFIDENCE) {
        throw new Error(
            `Confidence score ${confidenceScore.toFixed(3)} is below minimum threshold ${MIN_CONFIDENCE}. ` +
            `Manual review required for document "${filename}".`
        );
    }

    // Attach the confidence from the AI model if available
    validatedInvoice.confidence = Math.min(confidenceScore, validatedInvoice.confidence);

    console.log(`[DocumentParser] Successfully parsed "${filename}" from ${parseResult.model_used} in ${parseResult.latency_ms}ms`);
    return validatedInvoice;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate unknown data against the ParsedInvoice Zod schema.
 * Performs strict validation and returns a typed ParsedInvoice.
 *
 * @param data — Unknown data to validate (typically from AI model response)
 * @returns Validated ParsedInvoice
 * @throws Error if validation fails with detailed message
 */
export function validateParsedInvoice(data: unknown): ParsedInvoice {
    const result = ParsedInvoiceSchema.safeParse(data);

    if (!result.success) {
        const issues = result.error.issues.map(
            (issue) => `${issue.path.join('.')}: ${issue.message}`
        );
        throw new Error(`Invoice validation failed:\n  - ${issues.join('\n  - ')}`);
    }

    // Clean up the result — ensure defaults are applied
    const invoice = result.data;

    // Ensure currency defaults to INR
    if (!invoice.currency) {
        invoice.currency = 'INR';
    }

    // Clean up empty strings to undefined for optional fields
    if (invoice.vendor_gstin === '') {
        delete invoice.vendor_gstin;
    }
    if (invoice.vendor_address === '') {
        delete invoice.vendor_address;
    }

    // Ensure all line items have required fields
    invoice.line_items = invoice.line_items.map((item, index) => {
        // Ensure total_price is consistent with quantity * unit_price
        const calculatedTotal = parseFloat((item.quantity * item.unit_price).toFixed(2));
        const itemTotal = item.total_price || calculatedTotal;

        return {
            ...item,
            total_price: itemTotal,
            // Ensure tax_rate defaults to 18% if not provided (standard GST)
            tax_rate: item.tax_rate ?? 18,
        };
    });

    return invoice as ParsedInvoice;
}

// ============================================
// CONFIDENCE SCORING
// ============================================

/**
 * Calculate a composite confidence score for a parsed invoice.
 * Factors in:
 * - AI model's stated confidence
 * - Completeness of required fields
 * - Data consistency (subtotal vs line items)
 * - Presence of GSTIN
 * - Valid date format
 *
 * @param parsed — The parsed invoice to evaluate
 * @returns Normalized confidence score between 0 and 1
 */
export function calculateConfidenceScore(parsed: ParsedInvoice): number {
    let score = parsed.confidence || 0.5;
    let factors = 0;
    let totalWeight = 0;

    // Factor 1: AI model confidence (weight: 0.4)
    totalWeight += 0.4;
    factors += (parsed.confidence || 0) * 0.4;

    // Factor 2: Required fields completeness (weight: 0.25)
    totalWeight += 0.25;
    const requiredFields = [
        parsed.vendor_name,
        parsed.invoice_number,
        parsed.invoice_date,
        parsed.subtotal,
        parsed.total_amount,
    ];
    const filledFields = requiredFields.filter((f) => f !== undefined && f !== null && f !== '').length;
    factors += (filledFields / requiredFields.length) * 0.25;

    // Factor 3: Line items consistency (weight: 0.2)
    totalWeight += 0.2;
    if (parsed.line_items.length > 0) {
        const calculatedSubtotal = parsed.line_items.reduce(
            (sum, item) => sum + (item.quantity * item.unit_price),
            0
        );
        const subtotalDiff = Math.abs(calculatedSubtotal - parsed.subtotal);
        const subtotalTolerance = parsed.subtotal * 0.05; // 5% tolerance
        if (subtotalDiff <= subtotalTolerance) {
            factors += 0.2;
        } else if (subtotalDiff <= subtotalTolerance * 2) {
            factors += 0.1;
        }
        // else: 0 points for subtotal inconsistency
    }

    // Factor 4: GSTIN presence and validity (weight: 0.1)
    totalWeight += 0.1;
    if (parsed.vendor_gstin && parsed.vendor_gstin.length === 15) {
        factors += 0.1;
    }

    // Factor 5: Date format validity (weight: 0.05)
    totalWeight += 0.05;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(parsed.invoice_date)) {
        factors += 0.05;
    }

    // Normalize the score
    const normalizedScore = totalWeight > 0 ? factors / totalWeight : score;

    // Blend with the AI's confidence (70% AI, 30% calculated)
    const finalScore = score * 0.7 + normalizedScore * 0.3;

    return Math.max(0, Math.min(1, parseFloat(finalScore.toFixed(3))));
}
