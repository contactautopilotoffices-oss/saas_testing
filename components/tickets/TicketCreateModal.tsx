'use client';

import { useState } from 'react';
import { X, Paperclip, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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
                    'image/webp',
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
            let photoUrl = null;
            if (photoFile) {
                // Photo upload logic would go here
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
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="premium-card w-full max-w-lg"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-border/10">
                        <h2 className="text-lg font-display font-semibold text-text-primary">Raise a New Request</h2>
                        <button onClick={onClose} className="text-text-tertiary hover:text-text-primary transition-smooth">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        {success ? (
                            <div className="text-center py-8">
                                <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                                <h3 className="text-xl font-display font-semibold text-text-primary mb-2">Request Submitted!</h3>
                                <p className="text-text-secondary font-body text-sm mb-4">Your request has been created and will be reviewed shortly.</p>
                                {classification && (
                                    <div className="premium-list p-4 mt-4">
                                        <p className="text-xs font-body font-medium text-text-tertiary mb-3 uppercase tracking-widest">System Classification</p>
                                        <div className="space-y-2 text-left">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-text-secondary">Category:</span>
                                                <span className="text-secondary font-display font-semibold capitalize">
                                                    {classification.category?.replace(/_/g, ' ') || 'Pending'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-text-secondary">Confidence:</span>
                                                <span className={`font-display font-semibold ${classification.confidence >= 70 ? 'text-success' : 'text-warning'}`}>
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
                                    <label className="text-xs font-body font-semibold text-text-primary mb-2 block">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe the issue in your own words...&#10;Example: Leaking tap in kitchenette, 2nd floor"
                                        className="w-full h-32 px-4 py-3 bg-text-primary/5 border border-border/10 rounded-lg text-text-primary placeholder-text-tertiary resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 font-body transition-smooth"
                                    />
                                </div>

                                {/* Photo Preview */}
                                {photoPreview && (
                                    <div className="relative">
                                        <img src={photoPreview} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                                        <button
                                            onClick={() => {
                                                setPhotoFile(null);
                                                setPhotoPreview(null);
                                            }}
                                            className="absolute top-2 right-2 bg-error text-text-inverse p-1 rounded-full hover:bg-error/90 transition-smooth"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {/* Actions Row */}
                                <div className="flex items-center justify-between pt-2">
                                    <div className="flex items-center gap-2">
                                        {/* Photo Upload */}
                                        <label className="flex items-center gap-2 px-3 py-2 bg-text-primary/5 border border-border/10 rounded-lg cursor-pointer hover:bg-text-primary/10 transition-smooth">
                                            <Paperclip className="w-4 h-4 text-text-tertiary" />
                                            <span className="text-xs font-body font-medium text-text-secondary">Photo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handlePhotoSelect}
                                            />
                                        </label>

                                        {/* Internal Toggle */}
                                        <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg hover:bg-text-primary/5 transition-smooth">
                                            <div className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 ${isInternal ? 'bg-primary' : 'bg-border/20'}`}>
                                                <div className={`w-3 h-3 bg-white rounded-full m-0.5 transition-transform ${isInternal ? 'translate-x-4' : 'translate-x-0'}`} />
                                            </div>
                                            <span className="text-xs font-body font-medium text-text-secondary">Internal</span>
                                        </label>
                                    </div>

                                    {/* Submit */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !description.trim()}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-text-inverse font-body font-semibold text-xs rounded-lg transition-smooth"
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
                                    <div className="flex items-center gap-2 text-error text-xs font-body">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
