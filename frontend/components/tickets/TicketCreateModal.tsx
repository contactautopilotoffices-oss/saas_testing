'use client';

import { useState, useEffect } from 'react';
import { X, Paperclip, Send, Loader2, CheckCircle, AlertCircle, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/frontend/utils/supabase/client';
import { playTickleSound } from '@/frontend/utils/sounds';
import CameraCaptureModal from '@/frontend/components/shared/CameraCaptureModal';

interface TicketCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId?: string;
    organizationId?: string;
    onSuccess?: (ticket: unknown) => void;
    isAdminMode?: boolean;
    organizations?: any[];
    properties?: any[];
}

interface Classification {
    category: string | null;
    confidence: number;
    isVague: boolean;
    status?: string;
}

export default function TicketCreateModal({
    isOpen,
    onClose,
    propertyId,
    organizationId,
    onSuccess,
    isAdminMode = false,
    organizations = [],
    properties = []
}: TicketCreateModalProps) {
    const [description, setDescription] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [classification, setClassification] = useState<Classification | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Admin Mode State
    const [selectedOrgId, setSelectedOrgId] = useState(organizationId || '');
    const [selectedPropId, setSelectedPropId] = useState(propertyId || '');
    const [availableProperties, setAvailableProperties] = useState<any[]>(properties || []);
    const supabase = createClient();

    // Sync available properties if passed from parent
    useEffect(() => {
        if (properties && properties.length > 0) {
            setAvailableProperties(properties);
        }
    }, [properties]);

    // Fetch properties when org changes in admin mode
    const handleOrgChange = async (orgId: string) => {
        setSelectedOrgId(orgId);
        setSelectedPropId('');
        if (orgId) {
            const { data } = await supabase
                .from('properties')
                .select('id, name, code')
                .eq('organization_id', orgId)
                .eq('status', 'active');
            setAvailableProperties(data || []);
        } else {
            setAvailableProperties([]);
        }
    };

    const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleCameraCapture = (file: File) => {
        processFile(file);
        setShowCameraModal(false);
    };

    const processFile = (file: File) => {
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
    };

    const handleSubmit = async () => {
        if (!description.trim()) {
            setError('Please describe the issue');
            return;
        }

        const finalOrgId = isAdminMode ? selectedOrgId : organizationId;
        const finalPropId = isAdminMode ? selectedPropId : propertyId;

        if (!finalOrgId || !finalPropId) {
            setError('Please select an organization and property');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // 1. Create the ticket first
            const response = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description,
                    propertyId: finalPropId,
                    organizationId: finalOrgId,
                    isInternal,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create ticket');
            }

            // 2. Upload photo if exists - as "before" photo
            if (photoFile && data.ticket?.id) {
                const formData = new FormData();
                formData.append('file', photoFile);
                formData.append('type', 'before');

                const photoResponse = await fetch(`/api/tickets/${data.ticket.id}/photos`, {
                    method: 'POST',
                    body: formData,
                });

                if (!photoResponse.ok) {
                    console.error('Photo upload failed, but ticket was created');
                }
            }

            // Play tickle sound on success
            playTickleSound();

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
                className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200">
                        <h2 className="text-lg sm:text-xl font-black text-slate-900">Raise a New Request</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1 hover:bg-slate-100 rounded-lg">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar">
                        {success ? (
                            <div className="text-center py-8">
                                <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                                <h3 className="text-xl font-display font-semibold text-text-primary mb-2">Request Submitted!</h3>
                                <p className="text-text-secondary font-body text-sm mb-4">Your request has been created and will be reviewed shortly.</p>
                            </div>
                        ) : (
                            <>
                                {isAdminMode && (
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Organization</label>
                                            <select
                                                value={selectedOrgId}
                                                onChange={(e) => handleOrgChange(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="">Select Org</option>
                                                {organizations?.map(org => (
                                                    <option key={org.id} value={org.id}>{org.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-700 uppercase tracking-widest">Property</label>
                                            <select
                                                value={selectedPropId}
                                                onChange={(e) => setSelectedPropId(e.target.value)}
                                                disabled={!selectedOrgId}
                                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                            >
                                                <option value="">Select Property</option>
                                                {availableProperties.map(prop => (
                                                    <option key={prop.id} value={prop.id}>{prop.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Description Input */}
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-2 block">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Describe the issue in your own words...&#10;Example: Leaking tap in kitchenette, 2nd floor"
                                        className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
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
                                <div className="flex items-center gap-3 pt-4">
                                    {/* Gallery Upload */}
                                    <label className="flex-1 flex flex-col items-center justify-center gap-1 px-2 py-3 bg-slate-100 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors active:scale-95 text-center h-20">
                                        <Paperclip className="w-6 h-6 sm:w-5 sm:h-5 text-slate-600" />
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide hidden sm:block">Gallery</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handlePhotoSelect}
                                        />
                                    </label>

                                    {/* Camera Button */}
                                    <button
                                        onClick={() => setShowCameraModal(true)}
                                        className="flex-1 flex flex-col items-center justify-center gap-1 px-2 py-3 bg-slate-100 border border-slate-300 rounded-xl cursor-pointer hover:bg-slate-200 transition-colors active:scale-95 text-center h-20"
                                    >
                                        <Camera className="w-6 h-6 sm:w-5 sm:h-5 text-slate-600" />
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide hidden sm:block">Camera</span>
                                    </button>

                                    {/* Submit */}
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || !description.trim()}
                                        className="flex-[1.5] flex flex-col items-center justify-center gap-1 px-2 py-3 bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-primary/30 active:scale-95 h-20"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin mb-1" />
                                        ) : (
                                            <Send className="w-5 h-5 mb-1" />
                                        )}
                                        <span className="font-black uppercase tracking-widest text-xs">Submit</span>
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

                    <CameraCaptureModal
                        isOpen={showCameraModal}
                        onClose={() => setShowCameraModal(false)}
                        onCapture={handleCameraCapture}
                    />
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
