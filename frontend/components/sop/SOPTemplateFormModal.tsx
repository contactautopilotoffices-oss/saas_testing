'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Check, Info, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/frontend/utils/supabase/client';
import { Toast } from '@/frontend/components/ui/Toast';

interface SOPTemplateFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    template?: any;
    onSuccess?: () => void;
}

const SOPTemplateFormModal: React.FC<SOPTemplateFormModalProps> = ({ isOpen, onClose, propertyId, template, onSuccess }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'general',
        frequency: 'daily',
        assigned_to: [] as string[],
    });



    const [items, setItems] = useState<any[]>([]);
    const [newItem, setNewItem] = useState({
        title: '',
        description: '',
        requires_photo: true,
        requires_comment: false,
        type: 'checkbox' as 'checkbox' | 'text' | 'number' | 'yes_no',
        is_optional: false
    });
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [propertyMembers, setPropertyMembers] = useState<any[]>([]);
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);


    const supabase = React.useMemo(() => createClient(), []);

    useEffect(() => {
        const fetchMembers = async () => {
            try {
                const response = await fetch(`/api/users/list?propertyId=${propertyId}`);
                if (!response.ok) throw new Error('Failed to fetch members');
                const data = await response.json();
                setPropertyMembers(data.users || []);
            } catch (err) {
                console.error('Error fetching property members:', err);
                setToast({ message: 'Error loading property members', type: 'error' });
            }
        };

        if (isOpen && propertyId) {
            fetchMembers();
        }
    }, [supabase, propertyId, isOpen]);

    useEffect(() => {
        if (template) {
            setFormData({
                title: template.title,
                description: template.description || '',
                category: template.category || 'general',
                frequency: template.frequency || 'daily',
                assigned_to: template.assigned_to || [],

            });


            setItems(template.items || []);
        } else {
            setFormData({
                title: '',
                description: '',
                category: 'general',
                frequency: 'daily',
                assigned_to: [],
            });


            setItems([]);
        }
    }, [template, isOpen]);

    const handleAddItem = () => {
        if (!newItem.title) {
            setToast({ message: 'Item title is required', type: 'error' });
            return;
        }

        if (editingIndex !== null) {
            // Update existing item
            const updatedItems = [...items];
            updatedItems[editingIndex] = {
                ...newItem,
                order_index: editingIndex,
                is_optional: false    // Force mandatory
            };
            setItems(updatedItems);
            setEditingIndex(null);
        } else {
            // Add new item
            setItems([...items, {
                ...newItem,
                order_index: items.length,
                is_optional: false    // Force mandatory
            }]);
        }


        setNewItem({
            title: '',
            description: '',
            requires_photo: true,
            requires_comment: false,
            type: 'checkbox',
            is_optional: false
        });

    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) {
            setToast({ message: 'Title is required', type: 'error' });
            return;
        }

        setIsLoading(true);

        try {
            const payload = {
                ...formData,
                items: items.map((it, idx) => ({
                    title: it.title,
                    description: it.description || '',
                    type: it.type || 'checkbox',
                    requires_photo: it.requires_photo || false,
                    requires_comment: false,
                    is_optional: false,
                    order_index: idx
                })),
            };

            if (template) {
                // Update template
                const response = await fetch(`/api/properties/${propertyId}/sop/templates/${template.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to update template');
            } else {
                // Create template
                const response = await fetch(`/api/properties/${propertyId}/sop/templates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to create template');
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            setToast({ message: err instanceof Error ? err.message : 'Error saving template', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white border border-slate-200 rounded-xl md:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-3 md:p-5 border-b border-slate-100 bg-white sticky top-0 z-10">
                            <div>
                                <h2 className="text-lg md:text-2xl font-black text-slate-900 tracking-tight">
                                    {template ? 'Edit Checklist Template' : 'Create Checklist Template'}
                                </h2>
                                <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase tracking-widest mt-0.5">
                                    Define standard procedures
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-500 rounded-xl transition-all duration-200 flex-shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 md:p-5 custom-scrollbar">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Basic Info Section */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-primary">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Info size={16} className="font-bold" />
                                        </div>
                                        <h3 className="font-black uppercase tracking-widest text-xs">General Information</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Template Title *</label>
                                            <input
                                                type="text"
                                                placeholder="e.g., Morning Shift Perimeter Check"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-primary/30 focus:bg-white transition-all font-bold text-slate-900 text-sm"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Description</label>
                                            <textarea
                                                placeholder="Briefly describe the purpose of this checklist..."
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                rows={2}
                                                className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-primary/30 focus:bg-white transition-all font-medium text-slate-700 text-sm resize-none"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Frequency</label>
                                                <select
                                                    value={formData.frequency}
                                                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-primary/30 focus:bg-white transition-all font-bold text-slate-900 text-sm appearance-none"
                                                >
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                    <option value="on_demand">On Demand</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-1">Category</label>
                                                <input
                                                    type="text"
                                                    placeholder="General"
                                                    value={formData.category}
                                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                    className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:outline-none focus:border-primary/30 focus:bg-white transition-all font-bold text-slate-900 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider px-1">Assign To (Enrolled People)</label>
                                            <div className="relative">
                                                <div
                                                    onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                                    className="flex flex-wrap gap-1.5 p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl min-h-[45px] hover:border-primary/20 transition-all cursor-pointer group"
                                                >
                                                    {formData.assigned_to.length > 0 ? (
                                                        formData.assigned_to.map(userId => {
                                                            const member = propertyMembers.find(m => m.id === userId);
                                                            return (
                                                                <div key={userId} className="flex items-center gap-1.5 px-2.5 py-1 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-wider animate-in zoom-in-95 duration-200 shadow-sm shadow-primary/20">
                                                                    <span>{member?.full_name || 'User'}</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setFormData({
                                                                                ...formData,
                                                                                assigned_to: formData.assigned_to.filter(id => id !== userId)
                                                                            });
                                                                        }}
                                                                        className="w-3.5 h-3.5 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                                                                    >
                                                                        <X size={10} />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        <span className="text-slate-400 text-xs font-bold py-1 px-2">Select people to assign...</span>
                                                    )}

                                                    <div className="ml-auto self-center text-slate-400 group-hover:text-primary transition-colors">
                                                        <motion.div
                                                            animate={{ rotate: isUserDropdownOpen ? 180 : 0 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </motion.div>
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {isUserDropdownOpen && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={() => setIsUserDropdownOpen(false)}
                                                            />
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                                className="absolute left-0 right-0 mt-2 bg-white border-2 border-slate-100 rounded-xl max-h-48 overflow-y-auto p-1 custom-scrollbar shadow-2xl shadow-slate-200/50 z-20"
                                                            >
                                                                {propertyMembers.filter(m => !formData.assigned_to.includes(m.id)).length > 0 ? (
                                                                    <div className="grid grid-cols-1 gap-1">
                                                                        {propertyMembers.filter(m => !formData.assigned_to.includes(m.id)).map((member: any) => (
                                                                            <button
                                                                                key={member.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setFormData({
                                                                                        ...formData,
                                                                                        assigned_to: [...formData.assigned_to, member.id]
                                                                                    });
                                                                                    // Keep open for multiple selections, or close if preferred? 
                                                                                    // User said "dropdown means after clicking that box list came out", usually suggests choosing one or multiple.
                                                                                    // I'll keep it open for multi-select as it's more efficient.
                                                                                }}
                                                                                className="flex items-center gap-3 p-2 bg-white hover:bg-primary/5 rounded-lg text-left transition-all border border-transparent hover:border-primary/20 group"
                                                                            >
                                                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                                                    {member.full_name?.[0]}
                                                                                </div>
                                                                                <div className="flex flex-col min-w-0">
                                                                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider truncate">{member.full_name}</span>
                                                                                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{member.propertyRole || 'Member'}</span>
                                                                                </div>
                                                                                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <Plus size={14} className="text-primary" />
                                                                                </div>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                ) : propertyMembers.length > 0 ? (
                                                                    <div className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">All members selected</div>
                                                                ) : (
                                                                    <div className="py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">No members found</div>
                                                                )}
                                                            </motion.div>
                                                        </>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>



                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-amber-600">
                                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                            <Plus size={16} className="font-bold" />
                                        </div>
                                        <h3 className="font-black uppercase tracking-widest text-xs">Steps & Checklist</h3>
                                    </div>

                                    <div className="space-y-3">
                                        {items.length > 0 && (
                                            <div className="grid grid-cols-1 gap-3">
                                                {items.map((item, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        layout
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        className="flex items-center justify-between bg-white border-2 border-slate-100 p-3 rounded-xl group hover:border-primary/20 transition-all"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-black text-slate-500">
                                                                {idx + 1}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-sm text-slate-900">{item.title}</p>
                                                                <p className="text-xs text-slate-500 font-medium">{item.description || 'No description provided'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setNewItem(item);
                                                                    setEditingIndex(idx);
                                                                }}
                                                                className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                            >
                                                                <Edit3 size={18} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItem(idx)}
                                                                className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl space-y-4">
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    placeholder="Step Title"
                                                    value={newItem.title}
                                                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:border-primary/20 transition-all"
                                                />
                                                <textarea
                                                    placeholder="Step Description/Instructions..."
                                                    value={newItem.description}
                                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                                    rows={2}
                                                    className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-primary/20 transition-all resize-none"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Response Type</label>
                                                    <select
                                                        value={newItem.type}
                                                        onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                                                        className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-900 focus:outline-none appearance-none"
                                                    >
                                                        <option value="checkbox">Checkbox</option>
                                                        <option value="text">Text Input</option>
                                                        <option value="number">Number Input</option>
                                                        <option value="yes_no">Yes / No Toggle</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-4 px-1">
                                            </div>



                                            <button
                                                type="button"
                                                onClick={handleAddItem}
                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px]"
                                            >
                                                {editingIndex !== null ? (
                                                    <>
                                                        <Check size={16} />
                                                        Update Item
                                                    </>
                                                ) : (
                                                    <>
                                                        <Plus size={16} />
                                                        Add Step
                                                    </>
                                                )}
                                            </button>
                                            {editingIndex !== null && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingIndex(null);
                                                        setNewItem({
                                                            title: '',
                                                            description: '',
                                                            requires_photo: true,
                                                            requires_comment: false,
                                                            type: 'checkbox',
                                                            is_optional: false
                                                        });
                                                    }}
                                                    className="w-full text-xs font-black text-slate-400 p-2 hover:text-slate-600 uppercase tracking-widest"
                                                >
                                                    Cancel Editing
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div className="p-3 md:p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 md:gap-3 sticky bottom-0 z-10">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-3 md:px-5 py-2 md:py-2.5 text-slate-500 font-black uppercase tracking-widest text-[9px] md:text-[10px] hover:text-slate-800 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className="px-5 md:px-8 py-2 md:py-2.5 bg-slate-900 text-white rounded-lg md:rounded-xl font-black uppercase tracking-widest text-[9px] md:text-[10px] hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
                            >
                                {isLoading ? 'Saving...' : template ? 'Save Changes' : 'Create Template'}
                            </button>
                        </div>
                    </motion.div>

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
            )}
        </AnimatePresence>
    );
};

export default SOPTemplateFormModal;
