'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { X, Scan } from 'lucide-react';
import dynamic from 'next/dynamic';
import { createClient } from '@/frontend/utils/supabase/client';
import { Toast } from '@/frontend/components/ui/Toast';

const BarcodeScannerModal = dynamic(
    () => import('./BarcodeScannerModal'),
    { ssr: false, loading: () => <div>Loading scanner...</div> }
);

interface StockItemFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    item?: any;
    onSuccess?: () => void;
}

const StockItemFormModal: React.FC<StockItemFormModalProps> = ({ isOpen, onClose, propertyId, item, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        item_code: '',
        category: '',
        unit: 'units',
        quantity: 0,
        min_threshold: 10,
        location: '',
        description: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showScanModal, setShowScanModal] = useState(false);
    const supabase = React.useMemo(() => createClient(), []);

    useEffect(() => {
        if (item) {
            setFormData({
                name: item.name || '',
                item_code: item.item_code || '',
                category: item.category || '',
                unit: item.unit || 'units',
                quantity: item.quantity || 0,
                min_threshold: item.min_threshold || 10,
                location: item.location || '',
                description: item.description || '',
            });
        } else {
            setFormData({
                name: '',
                item_code: '',
                category: '',
                unit: 'units',
                quantity: 0,
                min_threshold: 10,
                location: '',
                description: '',
            });
        }
    }, [item, isOpen]);

    const handleScanSuccess = (barcode: string) => {
        setFormData({ ...formData, item_code: barcode });
        setShowScanModal(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            setToast({ message: 'Name is required', type: 'error' });
            return;
        }

        setIsLoading(true);

        try {
            if (item) {
                // Update
                const { error } = await supabase
                    .from('stock_items')
                    .update({
                        name: formData.name,
                        category: formData.category,
                        unit: formData.unit,
                        min_threshold: formData.min_threshold,
                        location: formData.location,
                        description: formData.description,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', item.id);

                if (error) throw error;
            } else {
                // Create
                const response = await fetch(`/api/properties/${propertyId}/stock/items`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        quantity: parseInt(formData.quantity as any),
                        min_threshold: parseInt(formData.min_threshold as any),
                    }),
                });

                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to create item');
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            setToast({ message: err instanceof Error ? err.message : 'Error saving item', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg-primary border border-border-primary rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{item ? 'Edit Item' : 'Add Stock Item'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-bg-secondary rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2">Item Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Item Code</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.item_code}
                                    onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                                    placeholder="Scan or enter manually"
                                    disabled={!!item}
                                    className="flex-1 px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary disabled:opacity-50"
                                />
                                {!item && (
                                    <button
                                        type="button"
                                        onClick={() => setShowScanModal(true)}
                                        className="px-3 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors flex items-center gap-1"
                                        title="Scan barcode"
                                    >
                                        <Scan size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Unit</label>
                            <input
                                type="text"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Min Threshold</label>
                            <input
                                type="number"
                                value={formData.min_threshold}
                                onChange={(e) => setFormData({ ...formData, min_threshold: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                            />
                        </div>
                    </div>

                    {!item && (
                        <div>
                            <label className="block text-sm font-semibold mb-2">Initial Quantity</label>
                            <input
                                type="number"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                min="0"
                                className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold mb-2">Location</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
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

                    <div className="flex gap-3 pt-4">
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
                            {isLoading ? 'Saving...' : 'Save Item'}
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

                <Suspense fallback={null}>
                    <BarcodeScannerModal
                        isOpen={showScanModal}
                        onClose={() => setShowScanModal(false)}
                        onScanSuccess={handleScanSuccess}
                        title="Scan Item Code"
                    />
                </Suspense>
            </div>
        </div>
    );
};

export default StockItemFormModal;
