'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
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
        applicable_roles: [] as string[],
    });
    const [items, setItems] = useState<any[]>([]);
    const [newItem, setNewItem] = useState({
        title: '',
        description: '',
        requires_photo: false,
        requires_comment: false,
        type: 'checkbox' as 'checkbox' | 'text' | 'number' | 'yes_no',
        is_optional: false
    });
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    const ROLES = ['mst', 'hk', 'fe', 'se', 'technician', 'field_staff', 'bms_operator', 'staff', 'property_admin'];

    useEffect(() => {
        if (template) {
            setFormData({
                title: template.title,
                description: template.description,
                category: template.category || 'general',
                frequency: template.frequency,
                applicable_roles: template.applicable_roles || [],
            });
            setItems(template.items || []);
        } else {
            setFormData({
                title: '',
                description: '',
                category: 'general',
                frequency: 'daily',
                applicable_roles: [],
            });
            setItems([]);
        }
    }, [template, isOpen]);

    const handleAddItem = () => {
        if (!newItem.title) {
            setToast({ message: 'Item title is required', type: 'error' });
            return;
        }
        setItems([...items, { ...newItem, order_index: items.length }]);
        setNewItem({
            title: '',
            description: '',
            requires_photo: false,
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
            if (template) {
                // Update template
                const { error } = await supabase
                    .from('sop_templates')
                    .update({
                        title: formData.title,
                        description: formData.description,
                        category: formData.category,
                        frequency: formData.frequency,
                        applicable_roles: formData.applicable_roles,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', template.id);

                if (error) throw error;
            } else {
                // Create template
                const response = await fetch(`/api/properties/${propertyId}/sop/templates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        items: items.map(({ order_index, ...rest }) => rest),
                    }),
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg-primary border border-border-primary rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{template ? 'Edit Template' : 'Create SOP Template'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-bg-secondary rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="space-y-4 pb-6 border-b border-border-primary">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Template Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Frequency</label>
                                <select
                                    value={formData.frequency}
                                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                                    className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                                >
                                    <option>daily</option>
                                    <option>weekly</option>
                                    <option>monthly</option>
                                    <option>on_demand</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Category</label>
                                <input
                                    type="text"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Applicable Roles</label>
                            <div className="grid grid-cols-3 gap-2">
                                {ROLES.map(role => (
                                    <label key={role} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.applicable_roles.includes(role)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFormData({
                                                        ...formData,
                                                        applicable_roles: [...formData.applicable_roles, role],
                                                    });
                                                } else {
                                                    setFormData({
                                                        ...formData,
                                                        applicable_roles: formData.applicable_roles.filter(r => r !== role),
                                                    });
                                                }
                                            }}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm capitalize">{role}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Checklist Items */}
                    {!template && (
                        <div className="space-y-4 pb-6 border-b border-border-primary">
                            <h3 className="font-semibold text-lg">Checklist Items</h3>

                            {items.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-bg-secondary p-3 rounded-lg">
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm">{item.title}</p>
                                                <p className="text-xs text-text-secondary">{item.description}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(idx)}
                                                className="p-2 text-red-500 hover:bg-red-500/10 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-3 p-4 border border-dashed border-border-primary rounded-lg">
                                <input
                                    type="text"
                                    placeholder="Item title..."
                                    value={newItem.title}
                                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                    className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded text-sm focus:outline-none"
                                />
                                <textarea
                                    placeholder="Item description..."
                                    value={newItem.description}
                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                    rows={2}
                                    className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded text-sm focus:outline-none"
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold mb-1">Item Type</label>
                                        <select
                                            value={newItem.type}
                                            onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                                            className="w-full px-3 py-2 bg-bg-secondary border border-border-primary rounded text-sm focus:outline-none"
                                        >
                                            <option value="checkbox">Checkbox</option>
                                            <option value="text">Text Input</option>
                                            <option value="number">Number Input</option>
                                            <option value="yes_no">Yes/No Toggle</option>
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <label className="flex items-center gap-2 text-sm cursor-pointer mb-2">
                                            <input
                                                type="checkbox"
                                                checked={newItem.is_optional}
                                                onChange={(e) => setNewItem({ ...newItem, is_optional: e.target.checked })}
                                                className="w-4 h-4"
                                            />
                                            Optional Item
                                        </label>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newItem.requires_photo}
                                            onChange={(e) => setNewItem({ ...newItem, requires_photo: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        Requires Photo
                                    </label>
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newItem.requires_comment}
                                            onChange={(e) => setNewItem({ ...newItem, requires_comment: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        Requires Comment
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent-primary/20 text-accent-primary rounded hover:bg-accent-primary/30 transition-colors text-sm font-semibold"
                                >
                                    <Plus size={16} />
                                    Add Item
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-border-primary rounded-lg hover:bg-bg-secondary transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                </form>

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
        </div>
    );
};

export default SOPTemplateFormModal;
