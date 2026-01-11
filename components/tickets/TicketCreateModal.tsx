'use client';

import { useState } from 'react';
import { X, Paperclip, Send, Loader2, CheckCircle, AlertCircle, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TicketCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    organizationId: string;
    onSuccess?: (ticket: unknown) => void;
}

interface Classification {
    category: string | null;
    confidence: number;
    isVague: boolean;
}

export default function TicketCreateModal({
    isOpen,
    onClose,
    propertyId,
    organizationId,
    onSuccess,
}: TicketCreateModalProps) {
    const [description, setDescription] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [classification, setClassification] = useState<Classification | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Compress image client-side to WebP (max 800px, 0.8 quality)
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 800;
                let width = img.width;
                let height = img.height;

                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            setPhotoFile(new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp' }));
                            setPhotoPreview(canvas.toDataURL('image/webp', 0.8));
                        }
                    },
                    'image/webp', // WebP: ~30% smaller than JPEG
                    0.8
                );
            };
            img.src = URL.createObjectURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!description.trim()) {
            setError('Please describe the issue');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // TODO: Upload photo if exists
            let photoUrl = null;
            if (photoFile) {
                // Photo upload logic would go here
                // photoUrl = await uploadPhoto(photoFile);
            }

            const response = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description,
                    propertyId,
                    organizationId,
                    isInternal,
                    photoUrl,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create ticket');
            }

            setClassification(data.classification);
            setSuccess(true);
            onSuccess?.(data.ticket);

            // Auto close after 2 seconds
            setTimeout(() => {
                handleReset();
                onClose();
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReset = () => {
        setDescription('');
        setIsInternal(false);
        setPhotoFile(null);
        setPhotoPreview(null);
        setClassification(null);
        setError(null);
        setSuccess(false);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[#0d1117] border border-[#30363d] rounded-2xl w-full max-w-lg shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
                        <h2 className="text-lg font-semibold text-white">Raise a New Request</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-4">
                        {success ? (
                            <div className="text-center py-8">
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-white mb-2">Request Submitted!</h3>
                                {classification && (
                                    <div className="bg-[#161b22] rounded-xl p-4 mt-4 text-left">
                                        <p className="text-sm text-gray-400 mb-2">System Interpretation (AI-Powered)</p>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400">Category:</span>
                                                <span className="text-cyan-400 capitalize">
                                                    {classification.category?.replace(/_/g, ' ') || 'Pending Review'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400">Confidence:</span>
                                                <span className={classification.confidence >= 70 ? 'text-green-400' : 'text-yellow-400'}>
                                                    {classification.confidence}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Description Input */}
                                <div>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe the issue in your own words.&#10;Example: Leaking tap in kitchenette, 2nd floor"
                                        className="w-full h-32 bg-[#161b22] border border-[#30363d] rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                {/* Photo Preview */}
                                {photoPreview && (
                                    <div className="relative">
                                        <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover rounded-xl" />
                                        <button
                                            onClick={() => {
                                                setPhotoFile(null);
                                                setPhotoPreview(null);
                                            }}
                                            className="absolute top-2 right-2 bg-black/50 rounded-full p-1"
                                        >
                                            <X className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                )}

                                {/* Actions Row */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {/* Photo Upload */}
                                        <label className="flex items-center gap-2 px-3 py-2 bg-[#21262d] rounded-lg cursor-pointer hover:bg-[#30363d] transition-colors">
                                            <Paperclip className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm text-gray-400">Attach Photo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoSelect}
                                            />
                                        </label>

                                        {/* Internal Toggle */}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <div
                                                className={`w-10 h-5 rounded-full transition-colors ${isInternal ? 'bg-cyan-500' : 'bg-[#30363d]'
                                                    }`}
                                                onClick={() => setIsInternal(!isInternal)}
                                            >
                                                <div
                                                    className={`w-4 h-4 bg-white rounded-full mt-0.5 transition-transform ${isInternal ? 'translate-x-5' : 'translate-x-0.5'
                                                        }`}
                                                />
                                            </div>
                                            <span className="text-sm text-gray-400">Internal</span>
                                        </label>
                                    </div>

                                    {/* Submit */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !description.trim()}
                                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        Submit
                                    </button>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="flex items-center gap-2 text-red-400 text-sm">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
