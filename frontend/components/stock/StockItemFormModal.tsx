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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">{item ? 'Edit Item' : 'Add Stock Item'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Item Name *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                            placeholder="Enter item name"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Item Code</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.item_code}
                                    onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                                    placeholder="Scan or enter manually"
                                    disabled={!!item}
                                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 disabled:opacity-50"
                                />
                                {!item && (
                                    <button
                                        type="button"
                                        onClick={() => setShowScanModal(true)}
                                        className="px-3 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-1"
                                        title="Scan barcode"
                                    >
                                        <Scan size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Unit</label>
                            <input
                                type="text"
                                value={formData.unit}
                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                placeholder="e.g. Cleaning, Tools"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Min Threshold</label>
                            <input
                                type="number"
                                value={formData.min_threshold}
                                onChange={(e) => setFormData({ ...formData, min_threshold: parseInt(e.target.value) })}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            />
                        </div>
                    </div>

                    {!item && (
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-700">Initial Quantity</label>
                            <input
                                type="number"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                min="0"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Location</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            placeholder="e.g. Warehouse A, Room 101"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            placeholder="Optional description..."
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 resize-none"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-gray-700 font-semibold"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50 shadow-md shadow-blue-500/20"
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
