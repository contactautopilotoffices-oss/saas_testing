'use client';

import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Copy, Check } from 'lucide-react';

interface BarcodeDisplayProps {
    value: string;
    itemName: string;
    itemCode: string;
    format?: 'CODE128' | 'QR' | 'both';
    showValue?: boolean;
    width?: number;
    height?: number;
}

export default function BarcodeDisplay({
    value,
    itemName,
    itemCode,
    format = 'both',
    showValue = true,
    width = 2,
    height = 80
}: BarcodeDisplayProps) {
    const code128Ref = useRef<HTMLDivElement>(null);
    const qrRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    // Generate CODE128 barcode
    useEffect(() => {
        if ((format === 'CODE128' || format === 'both') && code128Ref.current && value) {
            try {
                JsBarcode(code128Ref.current, value, {
                    format: 'CODE128',
                    width: width,
                    height: height,
                    displayValue: false
                });
            } catch (err) {
                console.error('Error generating CODE128 barcode:', err);
            }
        }
    }, [value, format, width, height]);

    const handleDownloadBarcode = () => {
        if (code128Ref.current) {
            const svg = code128Ref.current.querySelector('svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx?.drawImage(img, 0, 0);

                    const link = document.createElement('a');
                    link.href = canvas.toDataURL('image/png');
                    link.download = `barcode-${itemCode}-${new Date().getTime()}.png`;
                    link.click();
                };

                img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
            }
        }
    };

    const handleDownloadQR = () => {
        if (qrRef.current) {
            const svg = qrRef.current.querySelector('svg');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();

                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx?.drawImage(img, 0, 0);

                    const link = document.createElement('a');
                    link.href = canvas.toDataURL('image/png');
                    link.download = `qrcode-${itemCode}-${new Date().getTime()}.png`;
                    link.click();
                };

                img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
            }
        }
    };

    const handlePrint = () => {
        const printWindow = window.open('', '', 'width=600,height=400');
        if (printWindow) {
            const code128HTML = code128Ref.current?.innerHTML || '';
            const qrHTML = qrRef.current?.innerHTML || '';

            printWindow.document.write(`
                <html>
                    <head>
                        <title>Barcode - ${itemName}</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                padding: 20px;
                                gap: 20px;
                            }
                            .item-info {
                                text-align: center;
                                margin-bottom: 20px;
                            }
                            .item-info h2 {
                                margin: 0;
                                font-size: 18px;
                            }
                            .item-info p {
                                margin: 5px 0;
                                color: #666;
                                font-size: 14px;
                            }
                            .barcode-section {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                gap: 10px;
                                margin: 20px 0;
                                page-break-inside: avoid;
                            }
                            .barcode-section label {
                                font-weight: bold;
                                font-size: 12px;
                                color: #333;
                            }
                            svg, canvas {
                                max-width: 100%;
                                height: auto;
                            }
                            @media print {
                                body {
                                    padding: 10px;
                                }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="item-info">
                            <h2>${itemName}</h2>
                            <p>Code: ${itemCode}</p>
                            <p>Barcode: ${value}</p>
                        </div>

                        ${format === 'CODE128' || format === 'both' ? `
                            <div class="barcode-section">
                                <label>CODE128 Barcode</label>
                                <div>${code128HTML}</div>
                            </div>
                        ` : ''}

                        ${format === 'QR' || format === 'both' ? `
                            <div class="barcode-section">
                                <label>QR Code</label>
                                <div>${qrHTML}</div>
                            </div>
                        ` : ''}
                    </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Item Information */}
            <div className="bg-bg-secondary rounded-lg p-4 border border-border-primary">
                <h3 className="font-semibold text-text-primary mb-2">{itemName}</h3>
                <p className="text-sm text-text-secondary mb-3">
                    <span className="font-semibold">Item Code:</span> {itemCode}
                </p>
                <p className="text-sm text-text-secondary">
                    <span className="font-semibold">Barcode:</span>
                    <span className="font-mono text-xs ml-2 break-all">{value}</span>
                </p>
            </div>

            {/* CODE128 Barcode */}
            {(format === 'CODE128' || format === 'both') && (
                <div className="space-y-3 border border-border-primary rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-text-primary text-sm">CODE128 Barcode</h4>
                        <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded">
                            Print Ready
                        </span>
                    </div>

                    {/* Barcode SVG Container */}
                    <div
                        ref={code128Ref}
                        className="flex justify-center py-4 bg-bg-secondary rounded-lg min-h-[120px] flex-col items-center"
                    >
                        {/* Will be filled by JsBarcode */}
                    </div>

                    {showValue && (
                        <p className="text-center text-xs font-mono text-text-secondary">{value}</p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadBarcode}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors text-sm font-semibold"
                        >
                            <Download size={16} />
                            Download
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-border-primary text-text-primary rounded-lg hover:bg-border-primary/80 transition-colors text-sm font-semibold"
                        >
                            <Printer size={16} />
                            Print
                        </button>
                    </div>
                </div>
            )}

            {/* QR Code */}
            {(format === 'QR' || format === 'both') && (
                <div className="space-y-3 border border-border-primary rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-text-primary text-sm">QR Code</h4>
                        <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded">
                            Metadata Encoded
                        </span>
                    </div>

                    {/* QR Code Container */}
                    <div
                        ref={qrRef}
                        className="flex justify-center py-4 bg-bg-secondary rounded-lg"
                    >
                        <QRCodeSVG
                            value={value}
                            size={256}
                            level="H"
                            includeMargin={true}
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleDownloadQR}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors text-sm font-semibold"
                        >
                            <Download size={16} />
                            Download
                        </button>
                        <button
                            onClick={handleCopy}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-border-primary text-text-primary rounded-lg hover:bg-border-primary/80 transition-colors text-sm font-semibold"
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}

            {/* Print All Button */}
            <button
                onClick={handlePrint}
                className="w-full px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors font-semibold flex items-center justify-center gap-2"
            >
                <Printer size={18} />
                Print All
            </button>
        </div>
    );
}
