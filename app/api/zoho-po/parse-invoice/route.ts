/**
 * POST /api/zoho-po/parse-invoice
 *
 * Handles invoice document upload (PDF/JPG/PNG, max 10MB),
 * converts to base64, and parses into structured invoice data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/frontend/utils/supabase/server';
import { createAdminClient } from '@/frontend/utils/supabase/admin';
import { parseInvoiceDocument } from '@/backend/lib/zoho-po/document-parser';
import type { ParsedInvoice, AIModelProvider } from '@/backend/lib/zoho-po/types';

// Allowed MIME types for upload
const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
];

// Allowed file extensions (secondary check)
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

/**
 * Validate file type by MIME type and/or extension
 */
function isValidFileType(file: File): boolean {
    if (ALLOWED_TYPES.includes(file.type)) {
        return true;
    }
    // Fallback: check extension
    const name = file.name.toLowerCase();
    return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Extract file extension from filename
 */
function getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : '';
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // ── 1. Authenticate user ──────────────────────────────────────
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('[ParseInvoice] Auth failed:', authError);
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // ── 2. Parse multipart form data ──────────────────────────────
        let formData: FormData;
        try {
            formData = await request.formData();
        } catch {
            return NextResponse.json(
                { success: false, error: 'Invalid multipart form data' },
                { status: 400 }
            );
        }

        const file = formData.get('file') as File | null;
        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided. Expected form field "file".' },
                { status: 400 }
            );
        }

        const modelProvider = (formData.get('modelProvider') as string) || undefined;

        // ── 3. Validate file ──────────────────────────────────────────
        // Check file size (max 10MB default)
        const MAX_SIZE = parseInt(
            process.env.ZOHO_PO_MAX_FILE_SIZE || '10485760',
            10
        ); // 10MB in bytes
        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                {
                    success: false,
                    error: `File exceeds size limit of ${(MAX_SIZE / 1024 / 1024).toFixed(1)}MB`,
                },
                { status: 400 }
            );
        }

        // Check file type
        if (!isValidFileType(file)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Unsupported file type "${file.type}". Allowed: PDF, JPG, JPEG, PNG, WEBP.`,
                },
                { status: 400 }
            );
        }

        if (file.name.trim().length === 0) {
            return NextResponse.json(
                { success: false, error: 'Filename is required' },
                { status: 400 }
            );
        }

        // ── 4. Convert file to base64 ─────────────────────────────────
        let base64: string;
        try {
            const bytes = await file.arrayBuffer();
            base64 = Buffer.from(bytes).toString('base64');
        } catch (err) {
            console.error('[ParseInvoice] Failed to read file:', err);
            return NextResponse.json(
                { success: false, error: 'Failed to read uploaded file' },
                { status: 400 }
            );
        }

        // ── 5. Call document parser ───────────────────────────────────
        let parsed: ParsedInvoice;
        let modelUsed = modelProvider || process.env.AI_MODEL_PROVIDER || 'claude';
        const parseStart = Date.now();

        try {
            const modelConfig = modelProvider
                ? { provider: modelProvider as AIModelProvider }
                : undefined;

            parsed = await parseInvoiceDocument(base64, file.name, modelConfig);
            modelUsed = parsed.confidence ? modelUsed : modelUsed; // track model
        } catch (parseErr) {
            const errorMessage =
                parseErr instanceof Error ? parseErr.message : 'Unknown parsing error';

            // Log failed parse to audit log (best-effort)
            try {
                const adminSupabase = createAdminClient();
                await adminSupabase.from('zoho_po_audit_log').insert({
                    invoice_filename: file.name,
                    created_by: user.id,
                    status: 'error',
                    error_message: errorMessage,
                    ai_model_used: modelUsed,
                    processing_time_ms: Date.now() - parseStart,
                });
            } catch (logErr) {
                console.error('[ParseInvoice] Failed to log error:', logErr);
            }

            // Check if this was a confidence error
            const isConfidenceError = errorMessage.toLowerCase().includes('confidence');

            return NextResponse.json(
                {
                    success: false,
                    error: errorMessage,
                    confidence_too_low: isConfidenceError,
                },
                { status: isConfidenceError ? 422 : 500 }
            );
        }

        const processingTimeMs = Date.now() - startTime;

        // ── 6. Check confidence ───────────────────────────────────────
        const confidenceThreshold = parseFloat(
            process.env.ZOHO_PO_MIN_CONFIDENCE || '0.8'
        );
        const confidenceTooLow = parsed.confidence < confidenceThreshold;

        // ── 7. Log to audit log ───────────────────────────────────────
        try {
            const adminSupabase = createAdminClient();
            await adminSupabase.from('zoho_po_audit_log').insert({
                invoice_filename: file.name,
                vendor_name: parsed.vendor_name,
                invoice_number: parsed.invoice_number,
                invoice_date: parsed.invoice_date,
                invoice_amount: parsed.total_amount,
                created_by: user.id,
                status: confidenceTooLow ? 'parsed_low_confidence' : 'parsed',
                ai_model_used: modelUsed,
                confidence_score: parsed.confidence,
                processing_time_ms: processingTimeMs,
            });
        } catch (logErr) {
            // Log error but don't fail the request
            console.error('[ParseInvoice] Audit log insert failed:', logErr);
        }

        // ── 8. Return parsed invoice data ─────────────────────────────
        return NextResponse.json(
            {
                success: true,
                parsed_invoice: parsed,
                processing_time_ms: processingTimeMs,
                model_used: modelUsed,
                confidence_too_low: confidenceTooLow,
            },
            { status: confidenceTooLow ? 422 : 200 }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        console.error('[ParseInvoice] Unexpected error:', error);
        return NextResponse.json(
            { success: false, error: message },
            { status: 500 }
        );
    }
}
