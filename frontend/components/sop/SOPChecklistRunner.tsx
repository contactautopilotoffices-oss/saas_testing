'use client';

import React, { useState, useEffect } from 'react';
import { Camera, CheckCircle2, ChevronRight, Loader2, X, Paperclip, Circle, Eye, Video, Play } from 'lucide-react';


import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/frontend/utils/supabase/client';
import CameraCaptureModal from '@/frontend/components/shared/CameraCaptureModal';
import VideoCaptureModal from '@/frontend/components/shared/VideoCaptureModal';
import { compressImage } from '@/frontend/utils/image-compression';
import { compressVideo } from '@/frontend/utils/video-compression';
import Skeleton from '@/frontend/components/ui/Skeleton';
import { Toast } from '@/frontend/components/ui/Toast';
import { playTickleSound } from '@/frontend/utils/sounds';
import ImagePreviewModal from '@/frontend/components/shared/ImagePreviewModal';
import VideoPreviewModal from '@/frontend/components/shared/VideoPreviewModal';


interface SOPChecklistRunnerProps {
    templateId: string;
    completionId?: string;
    isAdmin?: boolean;
    propertyId: string;
    onComplete?: () => void;
    onCancel?: () => void;
}

const SOPChecklistRunner: React.FC<SOPChecklistRunnerProps> = ({ templateId, completionId, propertyId, onComplete, onCancel }) => {
    const [completion, setCompletion] = useState<any>(null);
    const [template, setTemplate] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showCameraModal, setShowCameraModal] = useState(false);
    const [activeCameraItemId, setActiveCameraItemId] = useState<string | null>(null);
    const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
    const [showVideoModal, setShowVideoModal] = useState(false);
    const [activeVideoItemId, setActiveVideoItemId] = useState<string | null>(null);
    const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
    const [itemValues, setItemValues] = useState<Record<string, string | number | boolean>>({});

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const supabase = React.useMemo(() => createClient(), []);
    const hasInitialized = React.useRef(false);

    useEffect(() => {
        const initializeChecklist = async () => {
            if (hasInitialized.current) return;
            hasInitialized.current = true;

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

                if (templateError || !templateData) throw templateError || new Error('Template not found');

                setTemplate(templateData); // Set template here

                let completionData;

                if (completionId) {
                    // Fetch existing completion
                    const { data, error } = await supabase
                        .from('sop_completions')
                        .select(`
                            *,
                            items:sop_completion_items(*)
                        `)
                        .eq('id', completionId)
                        .single();

                    if (error) throw error;
                    completionData = data;
                } else {
                    // Start new session

                    // 1. Create main completion record
                    const { data: mainData, error: mainError } = await supabase
                        .from('sop_completions')
                        .insert({
                            template_id: templateId,
                            property_id: propertyId,
                            organization_id: templateData.organization_id,
                            completed_by: (await supabase.auth.getUser()).data.user?.id,
                            completion_date: new Date().toISOString().split('T')[0],
                            status: 'in_progress',
                        })
                        .select()
                        .single();

                    if (mainError) throw mainError;

                    // 2. Initialize default completion items from template
                    const initialItems = templateData.items.map((item: any) => ({
                        completion_id: mainData.id,
                        checklist_item_id: item.id,
                        is_checked: false,
                        value: null,
                        photo_url: null,
                        comment: null,
                    }));

                    const { error: itemsError } = await supabase
                        .from('sop_completion_items')
                        .insert(initialItems);

                    if (itemsError) throw itemsError;

                    // 3. Re-fetch full completion with items
                    const { data: fullData, error: fetchError } = await supabase
                        .from('sop_completions')
                        .select(`
                            *,
                            items:sop_completion_items(*)
                        `)
                        .eq('id', mainData.id)
                        .single();

                    if (fetchError) throw fetchError;
                    completionData = fullData;
                }

                setCompletion(completionData);

                // Diagnostic: Check if items were even fetched (RLS check)
                if (!completionData.items || completionData.items.length === 0) {
                    console.error('[SOP Debug] CRITICAL: No items found in the completion record. This is likely an RLS permission issue.');
                    setToast({ message: 'Permissions error: Cannot see checklist items. Check RLS policies.', type: 'error' });
                }

                // Self-healing: Check if all template items exist in completion items
                const existingItemIds = new Set(completionData.items?.map((i: any) => String(i.checklist_item_id).toLowerCase()));
                const missingTemplateItems = templateData.items.filter((ti: any) => !existingItemIds.has(String(ti.id).toLowerCase()));

                if (missingTemplateItems.length > 0) {
                    console.log(`[SOP Debug] Found ${missingTemplateItems.length} missing completion items. Healing...`);
                    const newItems = missingTemplateItems.map((item: any) => ({
                        completion_id: completionData.id,
                        checklist_item_id: item.id,
                        is_checked: false,
                        value: null,
                        photo_url: null,
                        comment: null,
                    }));

                    const { data: insertedItems, error: healingError } = await supabase
                        .from('sop_completion_items')
                        .insert(newItems)
                        .select();

                    if (healingError) {
                        console.error('[SOP Debug] Healing failed:', healingError);
                    } else if (insertedItems) {
                        completionData.items = [...(completionData.items || []), ...insertedItems];
                        setCompletion({ ...completionData });
                    }
                }

                // Initialize item values
                const initialValues: Record<string, any> = {};
                completionData.items?.forEach((i: any) => {
                    // Try to use value first, if text/number/yes_no, otherwise fallback to checked status
                    initialValues[i.checklist_item_id] = i.value !== null ? i.value : (i.is_checked ? true : false);
                });
                setItemValues(initialValues);

            } catch (err: any) {
                console.error('Initialization error details:', {
                    message: err.message,
                    details: err.details,
                    hint: err.hint,
                    code: err.code
                });
                setToast({ message: `Error loading checklist: ${err.message || 'Unknown error'}`, type: 'error' });
                onCancel?.();
            } finally {
                setIsLoading(false);
            }

        };

        initializeChecklist();
    }, [templateId, completionId, propertyId]);

    const handleItemToggle = async (itemId: string, value: any = null) => {
        if (!itemId) {
            console.error('[SOP Debug] handleItemToggle called without itemId');
            return;
        }

        console.log(`[SOP Debug] handleItemToggle initiated for itemId: ${itemId}`);

        try {
            const findContext = (comp: any, temp: any) => {
                const tItem = temp?.items?.find((i: any) =>
                    String(i.id).toLowerCase() === String(itemId).toLowerCase()
                );
                const cItem = comp?.items?.find((i: any) =>
                    String(i.checklist_item_id).toLowerCase() === String(itemId).toLowerCase()
                );
                return { tItem, cItem };
            };

            const { tItem: templateItem, cItem: item } = findContext(completion, template);

            if (!item || !templateItem) {
                console.error('[SOP Debug] CRITICAL: Context missing for toggle.', {
                    targetId: itemId,
                    foundInTemplate: !!templateItem,
                    foundInCompletion: !!item,
                    availableTemplateIds: template?.items?.map((i: any) => i.id),
                    availableCompletionIds: completion?.items?.map((i: any) => i.checklist_item_id),
                    completionId: completion?.id
                });
                setToast({ message: 'Sync error: Item not found in session', type: 'error' });
                return;
            }

            const newValue = value !== null ? value : !item.is_checked;
            const isChecked = templateItem.type === 'checkbox' ? !!newValue : true;
            const dbValue = templateItem.type !== 'checkbox' ? String(newValue) : null;

            console.log(`[SOP Debug] Proceeding with DB update for row: ${item.id}`);

            const currentUser = (await supabase.auth.getUser()).data.user;
            const { error: dbError } = await supabase
                .from('sop_completion_items')
                .update({
                    is_checked: isChecked,
                    value: dbValue,
                    checked_at: new Date().toISOString(),
                    checked_by: currentUser?.id || null
                })
                .eq('id', item.id);

            if (dbError) throw dbError;

            // Play sound if item is being checked
            if (isChecked) {
                playTickleSound();
            }

            // Update item values for UI state
            setItemValues(prev => ({ ...prev, [itemId]: newValue }));

            // Update completion items for runners logic
            setCompletion((prev: any) => {
                if (!prev || !prev.items) return prev;
                return {
                    ...prev,
                    items: prev.items.map((i: any) =>
                        String(i.checklist_item_id).toLowerCase() === String(itemId).toLowerCase()
                            ? { ...i, is_checked: isChecked, value: newValue }
                            : i
                    )
                };
            });

            console.log('[SOP Debug] handleItemToggle success');
        } catch (err) {
            console.error('[SOP Debug] handleItemToggle Exception:', err);
            setToast({ message: 'Failed to update checklist point', type: 'error' });
        }
    };

    const stampTimestamp = (file: File): Promise<File> => new Promise((resolve) => {
        const originalLastModified = file.lastModified; // Capture before any async work
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxSize = 1024;
            let w = img.width, h = img.height;
            if (w > h && w > maxSize) { h = (h * maxSize) / w; w = maxSize; }
            else if (h > maxSize) { w = (w * maxSize) / h; h = maxSize; }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, w, h);
            // Use the file's own lastModified time (= actual capture time)
            const capturedAt = new Date(originalLastModified);
            const ts = capturedAt.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(',', '');
            const fontSize = Math.max(14, Math.round(w * 0.028));
            ctx.font = `bold ${fontSize}px monospace`;
            const pad = Math.round(fontSize * 0.5);
            const tw = ctx.measureText(ts).width;
            const x = w - tw - pad * 2;
            const y = h - fontSize - pad * 2;
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.beginPath();
            ctx.roundRect(x, y, tw + pad * 2, fontSize + pad * 2, 4);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(ts, x + pad, y + fontSize + pad * 0.6);
            canvas.toBlob(blob => {
                // Preserve original lastModified so subsequent reads still get the correct capture time
                resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, '.webp'), { type: 'image/webp', lastModified: originalLastModified }) : file);
            }, 'image/webp', 0.88);
        };
        img.src = URL.createObjectURL(file);
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
        const file = e.target.files?.[0];
        // Pass original file directly — handlePhotoCapture will stamp the timestamp
        if (file) handlePhotoCapture(file, itemId);
    };

    const handlePhotoCapture = async (file: File, itemId?: string) => {
        const targetItemId = itemId || activeCameraItemId;
        if (!completion || !targetItemId) return;

        try {
            setIsSaving(true);

            // Capture actual photo time BEFORE any async processing
            const photoTakenAt = new Date(file.lastModified).toISOString();

            // Stamp timestamp (uses file.lastModified = actual capture time for both camera and gallery)
            const stamped = await stampTimestamp(file);

            // Compress image
            const compressedFile = await compressImage(stamped);

            // Upload photo
            const formData = new FormData();
            formData.append('file', compressedFile);
            formData.append('completionId', completion.id);
            formData.append('completionItemId', String(targetItemId));


            const response = await fetch(`/api/properties/${propertyId}/sop/photos`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to upload photo');

            // Update item with photo URL + actual capture time
            const item = completion.items.find((i: any) => i.checklist_item_id === targetItemId);
            if (!item) throw new Error('Completion item not found');

            const { error } = await supabase
                .from('sop_completion_items')
                .update({ photo_url: data.url, checked_at: photoTakenAt })
                .eq('id', item.id);

            if (error) throw error;

            setCompletion({
                ...completion,
                items: completion.items.map((i: any) =>
                    i.checklist_item_id === targetItemId ? { ...i, photo_url: data.url, checked_at: photoTakenAt } : i
                ),
            });

            setShowCameraModal(false);
            setActiveCameraItemId(null);
            setToast({ message: 'Photo uploaded successfully', type: 'success' });

        } catch (err: any) {
            console.error('Error uploading photo:', err);
            setToast({ message: err.message || 'Error uploading photo', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleVideoCapture = async (file: File) => {
        const targetItemId = activeVideoItemId;
        if (!completion || !targetItemId) return;

        try {
            setIsSaving(true);

            // Compress video
            const compressedFile = await compressVideo(file);

            // Upload video
            const formData = new FormData();
            formData.append('file', compressedFile);
            formData.append('completionId', completion.id);
            formData.append('completionItemId', String(targetItemId));

            const response = await fetch(`/api/properties/${propertyId}/sop/videos`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to upload video');

            // Update item with video URL
            const item = completion.items.find((i: any) => i.checklist_item_id === targetItemId);
            if (!item) throw new Error('Completion item not found');

            const { error } = await supabase
                .from('sop_completion_items')
                .update({ video_url: data.url })
                .eq('id', item.id);

            if (error) throw error;

            setCompletion({
                ...completion,
                items: completion.items.map((i: any) =>
                    i.checklist_item_id === targetItemId ? { ...i, video_url: data.url } : i
                ),
            });

            setShowVideoModal(false);
            setActiveVideoItemId(null);
            setToast({ message: 'Video uploaded successfully', type: 'success' });

        } catch (err: any) {
            console.error('Error uploading video:', err);
            setToast({ message: err.message || 'Error uploading video', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!completion) return;

        try {
            setIsSaving(true);

            // Check mandatory items (photo/video are optional — only check/value interaction required)
            const uncheckedMandatory = template.items.filter((item: any) => {
                const comp = completion.items.find((c: any) => c.checklist_item_id === item.id);
                const hasInteraction = comp && (comp.is_checked || comp.value);
                return !item.is_optional && !hasInteraction;
            });


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

            playTickleSound();
            setToast({ message: 'Checklist submitted successfully!', type: 'success' });
            setTimeout(() => onComplete?.(), 1500);
        } catch (err) {
            setToast({ message: 'Error submitting checklist', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-4 rounded-full w-full" />
                <div className="space-y-4 pt-6">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-3xl" />)}
                </div>
            </div>
        );
    }

    if (!template || !completion) {
        return <div className="text-center py-24 text-slate-500 font-black uppercase text-xs tracking-widest">Error loading checklist data</div>;
    }

    const checkedCount = completion.items.filter((cItem: any) => {
        const hasInteraction = cItem.is_checked || cItem.value;
        return hasInteraction;
    }).length;

    const progress = (checkedCount / completion.items.length) * 100;


    return (
        <div className="space-y-3 md:space-y-4">
            {/* Header / Guide */}
            <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-primary mb-1">
                        <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em]">{template.category || 'General'}</span>
                        <ChevronRight size={9} className="opacity-30" />
                        <span className="text-[7px] md:text-[8px] font-black uppercase tracking-[0.2em]">Live Session</span>
                    </div>
                    <h2 className="text-base md:text-xl font-black text-slate-900 tracking-tight leading-tight truncate">{template.title}</h2>
                    <p className="text-slate-500 font-medium mt-0.5 text-[11px] md:text-xs max-w-xl line-clamp-2 md:line-clamp-none">{template.description}</p>
                </div>
                <button
                    onClick={onCancel}
                    className="w-7 h-7 md:w-8 md:h-8 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all flex-shrink-0"
                >
                    <X size={14} />
                </button>
            </div>

            {/* Progress Visualization */}
            <div className="bg-slate-50 p-2.5 md:p-3 rounded-lg md:rounded-xl border border-slate-100">
                <div className="flex justify-between items-end mb-1.5 md:mb-2">
                    <div>
                        <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Progress</p>
                        <p className="text-base md:text-lg font-black text-slate-900 leading-none">{Math.round(progress)}%</p>
                    </div>
                    <span className="text-[8px] md:text-[9px] font-black text-primary bg-primary/10 px-2 md:px-2.5 py-0.5 md:py-1 rounded-full uppercase tracking-widest">
                        {checkedCount}/{completion.items.length} pts
                    </span>
                </div>
                <div className="w-full bg-slate-200/50 rounded-full h-1.5 md:h-2 overflow-hidden">
                    <motion.div
                        className="bg-primary h-full shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                </div>
            </div>

            {/* Checklist Items */}
            <div className="space-y-2 md:space-y-3 pb-4 md:pb-6">
                <AnimatePresence>
                    {template.items.map((item: any, index: number) => {
                        const completionItem = completion.items.find((c: any) => c.checklist_item_id === item.id);
                        const isChecked = completionItem?.is_checked;
                        const hasValue = completionItem?.value || isChecked;
                        const value = itemValues[item.id];

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`relative group bg-white border rounded-lg md:rounded-xl p-2.5 md:p-4 transition-all duration-300 ${hasValue
                                    ? 'border-emerald-100 bg-emerald-50/10'
                                    : 'border-slate-100 hover:border-slate-200'
                                    }`}
                            >
                                <div className="flex items-start gap-2.5 md:gap-4">
                                    {item.type === 'checkbox' && (
                                        <button
                                            onClick={() => handleItemToggle(item.id)}
                                            className="mt-0.5 flex-shrink-0 relative"
                                        >
                                            <AnimatePresence mode="wait">
                                                {isChecked ? (
                                                    <motion.div
                                                        key="checked"
                                                        initial={{ scale: 0.5, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.5, opacity: 0 }}
                                                    >
                                                        <CheckCircle2 size={22} className="text-emerald-500 fill-emerald-50" />
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="unchecked"
                                                        initial={{ scale: 0.5, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        exit={{ scale: 0.5, opacity: 0 }}
                                                    >
                                                        <Circle size={22} className="text-slate-200 group-hover:text-primary transition-colors" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </button>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1 gap-2">
                                            <h3 className={`font-black text-sm md:text-lg tracking-tight group-hover:text-primary transition-colors ${isChecked ? 'text-emerald-900' : 'text-slate-900'}`}>
                                                {item.title}
                                            </h3>
                                            <div className="flex-shrink-0">
                                            </div>

                                        </div>
                                        <p className="text-slate-500 font-medium text-[11px] md:text-xs mb-2 md:mb-4 line-clamp-2 group-hover:line-clamp-none transition-all">{item.description}</p>

                                        {/* Dynamic Input Area */}
                                        <div className="mt-2 md:mt-4">
                                            {item.type === 'text' && (
                                                <input
                                                    type="text"
                                                    value={String(value || '')}
                                                    onChange={(e) => handleItemToggle(item.id, e.target.value)}
                                                    placeholder="Enter observation..."
                                                    className="w-full px-3 md:px-5 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl text-xs md:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-300"
                                                />
                                            )}
                                            {item.type === 'number' && (
                                                <input
                                                    type="number"
                                                    value={String(value || '')}
                                                    onChange={(e) => handleItemToggle(item.id, e.target.value)}
                                                    placeholder="Enter value..."
                                                    className="w-full max-w-[200px] md:max-w-xs px-3 md:px-5 py-2.5 md:py-4 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl text-xs md:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary transition-all placeholder:text-slate-300"
                                                />
                                            )}
                                            {item.type === 'yes_no' && (
                                                <div className="flex gap-2 md:gap-3">
                                                    <button
                                                        onClick={() => handleItemToggle(item.id, 'yes')}
                                                        className={`flex-1 px-4 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${value === 'yes'
                                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        onClick={() => handleItemToggle(item.id, 'no')}
                                                        className={`flex-1 px-4 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest transition-all ${value === 'no'
                                                            ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                                                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                                                            }`}
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 md:mt-6 pt-3 md:pt-6 border-t border-slate-50">
                                            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 md:mb-3 flex items-center gap-1.5">
                                                <Camera size={10} />
                                                Media Documentation
                                            </p>

                                            <div className="flex flex-col gap-3">
                                                {/* Photo & Video Thumbnails */}
                                                <div className="flex flex-wrap gap-2 md:gap-3">
                                                    {completionItem?.photo_url && (
                                                        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl md:rounded-2xl overflow-hidden shadow-md border-2 md:border-4 border-white group/img cursor-pointer"
                                                            onClick={() => setPreviewImageUrl(completionItem.photo_url!)}
                                                        >
                                                            <img
                                                                src={completionItem.photo_url}
                                                                alt="Proof"
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center">
                                                                <div className="p-2 bg-white/20 rounded-full text-white">
                                                                    <Eye size={20} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {completionItem?.video_url && (
                                                        <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl md:rounded-2xl overflow-hidden shadow-md border-2 md:border-4 border-white group/vid cursor-pointer"
                                                            onClick={() => setPreviewVideoUrl(completionItem.video_url!)}
                                                        >
                                                            <video
                                                                src={completionItem.video_url}
                                                                className="w-full h-full object-cover"
                                                                muted
                                                                playsInline
                                                            />
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover/vid:bg-black/50 transition-all">
                                                                <div className="p-2 bg-white/20 rounded-full text-white">
                                                                    <Play size={20} />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap gap-2 md:gap-3">
                                                    <button
                                                        onClick={() => {
                                                            setActiveCameraItemId(item.id);
                                                            setShowCameraModal(true);
                                                        }}
                                                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all text-[10px] md:text-xs font-black uppercase tracking-widest ${completionItem?.photo_url
                                                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            : 'bg-white border-2 border-slate-100 text-slate-500 hover:border-primary/40 hover:text-primary'
                                                            }`}
                                                    >
                                                        <Camera size={14} />
                                                        {completionItem?.photo_url ? 'Change Photo' : 'Capture'}
                                                    </button>
                                                    <label className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-[10px] md:text-xs font-black uppercase tracking-widest text-center ${completionItem?.photo_url
                                                        ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        : 'bg-white border-2 border-slate-100 text-slate-500 hover:border-primary/40 hover:text-primary'
                                                        }`}>
                                                        <Paperclip size={14} />
                                                        {completionItem?.photo_url ? 'Upload New' : 'Gallery'}
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => handleFileSelect(e, item.id)}
                                                        />
                                                    </label>
                                                    <button
                                                        onClick={() => {
                                                            setActiveVideoItemId(item.id);
                                                            setShowVideoModal(true);
                                                        }}
                                                        className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all text-[10px] md:text-xs font-black uppercase tracking-widest ${completionItem?.video_url
                                                            ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                            : 'bg-white border-2 border-slate-100 text-slate-500 hover:border-red-400/40 hover:text-red-500'
                                                            }`}
                                                    >
                                                        <Video size={14} />
                                                        {completionItem?.video_url ? 'Re-Record' : '15s Video'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>


                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Sticky Actions Bar */}
            <div className="flex gap-2 md:gap-4 pt-4 md:pt-10 sticky bottom-4 md:bottom-8 z-10">
                <button
                    onClick={onCancel}
                    className="flex-1 px-4 md:px-8 py-3 md:py-5 border border-slate-200 bg-white text-slate-500 rounded-xl md:rounded-3xl hover:bg-slate-50 transition-all font-black uppercase tracking-widest md:tracking-[0.2em] text-[9px] md:text-xs"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSaving || progress < 100}
                    className="flex-[2] px-4 md:px-8 py-3 md:py-5 bg-primary text-white rounded-xl md:rounded-3xl hover:opacity-90 transition-all font-black uppercase tracking-widest md:tracking-[0.2em] text-[9px] md:text-xs shadow-2xl shadow-primary/30 disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2 md:gap-3"
                >
                    {isSaving ? (
                        <>
                            <Loader2 size={14} className="animate-spin" />
                            Saving...
                        </>
                    ) : progress < 100 ? (
                        `${checkedCount}/${completion.items.length} Done`
                    ) : (
                        <>
                            <CheckCircle2 size={14} />
                            Submit Report
                        </>
                    )}
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
                title="SOP Visual Audit"
            />

            {/* Image Preview Modal */}
            <ImagePreviewModal
                isOpen={!!previewImageUrl}
                onClose={() => setPreviewImageUrl(null)}
                imageUrl={previewImageUrl}
                title="Audit Proof"
            />

            {/* Video Capture Modal */}
            <VideoCaptureModal
                isOpen={showVideoModal}
                onClose={() => {
                    setShowVideoModal(false);
                    setActiveVideoItemId(null);
                }}
                onCapture={handleVideoCapture}
                title="SOP Video Audit"
                maxDuration={15}
            />

            {/* Video Preview Modal */}
            <VideoPreviewModal
                isOpen={!!previewVideoUrl}
                onClose={() => setPreviewVideoUrl(null)}
                videoUrl={previewVideoUrl}
                title="Video Proof"
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
