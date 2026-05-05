/**
 * AI Middleware — Model-Agnostic Orchestration Layer
 *
 * Purpose: Route invoice parsing and Zoho PO mapping to the appropriate AI model adapter.
 * - Selects model based on config → env var → default (claude)
 * - Imports adapters dynamically based on provider selection
 * - Provides a unified interface regardless of the underlying model
 */

import {
    AIModelConfig,
    AIModelProvider,
    AIParseResult,
    AIMiddlewareResponse,
    ParsedInvoice,
    UserContext,
    GSTCalculation,
    ModelAdapter,
} from './types';

// ============================================
// ADAPTER IMPORTS (static for type safety)
// ============================================

import { ClaudeAdapter } from './adapters/claude-adapter';
import { OpenAIAdapter } from './adapters/openai-adapter';
import { GeminiAdapter } from './adapters/gemini-adapter';
import { GroqAdapter } from './adapters/groq-adapter';

// ============================================
// DEFAULT CONFIGURATION
// ============================================

/** Default AI model provider when none is specified */
const DEFAULT_PROVIDER: AIModelProvider = 'claude';

/** Default model configuration */
const DEFAULT_CONFIG: AIModelConfig = {
    provider: DEFAULT_PROVIDER,
    temperature: 0.1,
    maxTokens: 4096,
    timeoutMs: 15000,
};

// ============================================
// MODEL ADAPTER FACTORY
// ============================================

/**
 * Get the appropriate model adapter for the given configuration.
 * Validates the provider and returns a fully initialized adapter.
 */
export function getModelAdapter(config: AIModelConfig): ModelAdapter {
    const provider = config.provider;

    switch (provider) {
        case 'claude':
            return new ClaudeAdapter(config);
        case 'openai':
            return new OpenAIAdapter(config);
        case 'gemini':
            return new GeminiAdapter(config);
        case 'groq':
            return new GroqAdapter(config);
        default:
            // Exhaustiveness check — if we reach here, the provider is invalid
            console.warn(`[AIMiddleware] Unknown provider "${provider}", falling back to claude`);
            return new ClaudeAdapter({ ...config, provider: 'claude' });
    }
}

/**
 * Get the default model adapter using the fallback chain:
 * 1. process.env.AI_MODEL_PROVIDER
 * 2. Default to 'claude'
 */
export function getDefaultAdapter(): ModelAdapter {
    const envProvider = process.env.AI_MODEL_PROVIDER as AIModelProvider | undefined;

    // Validate that the env provider is a known provider
    const validProviders: AIModelProvider[] = ['claude', 'openai', 'gemini', 'groq'];
    const provider = envProvider && validProviders.includes(envProvider)
        ? envProvider
        : DEFAULT_PROVIDER;

    if (envProvider && !validProviders.includes(envProvider)) {
        console.warn(`[AIMiddleware] Invalid AI_MODEL_PROVIDER "${envProvider}", using default "${DEFAULT_PROVIDER}"`);
    }

    const config: AIModelConfig = {
        ...DEFAULT_CONFIG,
        provider,
    };

    console.log(`[AIMiddleware] Using default adapter: provider=${provider}`);
    return getModelAdapter(config);
}

// ============================================
// CONVENIENCE WRAPPERS
// ============================================

/**
 * Parse an invoice document using the specified or default model adapter.
 * This is a convenience wrapper that handles model selection and delegates to the adapter.
 */
export async function parseInvoiceWithAdapter(
    documentBase64: string,
    filename: string,
    config?: AIModelConfig
): Promise<AIParseResult> {
    const adapter = config ? getModelAdapter(config) : getDefaultAdapter();
    return adapter.parseInvoice(documentBase64, filename);
}

/**
 * Map a parsed invoice to a Zoho PO payload using the specified or default model adapter.
 * This is a convenience wrapper that handles model selection and delegates to the adapter.
 */
export async function mapToZohoPayloadWithAdapter(
    parsedInvoice: ParsedInvoice,
    userContext: UserContext,
    gstCalculation: GSTCalculation,
    config?: AIModelConfig
): Promise<AIMiddlewareResponse> {
    const adapter = config ? getModelAdapter(config) : getDefaultAdapter();
    return adapter.mapToZohoPayload(parsedInvoice, userContext, gstCalculation);
}

// ============================================
// FULL PIPELINE (PARSE + MAP)
// ============================================

/**
 * Execute the full AI pipeline: parse document → map to Zoho PO payload.
 * This orchestrates both steps with the same adapter for consistency.
 */
export async function executeFullPipeline(
    documentBase64: string,
    filename: string,
    userContext: UserContext,
    gstCalculation: GSTCalculation,
    config?: AIModelConfig
): Promise<{
    parseResult: AIParseResult;
    mapResult: AIMiddlewareResponse;
    totalLatencyMs: number;
}> {
    const startTime = Date.now();
    const adapter = config ? getModelAdapter(config) : getDefaultAdapter();

    console.log(`[AIMiddleware] Starting full pipeline for "${filename}" with adapter`);

    // Step 1: Parse the invoice document
    const parseResult = await adapter.parseInvoice(documentBase64, filename);
    console.log(`[AIMiddleware] Parse complete: confidence=${parseResult.parsed_invoice.confidence}, model=${parseResult.model_used}, latency=${parseResult.latency_ms}ms`);

    // Step 2: Map to Zoho PO payload
    const mapResult = await adapter.mapToZohoPayload(
        parseResult.parsed_invoice,
        userContext,
        gstCalculation
    );
    console.log(`[AIMiddleware] Map complete: confidence=${mapResult.confidence}, model=${mapResult.model_used}, latency=${mapResult.latency_ms}ms`);

    const totalLatencyMs = Date.now() - startTime;
    console.log(`[AIMiddleware] Full pipeline complete in ${totalLatencyMs}ms`);

    return {
        parseResult,
        mapResult,
        totalLatencyMs,
    };
}
