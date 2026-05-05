'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ParsedInvoice, UserContext, POCreationResponse, ConfirmedLineItem } from '@/frontend/types/zoho-po';

interface POFlowState {
    parsedInvoice: ParsedInvoice | null;
    userContext: Partial<UserContext>;
    currentStep: number;
    orgId: string;
    isSubmitting: boolean;
    result: POCreationResponse | null;
    error: string | null;
    isUploading: boolean;
    uploadError: string | null;
    isParsing: boolean;
}

interface POFlowContextType extends POFlowState {
    setParsedInvoice: (invoice: ParsedInvoice | null) => void;
    setUserContext: (ctx: Partial<UserContext> | ((prev: Partial<UserContext>) => Partial<UserContext>)) => void;
    setCurrentStep: (step: number) => void;
    setOrgId: (orgId: string) => void;
    setIsSubmitting: (submitting: boolean) => void;
    setResult: (result: POCreationResponse | null) => void;
    setError: (error: string | null) => void;
    setIsUploading: (uploading: boolean) => void;
    setUploadError: (error: string | null) => void;
    setIsParsing: (parsing: boolean) => void;
    resetFlow: () => void;
    uploadAndParseInvoice: (file: File) => Promise<ParsedInvoice | null>;
    submitPO: () => Promise<POCreationResponse | null>;
}

const initialState: POFlowState = {
    parsedInvoice: null,
    userContext: {
        city: '',
        gstin: '',
        vendor_type: 'empanelled',
        confirmed_line_items: [],
        notes: '',
    },
    currentStep: 0,
    orgId: '',
    isSubmitting: false,
    result: null,
    error: null,
    isUploading: false,
    uploadError: null,
    isParsing: false,
};

const POFlowContext = createContext<POFlowContextType | undefined>(undefined);

export function POFlowProvider({ children, initialOrgId = '' }: { children: React.ReactNode; initialOrgId?: string }) {
    const [state, setState] = useState<POFlowState>({
        ...initialState,
        orgId: initialOrgId,
    });

    const abortControllerRef = useRef<AbortController | null>(null);

    const setParsedInvoice = useCallback((invoice: ParsedInvoice | null) => {
        setState(prev => ({ ...prev, parsedInvoice: invoice }));
    }, []);

    const setUserContext = useCallback((ctx: Partial<UserContext> | ((prev: Partial<UserContext>) => Partial<UserContext>)) => {
        setState(prev => ({
            ...prev,
            userContext: typeof ctx === 'function' ? ctx(prev.userContext) : { ...prev.userContext, ...ctx },
        }));
    }, []);

    const setCurrentStep = useCallback((step: number) => {
        setState(prev => ({ ...prev, currentStep: step }));
    }, []);

    const setOrgId = useCallback((orgId: string) => {
        setState(prev => ({ ...prev, orgId }));
    }, []);

    const setIsSubmitting = useCallback((submitting: boolean) => {
        setState(prev => ({ ...prev, isSubmitting: submitting }));
    }, []);

    const setResult = useCallback((result: POCreationResponse | null) => {
        setState(prev => ({ ...prev, result }));
    }, []);

    const setError = useCallback((error: string | null) => {
        setState(prev => ({ ...prev, error }));
    }, []);

    const setIsUploading = useCallback((uploading: boolean) => {
        setState(prev => ({ ...prev, isUploading: uploading }));
    }, []);

    const setUploadError = useCallback((error: string | null) => {
        setState(prev => ({ ...prev, uploadError: error }));
    }, []);

    const setIsParsing = useCallback((parsing: boolean) => {
        setState(prev => ({ ...prev, isParsing: parsing }));
    }, []);

    const resetFlow = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setState({
            ...initialState,
            orgId: state.orgId,
        });
    }, [state.orgId]);

    const uploadAndParseInvoice = useCallback(async (file: File): Promise<ParsedInvoice | null> => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setState(prev => ({ ...prev, isUploading: true, isParsing: true, uploadError: null, error: null }));

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/zoho-po/parse-invoice', {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success || !data.parsed_invoice) {
                throw new Error(data.error || 'Failed to parse invoice');
            }

            const parsedInvoice: ParsedInvoice = data.parsed_invoice;

            // Auto-populate confirmed line items from parsed invoice
            const confirmedItems: ConfirmedLineItem[] = parsedInvoice.line_items.map(item => ({
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate,
                tax_amount: item.tax_amount,
                total_price: item.total_price,
                hsn_code: item.hsn_code,
            }));

            setState(prev => ({
                ...prev,
                parsedInvoice,
                isUploading: false,
                isParsing: false,
                userContext: {
                    ...prev.userContext,
                    confirmed_line_items: confirmedItems,
                },
            }));

            return parsedInvoice;
        } catch (err: any) {
            if (err.name === 'AbortError') {
                return null;
            }
            const message = err.message || 'An unexpected error occurred during upload';
            setState(prev => ({
                ...prev,
                isUploading: false,
                isParsing: false,
                uploadError: message,
            }));
            return null;
        }
    }, []);

    const submitPO = useCallback(async (): Promise<POCreationResponse | null> => {
        setState(prev => ({ ...prev, isSubmitting: true, error: null }));

        try {
            const { parsedInvoice, userContext } = state;

            if (!parsedInvoice) {
                throw new Error('No parsed invoice data');
            }

            const response = await fetch('/api/zoho-po/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    parsed_invoice: parsedInvoice,
                    user_context: userContext,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `PO creation failed: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to create purchase order');
            }

            setState(prev => ({
                ...prev,
                isSubmitting: false,
                result: data as POCreationResponse,
            }));

            return data as POCreationResponse;
        } catch (err: any) {
            const message = err.message || 'An unexpected error occurred';
            setState(prev => ({
                ...prev,
                isSubmitting: false,
                error: message,
            }));
            return null;
        }
    }, [state.parsedInvoice, state.userContext]);

    const value: POFlowContextType = {
        ...state,
        setParsedInvoice,
        setUserContext,
        setCurrentStep,
        setOrgId,
        setIsSubmitting,
        setResult,
        setError,
        setIsUploading,
        setUploadError,
        setIsParsing,
        resetFlow,
        uploadAndParseInvoice,
        submitPO,
    };

    return (
        <POFlowContext.Provider value={value}>
            {children}
        </POFlowContext.Provider>
    );
}

export function usePOFlow() {
    const context = useContext(POFlowContext);
    if (context === undefined) {
        throw new Error('usePOFlow must be used within a POFlowProvider');
    }
    return context;
}
