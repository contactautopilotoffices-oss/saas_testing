'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeResult } from 'html5-qrcode';
import { X, Scan, AlertCircle, Loader2 } from 'lucide-react';

interface BarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (barcode: string, format: string) => void;
    title?: string;
}

export default function BarcodeScannerModal({
    isOpen,
    onClose,
    onScanSuccess,
    title = 'Scan Barcode'
}: BarcodeScannerModalProps) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [manualInput, setManualInput] = useState('');
    const [showManualFallback, setShowManualFallback] = useState(false);
    const [cameraPermissionError, setCameraPermissionError] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        const initializeScanner = async () => {
            try {
                setLoading(true);
                setError(null);
                setCameraPermissionError(false);

                const scanner = new Html5QrcodeScanner(
                    'barcode-scanner-container',
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 }
                    },
                    false
                );

                scannerRef.current = scanner;

                // On successful scan
                scanner.render(
                    (decodedText: string) => {
                        // Extract barcode from different formats
                        const barcode = decodedText.trim();
                        if (barcode) {
                            onScanSuccess(barcode, 'BARCODE');
                            handleClose();
                        }
                    },
                    (errorMessage: string) => {
                        // Silently handle scanning errors (common and expected)
                    }
                );

                setLoading(false);
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to access camera';
                console.error('Scanner initialization error:', errorMsg);

                // Check if it's a permission error
                if (errorMsg.includes('permission') || errorMsg.includes('NotAllowedError')) {
                    setCameraPermissionError(true);
                    setShowManualFallback(true);
                } else {
                    setError(errorMsg);
                    setShowManualFallback(true);
                }
                setLoading(false);
            }
        };

        initializeScanner();

        return () => {
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear();
                } catch (err) {
                    console.error('Error clearing scanner:', err);
                }
            }
        };
    }, [isOpen, onScanSuccess]);

    const handleClose = () => {
        if (scannerRef.current) {
            try {
                scannerRef.current.clear();
            } catch (err) {
                console.error('Error clearing scanner:', err);
            }
        }
        onClose();
    };

    const handleManualSubmit = () => {
        if (manualInput.trim()) {
            onScanSuccess(manualInput.trim(), 'MANUAL');
            handleClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            {/* Modal Container */}
            <div className="bg-white rounded-lg shadow-lg w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border-primary bg-gradient-to-r from-accent-primary/10 to-transparent">
                    <div className="flex items-center gap-2">
                        <Scan size={24} className="text-accent-primary" />
                        <h2 className="text-xl font-bold text-text-primary">{title}</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1 hover:bg-bg-secondary rounded-lg transition-colors"
                    >
                        <X size={24} className="text-text-secondary" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
                    {/* Scanner Container */}
                    {!showManualFallback && (
                        <div>
                            {loading && (
                                <div className="flex items-center justify-center h-64 bg-bg-secondary rounded-lg">
                                    <div className="text-center">
                                        <Loader2 size={32} className="animate-spin text-accent-primary mx-auto mb-2" />
                                        <p className="text-text-secondary text-sm">Initializing camera...</p>
                                    </div>
                                </div>
                            )}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                                    <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-semibold text-red-900">Scanner Error</p>
                                        <p className="text-red-700">{error}</p>
                                    </div>
                                </div>
                            )}
                            <div
                                id="barcode-scanner-container"
                                className="rounded-lg overflow-hidden"
                                style={{ display: loading ? 'none' : 'block' }}
                            />
                        </div>
                    )}

                    {/* Manual Entry Fallback */}
                    {showManualFallback && (
                        <div className="space-y-4">
                            {cameraPermissionError && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                                    <AlertCircle size={20} className="text-yellow-600 flex-shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-semibold text-yellow-900">Camera Permission Denied</p>
                                        <p className="text-yellow-700">
                                            Please enable camera access in your browser settings to use the scanner.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-text-primary mb-2">
                                    Enter Barcode Manually
                                </label>
                                <input
                                    type="text"
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleManualSubmit();
                                    }}
                                    placeholder="Scan or type barcode..."
                                    autoFocus
                                    className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:ring-2 focus:ring-accent-primary outline-none"
                                />
                            </div>

                            <div className="text-sm text-text-secondary">
                                <p className="mb-2">Supported formats:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>QR Code</li>
                                    <li>CODE128</li>
                                    <li>EAN-13 / EAN-8</li>
                                    <li>UPC-A / UPC-E</li>
                                    <li>CODE39</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-border-primary p-6 bg-bg-secondary flex gap-3">
                    {showManualFallback && manualInput && (
                        <button
                            onClick={handleManualSubmit}
                            className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg font-semibold hover:bg-accent-primary/90 transition-colors"
                        >
                            Confirm
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg font-semibold hover:bg-border-primary transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
