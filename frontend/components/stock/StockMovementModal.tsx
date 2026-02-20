'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/frontend/utils/supabase/client';
import { Toast } from '@/frontend/components/ui/Toast';
import Skeleton from '@/frontend/components/ui/Skeleton';

interface StockMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    onSuccess?: () => void;
}

const StockMovementModal: React.FC<StockMovementModalProps> = ({ isOpen, onClose, propertyId, onSuccess }) => {
    const [items, setItems] = useState<any[]>([]);
    const [selectedItemId, setSelectedItemId] = useState('');
    const [action, setAction] = useState<'add' | 'remove' | 'adjust'>('add');
    const [quantity, setQuantity] = useState(0);
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingItems, setIsFetchingItems] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    useEffect(() => {
        if (isOpen) {
            fetchItems();
        }
    }, [isOpen]);

    const fetchItems = async () => {
        try {
            setIsFetchingItems(true);
            const { data, error } = await supabase
                .from('stock_items')
                .select('id, name, item_code, quantity, min_threshold')
                .eq('property_id', propertyId)
                .order('name', { ascending: true });

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            setToast({ message: 'Error loading items', type: 'error' });
        } finally {
            setIsFetchingItems(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItemId || quantity <= 0) {
            setToast({ message: 'Please select an item and enter a quantity', type: 'error' });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`/api/properties/${propertyId}/stock/movements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: selectedItemId,
                    action,
                    quantity: parseInt(quantity as any),
                    notes,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to record movement');

            setToast({ message: 'Stock movement recorded', type: 'success' });
            onSuccess?.();
            resetForm();
            onClose();
        } catch (err) {
            setToast({ message: err instanceof Error ? err.message : 'Error recording movement', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setSelectedItemId('');
        setAction('add');
        setQuantity(0);
        setNotes('');
    };

    if (!isOpen) return null;

    const selectedItem = items.find(i => i.id === selectedItemId);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg-primary border border-border-primary rounded-2xl p-6 max-w-lg w-full mx-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Record Stock Movement</h2>
                    <button onClick={onClose} className="p-2 hover:bg-bg-secondary rounded-lg">
                        <X size={24} />
                    </button>
                </div>

                {isFetchingItems ? (
                    <Skeleton className="h-48" />
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Select Item *</label>
                            <select
                                value={selectedItemId}
                                onChange={(e) => setSelectedItemId(e.target.value)}
                                className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                                required
                            >
                                <option value="">-- Choose Item --</option>
                                {items.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.name} ({item.item_code}) - Current: {item.quantity}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Action *</label>
                            <div className="flex gap-3">
                                {['add', 'remove', 'adjust'].map(act => (
                                    <label key={act} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="action"
                                            value={act}
                                            checked={action === act}
                                            onChange={() => setAction(act as 'add' | 'remove' | 'adjust')}
                                            className="w-4 h-4"
                                        />
                                        <span className="capitalize">{act}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Quantity *</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                                min="0"
                                className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                                placeholder="0"
                                required
                            />
                            {selectedItem && (
                                <p className="text-xs text-text-secondary mt-2">
                                    Current quantity: <strong>{selectedItem.quantity}</strong>
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                placeholder="Optional notes..."
                                className="w-full px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    resetForm();
                                }}
                                className="flex-1 px-4 py-2 border border-border-primary rounded-lg hover:bg-bg-secondary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? 'Recording...' : 'Record Movement'}
                            </button>
                        </div>
                    </form>
                )}

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

export default StockMovementModal;
