'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Play, Trash2 } from 'lucide-react';
import { createClient } from '@/frontend/utils/supabase/client';
import Skeleton from '@/frontend/components/ui/Skeleton';
import { Toast } from '@/frontend/components/ui/Toast';
import SOPTemplateFormModal from './SOPTemplateFormModal';

interface SOPTemplateManagerProps {
    propertyId: string;
    isAdmin?: boolean;
    onSelectTemplate: (templateId: string) => void;
    onRefresh?: () => void;
}

const SOPTemplateManager: React.FC<SOPTemplateManagerProps> = ({ propertyId, isAdmin = false, onSelectTemplate, onRefresh }) => {
    const [templates, setTemplates] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<any>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    const fetchTemplates = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('sop_templates')
                .select(`
                    *,
                    items:sop_checklist_items(count)
                `)
                .eq('property_id', propertyId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (err) {
            setToast({ message: 'Error loading templates', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleDelete = async (templateId: string) => {
        if (!confirm('Deactivate this template?')) return;

        try {
            const { error } = await supabase
                .from('sop_templates')
                .update({ is_active: false })
                .eq('id', templateId);

            if (error) throw error;

            setTemplates(templates.filter(t => t.id !== templateId));
            setToast({ message: 'Template deactivated', type: 'success' });
        } catch (err) {
            setToast({ message: 'Error deactivating template', type: 'error' });
        }
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setEditingTemplate(null);
        fetchTemplates();
        setToast({ message: editingTemplate ? 'Template updated' : 'Template created', type: 'success' });
    };

    if (isLoading) {
        return <Skeleton className="h-96" />;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">SOP Templates</h3>
                {isAdmin && (
                    <button
                        onClick={() => {
                            setEditingTemplate(null);
                            setShowFormModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors"
                    >
                        <Plus size={18} />
                        New Template
                    </button>
                )}
            </div>

            {/* Templates List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map(template => (
                    <div key={template.id} className="border border-border-primary rounded-xl p-4 hover:border-accent-primary/50 transition-colors">
                        <div>
                            <h4 className="font-bold text-lg mb-2">{template.title}</h4>
                            <p className="text-sm text-text-secondary mb-3">{template.description}</p>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="text-xs px-2 py-1 bg-bg-secondary rounded-full">
                                    {template.frequency}
                                </span>
                                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                                    {template.items?.length || 0} items
                                </span>
                            </div>

                            {template.applicable_roles && template.applicable_roles.length > 0 && (
                                <div className="text-xs text-text-secondary mb-4">
                                    Roles: {template.applicable_roles.join(', ')}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-border-primary">
                            <button
                                onClick={() => onSelectTemplate(template.id)}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-primary/20 text-accent-primary rounded-lg hover:bg-accent-primary/30 transition-colors text-sm font-semibold"
                            >
                                <Play size={16} />
                                Start
                            </button>
                            <button
                                onClick={() => {
                                    setEditingTemplate(template);
                                    setShowFormModal(true);
                                }}
                                className="flex-1 px-3 py-2 border border-border-primary rounded-lg hover:bg-bg-secondary transition-colors text-sm font-semibold"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => handleDelete(template.id)}
                                className="px-3 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {templates.length === 0 && (
                <div className="text-center py-12 text-text-secondary">
                    No templates created yet. Create one to get started!
                </div>
            )}

            {/* Modals */}
            <SOPTemplateFormModal
                isOpen={showFormModal}
                onClose={() => {
                    setShowFormModal(false);
                    setEditingTemplate(null);
                }}
                propertyId={propertyId}
                template={editingTemplate}
                onSuccess={handleFormSuccess}
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

export default SOPTemplateManager;
