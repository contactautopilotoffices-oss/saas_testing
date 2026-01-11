'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Camera, RotateCcw, Check } from 'lucide-react';

interface CameraCaptureProps {
    onCapture: (imageUrl: string, blob: Blob) => void;
    onCancel?: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel }) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            setError(null);
            setIsLoading(true);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: 640, height: 480 }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error('Camera access error:', err);
            setError('Unable to access camera. Please allow camera permissions.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    // Compress image to WebP format (< 50KB target)
    const compressImage = async (canvas: HTMLCanvasElement): Promise<Blob> => {
        return new Promise((resolve) => {
            let quality = 0.8; // WebP handles quality better than JPEG
            const tryCompress = () => {
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            // If still too large and quality > 0.1, reduce quality
                            if (blob.size > 50000 && quality > 0.1) {
                                quality -= 0.1;
                                tryCompress();
                            } else {
                                resolve(blob);
                            }
                        }
                    },
                    'image/webp', // WebP: ~30% smaller than JPEG at same quality
                    quality
                );
            };
            tryCompress();
        });
    };


    // Capture photo
    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext('2d');

        if (!ctx) return;

        // Set canvas size (passport photo ratio ~3:4)
        canvas.width = 300;
        canvas.height = 400;

        // Draw video frame to canvas (center crop)
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = canvas.width / canvas.height;

        let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;

        if (videoAspect > canvasAspect) {
            sw = video.videoHeight * canvasAspect;
            sx = (video.videoWidth - sw) / 2;
        } else {
            sh = video.videoWidth / canvasAspect;
            sy = (video.videoHeight - sh) / 2;
        }

        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

        // Compress and get blob (WebP format)
        const blob = await compressImage(canvas);
        const imageUrl = canvas.toDataURL('image/webp', 0.8);

        setCapturedImage(imageUrl);
        setCapturedBlob(blob);
        stopCamera();
    };

    // Retake photo
    const retakePhoto = () => {
        setCapturedImage(null);
        setCapturedBlob(null);
        startCamera();
    };

    // Confirm photo
    const confirmPhoto = () => {
        if (capturedImage && capturedBlob) {
            onCapture(capturedImage, capturedBlob);
        }
    };

    // Initialize camera on mount
    React.useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    return (
        <div className="w-full flex flex-col items-center">
            {/* Camera/Preview Container */}
            <div className="relative w-48 h-64 bg-slate-100 rounded-2xl overflow-hidden mb-4 border-2 border-slate-200">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <Camera className="w-10 h-10 text-slate-300 mb-2" />
                        <p className="text-xs text-slate-500">{error}</p>
                    </div>
                )}

                {!capturedImage && !error && (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover scale-x-[-1]"
                    />
                )}

                {capturedImage && (
                    <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full h-full object-cover"
                    />
                )}
            </div>

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Controls */}
            <div className="flex gap-3">
                {!capturedImage ? (
                    <button
                        onClick={capturePhoto}
                        disabled={!stream || isLoading}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                        <Camera className="w-4 h-4" />
                        Capture Photo
                    </button>
                ) : (
                    <>
                        <button
                            onClick={retakePhoto}
                            className="flex items-center gap-2 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-300 transition-all"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Retake
                        </button>
                        <button
                            onClick={confirmPhoto}
                            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
                        >
                            <Check className="w-4 h-4" />
                            Use Photo
                        </button>
                    </>
                )}
            </div>

            {capturedBlob && (
                <p className="text-[10px] text-slate-400 mt-2">
                    Size: {(capturedBlob.size / 1024).toFixed(1)} KB
                </p>
            )}
        </div>
    );
};

export default CameraCapture;
