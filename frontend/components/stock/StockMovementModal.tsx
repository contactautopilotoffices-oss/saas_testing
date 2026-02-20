'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { X, Scan, Package, Plus, Minus, ArrowRightLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import { createClient } from '@/frontend/utils/supabase/client';
import { Toast } from '@/frontend/components/ui/Toast';
import Skeleton from '@/frontend/components/ui/Skeleton';

const BarcodeScannerModal = dynamic(
    () => import('./BarcodeScannerModal'),
    { ssr: false, loading: () => <div>Loading scanner...</div> }
);

interface StockMovementModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    onSuccess?: () => void;
    /** If provided, skip the scan/select step and pre-select this item */
    preSelectedItemId?: string;
}

interface StockItem {
    id: string;
    name: string;
    item_code: string;
    quantity: number;
    min_threshold: number;
    barcode?: string;
    category?: string;
    location?: string;
    unit?: string;
}

const StockMovementModal: React.FC<StockMovementModalProps> = ({
    isOpen, onClose, propertyId, onSuccess, preSelectedItemId
}) => {
    const [step, setStep] = useState<'select' | 'action'>('select');
    const [items, setItems] = useState<StockItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
    const [action, setAction] = useState<'add' | 'remove'>('add');
    const [quantity, setQuantity] = useState(1);
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingItems, setIsFetchingItems] = useState(true);
    const [showScanModal, setShowScanModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    useEffect(() => {
        if (isOpen) {
            fetchItems();
            setStep('select');
            setSelectedItem(null);
            setAction('add');
            setQuantity(1);
            setNotes('');
            setSearchTerm('');
        }
    }, [isOpen]);

    // If preSelectedItemId is provided, auto-select it
    useEffect(() => {
        if (preSelectedItemId && items.length > 0) {
            const item = items.find(i => i.id === preSelectedItemId);
            if (item) {
                setSelectedItem(item);
                setStep('action');
            }
        }
    }, [preSelectedItemId, items]);

    const fetchItems = async () => {
        try {
            setIsFetchingItems(true);
            const { data, error } = await supabase
                .from('stock_items')
                .select('id, name, item_code, quantity, min_threshold, barcode, category, location, unit')
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

    const handleScanSuccess = (barcode: string) => {
        setShowScanModal(false);
        // Find item by barcode
        const foundItem = items.find(i =>
            i.barcode === barcode ||
            i.item_code === barcode ||
            i.barcode?.includes(barcode) ||
            barcode.includes(i.item_code)
        );
        if (foundItem) {
            setSelectedItem(foundItem);
            setStep('action');
        } else {
            setToast({ message: `No item found for barcode: ${barcode}`, type: 'error' });
        }
    };

    const handleSelectItem = (item: StockItem) => {
        setSelectedItem(item);
        setStep('action');
    };

    const handleSubmit = async () => {
        if (!selectedItem || quantity <= 0) {
            setToast({ message: 'Please enter a valid quantity', type: 'error' });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`/api/properties/${propertyId}/stock/movements`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemId: selectedItem.id,
                    action,
                    quantity: parseInt(quantity as any),
                    notes,
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to record movement');

            setToast({ message: `Successfully ${action === 'add' ? 'added' : 'removed'} ${quantity} ${selectedItem.unit || 'units'}`, type: 'success' });
            onSuccess?.();
            onClose();
        } catch (err) {
            setToast({ message: err instanceof Error ? err.message : 'Error recording movement', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.barcode && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
                <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>

                    {step === 'select' && (
                        <>
                            {/* Header */}
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-xl font-bold text-gray-900">Stock Movement</h2>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <X size={22} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Scan Button */}
                            <button
                                onClick={() => setShowScanModal(true)}
                                className="w-full flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 font-semibold mb-4"
                            >
                                <Scan size={22} />
                                Scan Barcode to Find Item
                            </button>

                            <div className="text-center text-sm text-gray-400 font-medium mb-4">— or select manually —</div>

                            {/* Search */}
                            <input
                                type="text"
                                placeholder="Search items by name, code, or barcode..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 mb-3 text-sm"
                            />

                            {/* Item List */}
                            {isFetchingItems ? (
                                <Skeleton className="h-40" />
                            ) : (
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                    {filteredItems.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 text-sm">
                                            No items found
                                        </div>
                                    ) : (
                                        filteredItems.map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleSelectItem(item)}
                                                className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl transition-all text-left group"
                                            >
                                                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                    <Package size={18} className="text-blue-600" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                                                    <p className="text-xs text-gray-400">{item.item_code} • Qty: {item.quantity} {item.unit || 'units'}</p>
                                                </div>
                                                <div className={`px-2 py-1 rounded-lg text-xs font-bold ${item.quantity < (item.min_threshold || 10) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                    {item.quantity}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {step === 'action' && selectedItem && (
                        <>
                            {/* Header */}
                            <div className="flex justify-between items-center mb-5">
                                <button
                                    onClick={() => { setStep('select'); setSelectedItem(null); }}
                                    className="text-sm text-blue-600 font-semibold hover:text-blue-700"
                                >
                                    ← Back
                                </button>
                                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                    <X size={22} className="text-gray-500" />
                                </button>
                            </div>

                            {/* Item Info Card */}
                            <div className="bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-4 mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <Package size={24} className="text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">{selectedItem.name}</h3>
                                        <p className="text-sm text-gray-500">
                                            Code: {selectedItem.item_code}
                                            {selectedItem.category && ` • ${selectedItem.category}`}
                                            {selectedItem.location && ` • ${selectedItem.location}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-sm text-gray-500">Current Stock:</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedItem.quantity < (selectedItem.min_threshold || 10) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {selectedItem.quantity} {selectedItem.unit || 'units'}
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="grid grid-cols-2 gap-3 mb-5">
                                <button
                                    onClick={() => setAction('add')}
                                    className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${action === 'add'
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                        : 'bg-gray-100 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600'
                                        }`}
                                >
                                    <Plus size={18} />
                                    Add Stock
                                </button>
                                <button
                                    onClick={() => setAction('remove')}
                                    className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${action === 'remove'
                                        ? 'bg-red-600 text-white shadow-md shadow-red-500/20'
                                        : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                                        }`}
                                >
                                    <Minus size={18} />
                                    Take Stock
                                </button>
                            </div>

                            {/* Quantity Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-semibold mb-2 text-gray-700">Quantity</label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600 font-bold text-lg"
                                    >−</button>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                        min="1"
                                        className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-center text-lg font-bold"
                                    />
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors text-gray-600 font-bold text-lg"
                                    >+</button>
                                </div>
                                {action === 'remove' && quantity > selectedItem.quantity && (
                                    <p className="text-xs text-red-500 mt-1 font-medium">⚠ Cannot take more than current stock ({selectedItem.quantity})</p>
                                )}
                            </div>

                            {/* Notes */}
                            <div className="mb-5">
                                <label className="block text-sm font-semibold mb-2 text-gray-700">Notes (optional)</label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Reason for the movement..."
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400 text-sm"
                                />
                            </div>

                            {/* Preview */}
                            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
                                <span className="text-gray-500">Result: </span>
                                <span className="font-bold text-gray-900">
                                    {selectedItem.quantity} {action === 'add' ? '+' : '−'} {quantity} = {
                                        action === 'add'
                                            ? selectedItem.quantity + quantity
                                            : Math.max(0, selectedItem.quantity - quantity)
                                    } {selectedItem.unit || 'units'}
                                </span>
                            </div>

                            {/* Submit */}
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || (action === 'remove' && quantity > selectedItem.quantity)}
                                className={`w-full px-4 py-3 rounded-xl font-bold transition-all disabled:opacity-50 ${action === 'add'
                                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 shadow-md shadow-emerald-500/20'
                                    : 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-500/20'
                                    }`}
                            >
                                {isLoading ? 'Processing...' : action === 'add' ? `+ Add ${quantity} ${selectedItem.unit || 'units'}` : `− Take ${quantity} ${selectedItem.unit || 'units'}`}
                            </button>
                        </>
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

            {/* Barcode Scanner Modal */}
            <Suspense fallback={null}>
                <BarcodeScannerModal
                    isOpen={showScanModal}
                    onClose={() => setShowScanModal(false)}
                    onScanSuccess={handleScanSuccess}
                    title="Scan Item Barcode"
                />
            </Suspense>
        </>
    );
};

export default StockMovementModal;
