'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Scan, AlertCircle, Loader2, Camera, ImagePlus, Keyboard, CheckCircle2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface BarcodeScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onScanSuccess: (barcode: string, format: string) => void;
    title?: string;
}

type ScanMode = 'camera' | 'gallery' | 'manual';

export default function BarcodeScannerModal({
    isOpen,
    onClose,
    onScanSuccess,
    title = 'Scan Barcode'
}: BarcodeScannerModalProps) {
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualInput, setManualInput] = useState('');
    const [scanMode, setScanMode] = useState<ScanMode>('camera');
    const [cameraActive, setCameraActive] = useState(false);
    const [galleryProcessing, setGalleryProcessing] = useState(false);
    const [galleryPreview, setGalleryPreview] = useState<string | null>(null);

    const SCANNER_ID = 'barcode-scanner-region';

    const stopCamera = useCallback(async () => {
        if (html5QrCodeRef.current && cameraActive) {
            try {
                // Check if it's actually scanning before trying to stop
                // This prevents the "Cannot stop, scanner is not running or paused" error
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
                setCameraActive(false);
            } catch (err: any) {
                // If the error indicates it's already stopped, just update state
                if (err?.message?.includes('not running') || err?.includes?.('not running')) {
                    setCameraActive(false);
                } else {
                    console.error('Error stopping camera:', err);
                }
            }
        }
    }, [cameraActive]);

    const handleClose = useCallback(async () => {
        await stopCamera();
        if (html5QrCodeRef.current) {
            try {
                html5QrCodeRef.current.clear();
            } catch (e) { /* ignore */ }
            html5QrCodeRef.current = null;
        }
        setError(null);
        setManualInput('');
        setScanMode('camera');
        setGalleryPreview(null);
        setGalleryProcessing(false);
        onClose();
    }, [stopCamera, onClose]);

    // Initialize the Html5Qrcode instance
    useEffect(() => {
        if (!isOpen) return;

        // Small delay to let the DOM element render
        const timer = setTimeout(() => {
            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode(SCANNER_ID);
            }
            if (scanMode === 'camera') {
                startCamera();
            }
        }, 100);

        return () => {
            clearTimeout(timer);
        };
    }, [isOpen]);

    // Handle mode switches
    useEffect(() => {
        if (!isOpen || !html5QrCodeRef.current) return;

        if (scanMode === 'camera') {
            startCamera();
        } else {
            stopCamera();
        }
    }, [scanMode]);

    const startCamera = async () => {
        if (!html5QrCodeRef.current || cameraActive) return;

        try {
            setLoading(true);
            setError(null);

            await html5QrCodeRef.current.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 150 },
                    aspectRatio: 1.5,
                },
                (decodedText) => {
                    const barcode = decodedText.trim();
                    if (barcode) {
                        onScanSuccess(barcode, 'CAMERA');
                        handleClose();
                    }
                },
                () => { /* scan errors are normal */ }
            );

            setCameraActive(true);
            setLoading(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('Camera start error:', msg);

            if (msg.includes('permission') || msg.includes('NotAllowedError') || msg.includes('NotFoundError')) {
                setError('Camera access denied. Please allow camera permission or use Gallery/Manual entry.');
            } else {
                setError(msg);
            }
            setLoading(false);
        }
    };

    const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !html5QrCodeRef.current) return;

        setGalleryProcessing(true);
        setError(null);
        setGalleryPreview(null);

        try {
            // Options for image compression
            const options = {
                maxSizeMB: 1,
                maxWidthOrHeight: 1024,
                useWebWorker: true,
            };

            // Show initial preview of original file
            const reader = new FileReader();
            reader.onload = (ev) => setGalleryPreview(ev.target?.result as string);
            reader.readAsDataURL(file);

            // Compress image for better detection
            const compressedFile = await imageCompression(file, options);

            // Try scanning the compressed file
            try {
                const result = await html5QrCodeRef.current.scanFile(compressedFile, true);
                const barcode = result.trim();
                if (barcode) {
                    onScanSuccess(barcode, 'GALLERY');
                    handleClose();
                }
            } catch (err) {
                // If compressed scan fails, try original as fallback
                console.log('Compressed scan failed, trying original...');
                const result = await html5QrCodeRef.current.scanFile(file, true);
                const barcode = result.trim();
                if (barcode) {
                    onScanSuccess(barcode, 'GALLERY');
                    handleClose();
                } else {
                    throw new Error('No barcode detected');
                }
            }
        } catch (err) {
            console.error('Gallery scan error:', err);
            setError('No barcode found in the image. Try a clearer photo or enter manually.');
            setGalleryProcessing(false);
        }

        // Reset file input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleManualSubmit = () => {
        if (manualInput.trim()) {
            onScanSuccess(manualInput.trim(), 'MANUAL');
            handleClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Scan size={18} className="text-blue-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Mode Tabs */}
                <div className="flex gap-1 p-2 mx-4 mt-3 bg-gray-100 rounded-xl">
                    <button
                        onClick={() => { setError(null); setGalleryPreview(null); setScanMode('camera'); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${scanMode === 'camera'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Camera size={14} />
                        Camera
                    </button>
                    <button
                        onClick={() => { stopCamera(); setError(null); setGalleryPreview(null); setScanMode('gallery'); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${scanMode === 'gallery'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <ImagePlus size={14} />
                        Gallery
                    </button>
                    <button
                        onClick={() => { stopCamera(); setError(null); setGalleryPreview(null); setScanMode('manual'); }}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${scanMode === 'manual'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Keyboard size={14} />
                        Manual
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">

                    {/* Error Banner */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2.5">
                            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Camera Mode */}
                    {scanMode === 'camera' && (
                        <div>
                            {loading && (
                                <div className="flex items-center justify-center h-52 bg-gray-50 rounded-xl">
                                    <div className="text-center">
                                        <Loader2 size={28} className="animate-spin text-blue-500 mx-auto mb-2" />
                                        <p className="text-gray-400 text-sm">Starting camera...</p>
                                    </div>
                                </div>
                            )}
                            <div
                                id={SCANNER_ID}
                                className="rounded-xl overflow-hidden"
                                style={{ display: loading ? 'none' : 'block' }}
                            />
                            <p className="text-center text-xs text-gray-400 mt-3">
                                Point your camera at a barcode or QR code
                            </p>
                        </div>
                    )}

                    {/* Gallery Mode */}
                    {scanMode === 'gallery' && (
                        <div className="space-y-4">
                            {/* Hidden scanner region needed for file scanning */}
                            <div id={SCANNER_ID} style={{ display: 'none' }} />

                            {/* Upload Area */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-8 flex flex-col items-center gap-3 transition-colors cursor-pointer hover:bg-blue-50/30"
                            >
                                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
                                    <ImagePlus size={28} className="text-blue-600" />
                                </div>
                                <div className="text-center">
                                    <p className="font-semibold text-gray-700 text-sm">Upload from Gallery</p>
                                    <p className="text-xs text-gray-400 mt-1">Choose a photo with a barcode or QR code</p>
                                </div>
                            </button>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleGallerySelect}
                                className="hidden"
                            />

                            {/* Gallery Preview */}
                            {galleryPreview && (
                                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                                    <img
                                        src={galleryPreview}
                                        alt="Selected barcode image"
                                        className="w-full max-h-48 object-contain bg-gray-50"
                                    />
                                    {galleryProcessing && (
                                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <div className="text-center px-4">
                                                <Loader2 size={24} className="animate-spin text-blue-500 mx-auto mb-2" />
                                                <p className="text-xs text-gray-700 font-bold mb-1">Optimizing & Scanning</p>
                                                <p className="text-[10px] text-gray-500">Detecting barcode patterns...</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual Mode */}
                    {scanMode === 'manual' && (
                        <div className="space-y-4">
                            {/* Hidden scanner region */}
                            <div id={SCANNER_ID} style={{ display: 'none' }} />

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Enter Barcode Manually
                                </label>
                                <input
                                    type="text"
                                    value={manualInput}
                                    onChange={(e) => setManualInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleManualSubmit();
                                    }}
                                    placeholder="Type or scan barcode number..."
                                    autoFocus
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder-gray-400"
                                />
                            </div>

                            <button
                                onClick={handleManualSubmit}
                                disabled={!manualInput.trim()}
                                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
                            >
                                Confirm Barcode
                            </button>

                            <div className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
                                <p className="font-semibold mb-1 text-gray-500">Supported formats:</p>
                                <p>QR Code, CODE128, EAN-13/8, UPC-A/E, CODE39</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 p-4">
                    <button
                        onClick={handleClose}
                        className="w-full px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
