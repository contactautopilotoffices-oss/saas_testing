'use client';

import React, { useState, useEffect } from 'react';
import { X, Camera, CheckCircle, Circle } from 'lucide-react';
import { createClient } from '@/frontend/utils/supabase/client';
import CameraCaptureModal from '@/frontend/components/shared/CameraCaptureModal';
import { compressImage } from '@/frontend/utils/image-compression';
import Skeleton from '@/frontend/components/ui/Skeleton';
import { Toast } from '@/frontend/components/ui/Toast';

interface SOPChecklistRunnerProps {
    templateId: string;
    propertyId: string;
    onComplete?: () => void;
    onCancel?: () => void;
}

const SOPChecklistRunner: React.FC<SOPChecklistRunnerProps> = ({ templateId, propertyId, onComplete, onCancel }) => {
    const [completion, setCompletion] = useState<any>(null);
    const [template, setTemplate] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [activeCameraItemId, setActiveCameraItemId] = useState<string | null>(null);
    const [itemValues, setItemValues] = useState<Record<string, string | number | boolean>>({});
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    useEffect(() => {
        const initializeChecklist = async () => {
            try {
                setIsLoading(true);

                // Fetch template
                const { data: templateData, error: templateError } = await supabase
                    .from('sop_templates')
                    .select(`
                        *,
                        items:sop_checklist_items(*)
                    `)
                    .eq('id', templateId)
                    .eq('property_id', propertyId)
                    .single();

                if (templateError) throw templateError;
                setTemplate(templateData);

                // Create completion record
                const { data: completionData, error: completionError } = await supabase
                    .from('sop_completions')
                    .insert({
                        template_id: templateId,
                        property_id: propertyId,
                        organization_id: templateData.organization_id,
                        completed_by: (await supabase.auth.getUser()).data.user?.id,
                        completion_date: new Date().toISOString().split('T')[0],
                        status: 'in_progress',
                    })
                    .select(`
                        *,
                        items:sop_completion_items(*)
                    `)
                    .single();

                if (completionError) throw completionError;
                setCompletion(completionData);

                // Initialize item values
                const initialValues: Record<string, any> = {};
                completionData.items.forEach((i: any) => {
                    initialValues[i.checklist_item_id] = i.value || (i.is_checked ? true : false);
                });
                setItemValues(initialValues);

            } catch (err) {
                setToast({ message: 'Error loading checklist', type: 'error' });
                onCancel?.();
            } finally {
                setIsLoading(false);
            }
        };

        initializeChecklist();
    }, [templateId, propertyId]);

    const handleItemToggle = async (itemId: string, value: any = null) => {
        if (!completion) return;

        try {
            const item = completion.items.find((i: any) => i.checklist_item_id === itemId);
            const templateItem = template.items.find((i: any) => i.id === itemId);
            const newValue = value !== null ? value : !item.is_checked;

            const { error } = await supabase
                .from('sop_completion_items')
                .update({
                    is_checked: templateItem.type === 'checkbox' ? !!newValue : true,
                    value: templateItem.type !== 'checkbox' ? String(newValue) : null
                })
                .eq('id', item.id);

            if (error) throw error;

            setCompletion({
                ...completion,
                items: completion.items.map((i: any) =>
                    i.checklist_item_id === itemId ? { ...i, is_checked: templateItem.type === 'checkbox' ? !!newValue : true, value: newValue } : i
                ),
            });
            setItemValues({ ...itemValues, [itemId]: newValue });
        } catch (err) {
            setToast({ message: 'Error updating item', type: 'error' });
        }
    };

    const handlePhotoCapture = async (file: File) => {
        if (!completion || !activeCameraItemId) return;

        try {
            setIsSaving(true);

            // Compress image
            const compressedFile = await compressImage(file);

            // Upload photo
            const formData = new FormData();
            formData.append('file', compressedFile);
            formData.append('completionId', completion.id);
            formData.append('completionItemId', activeCameraItemId);

            const response = await fetch(`/api/properties/${propertyId}/sop/photos`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to upload photo');

            // Update item with photo URL
            const item = completion.items.find((i: any) => i.checklist_item_id === activeCameraItemId);
            const { error } = await supabase
                .from('sop_completion_items')
                .update({ photo_url: data.url })
                .eq('id', item.id);

            if (error) throw error;

            setCompletion({
                ...completion,
                items: completion.items.map((i: any) =>
                    i.checklist_item_id === activeCameraItemId ? { ...i, photo_url: data.url } : i
                ),
            });

            setShowCameraModal(false);
            setActiveCameraItemId(null);
            setToast({ message: 'Photo uploaded successfully', type: 'success' });
        } catch (err) {
            setToast({ message: 'Error uploading photo', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!completion) return;

        try {
            setIsSaving(true);

            // Check mandatory items
            const uncheckedMandatory = template.items.filter((item: any) =>
                !item.is_optional && !completion.items.find((c: any) => c.checklist_item_id === item.id && (c.is_checked || c.value))
            );

            if (uncheckedMandatory.length > 0) {
                setToast({
                    message: `${uncheckedMandatory.length} mandatory item(s) not completed`,
                    type: 'error',
                });
                setIsSaving(false);
                return;
            }

            // Update completion status
            const { error } = await supabase
                .from('sop_completions')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                })
                .eq('id', completion.id);

            if (error) throw error;

            setToast({ message: 'Checklist submitted successfully!', type: 'success' });
            setTimeout(() => onComplete?.(), 1500);
        } catch (err) {
            setToast({ message: 'Error submitting checklist', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <Skeleton className="h-96" />;
    }

    if (!template || !completion) {
        return <div className="text-center py-12">Error loading checklist</div>;
    }

    const checkedCount = completion.items.filter((i: any) => i.is_checked || i.value).length;
    const progress = (checkedCount / completion.items.length) * 100;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold">{template.title}</h2>
                    <p className="text-text-secondary mt-2">{template.description}</p>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-bg-secondary rounded-lg">
                    <X size={24} />
                </button>
            </div>

            {/* Progress Bar */}
            <div>
                <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold">Progress</span>
                    <span className="text-sm text-accent-primary">{checkedCount}/{completion.items.length}</span>
                </div>
                <div className="w-full bg-bg-secondary rounded-full h-2">
                    <div
                        className="bg-accent-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-3 border-t border-b border-border-primary py-6">
                {template.items.map((item: any) => {
                    const completionItem = completion.items.find((c: any) => c.checklist_item_id === item.id);
                    const isChecked = completionItem?.is_checked;
                    const value = itemValues[item.id];

                    return (
                        <div key={item.id} className="border border-border-primary rounded-lg p-4">
                            <div className="flex items-start gap-4">
                                {item.type === 'checkbox' && (
                                    <button
                                        onClick={() => handleItemToggle(item.id)}
                                        className="mt-1 flex-shrink-0"
                                    >
                                        {isChecked ? (
                                            <CheckCircle size={24} className="text-green-500" />
                                        ) : (
                                            <Circle size={24} className="text-text-secondary" />
                                        )}
                                    </button>
                                )}

                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold">
                                            {item.title}
                                            {item.is_optional && <span className="ml-2 text-xs font-normal text-text-tertiary">(Optional)</span>}
                                        </h4>
                                    </div>

                                    {item.description && (
                                        <p className="text-sm text-text-secondary mt-1">{item.description}</p>
                                    )}

                                    {/* Different Input Types */}
                                    <div className="mt-3">
                                        {item.type === 'text' && (
                                            <input
                                                type="text"
                                                value={String(value || '')}
                                                onChange={(e) => handleItemToggle(item.id, e.target.value)}
                                                placeholder="Enter text..."
                                                className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded text-sm focus:outline-none focus:border-accent-primary"
                                            />
                                        )}
                                        {item.type === 'number' && (
                                            <input
                                                type="number"
                                                value={String(value || '')}
                                                onChange={(e) => handleItemToggle(item.id, e.target.value)}
                                                placeholder="Enter number..."
                                                className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded text-sm focus:outline-none focus:border-accent-primary"
                                            />
                                        )}
                                        {item.type === 'yes_no' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleItemToggle(item.id, 'yes')}
                                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${value === 'yes' ? 'bg-green-500 text-white' : 'bg-bg-secondary border border-border-primary'
                                                        }`}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    onClick={() => handleItemToggle(item.id, 'no')}
                                                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${value === 'no' ? 'bg-red-500 text-white' : 'bg-bg-secondary border border-border-primary'
                                                        }`}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {item.requires_photo && (
                                        <div className="mt-3">
                                            {completionItem?.photo_url ? (
                                                <img
                                                    src={completionItem.photo_url}
                                                    alt="Proof"
                                                    className="w-24 h-24 object-cover rounded-lg"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setActiveCameraItemId(item.id);
                                                        setShowCameraModal(true);
                                                    }}
                                                    className="flex items-center gap-2 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                                                >
                                                    <Camera size={16} />
                                                    Take Photo
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    onClick={onCancel}
                    className="flex-1 px-6 py-3 border border-border-primary rounded-lg hover:bg-bg-secondary transition-colors font-semibold"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors font-semibold disabled:opacity-50"
                >
                    {isSaving ? 'Submitting...' : 'Submit Checklist'}
                </button>
            </div>

            {/* Camera Modal */}
            <CameraCaptureModal
                isOpen={showCameraModal}
                onClose={() => {
                    setShowCameraModal(false);
                    setActiveCameraItemId(null);
                }}
                onCapture={handlePhotoCapture}
                title="Capture SOP Verification Photo"
            />

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    visible={true}
                    onClose={() => setToast(null)}
                    duration={3000}
                />
            )}
        </div>
    );
};

export default SOPChecklistRunner;
