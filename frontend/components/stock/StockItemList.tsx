'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Search, Plus, Trash2, Edit2, Barcode, Scan } from 'lucide-react';
import dynamic from 'next/dynamic';
import { createClient } from '@/frontend/utils/supabase/client';
import Skeleton from '@/frontend/components/ui/Skeleton';
import StockItemFormModal from './StockItemFormModal';
import StockItemDetailsModal from './StockItemDetailsModal';
import { Toast } from '@/frontend/components/ui/Toast';

const BarcodeScannerModal = dynamic(
    () => import('./BarcodeScannerModal'),
    { ssr: false, loading: () => <div>Loading scanner...</div> }
);

interface StockItemListProps {
    propertyId: string;
    onRefresh?: () => void;
}

interface StockItem {
    id: string;
    item_code: string;
    name: string;
    category?: string;
    quantity: number;
    min_threshold?: number;
    location?: string;
    unit?: string;
    barcode?: string;
    barcode_format?: string;
    qr_code_data?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
    description?: string;
}

const StockItemList: React.FC<StockItemListProps> = ({ propertyId, onRefresh }) => {
    const [items, setItems] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingItem, setEditingItem] = useState<StockItem | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showScanModal, setShowScanModal] = useState(false);
    const [viewingItem, setViewingItem] = useState<StockItem | null>(null);
    const supabase = React.useMemo(() => createClient(), []);

    const fetchItems = useCallback(async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('stock_items')
                .select('*')
                .eq('property_id', propertyId)
                .order('name', { ascending: true });

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            setToast({ message: 'Error loading items', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [propertyId, supabase]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleDelete = async (itemId: string) => {
        if (!confirm('Are you sure you want to delete this item?')) return;

        try {
            const { error } = await supabase.from('stock_items').delete().eq('id', itemId);
            if (error) throw error;

            setItems(items.filter(i => i.id !== itemId));
            setToast({ message: 'Item deleted', type: 'success' });
        } catch (err) {
            setToast({ message: 'Error deleting item', type: 'error' });
        }
    };

    const handleFormSuccess = () => {
        setShowFormModal(false);
        setEditingItem(null);
        fetchItems();
        onRefresh?.();
        setToast({ message: editingItem ? 'Item updated' : 'Item created', type: 'success' });
    };

    const handleScanSuccess = (barcode: string) => {
        setSearchTerm(barcode);
        setShowScanModal(false);
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.item_code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = !categoryFilter || item.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const categories = Array.from(new Set(items.map(i => i.category).filter(Boolean)));

    if (isLoading) {
        return <Skeleton className="h-96" />;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">Inventory Items</h3>
                <button
                    onClick={() => {
                        setEditingItem(null);
                        setShowFormModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
                >
                    <Plus size={18} />
                    Add Item
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative flex gap-2">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 text-text-secondary" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                        />
                    </div>
                    <button
                        onClick={() => setShowScanModal(true)}
                        className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors flex items-center gap-2"
                        title="Scan to search"
                    >
                        <Scan size={20} />
                        <span className="hidden md:inline">Scan</span>
                    </button>
                </div>
                {categories.length > 0 && (
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 bg-bg-secondary border border-border-primary rounded-lg focus:outline-none focus:border-accent-primary"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-border-primary">
                            <th className="text-left py-3 px-4 font-semibold">Code</th>
                            <th className="text-left py-3 px-4 font-semibold">Barcode</th>
                            <th className="text-left py-3 px-4 font-semibold">Name</th>
                            <th className="text-left py-3 px-4 font-semibold">Category</th>
                            <th className="text-right py-3 px-4 font-semibold">Quantity</th>
                            <th className="text-center py-3 px-4 font-semibold">Location</th>
                            <th className="text-center py-3 px-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(item => {
                            const isLowStock = item.quantity < (item.min_threshold || 10);
                            return (
                                <tr key={item.id} className="border-b border-border-primary hover:bg-bg-secondary transition-colors">
                                    <td className="py-3 px-4 text-sm font-mono">{item.item_code}</td>
                                    <td className="py-3 px-4">
                                        {item.barcode ? (
                                            <button
                                                onClick={() => setViewingItem(item)}
                                                className="flex items-center gap-2 text-accent-primary hover:underline"
                                            >
                                                <Barcode size={16} />
                                                <span className="text-xs font-mono">{item.barcode.substring(0, 12)}...</span>
                                            </button>
                                        ) : (
                                            <span className="text-text-secondary text-xs">Not generated</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">{item.name}</td>
                                    <td className="py-3 px-4 text-sm">{item.category || '-'}</td>
                                    <td className={`py-3 px-4 text-right font-semibold ${isLowStock ? 'text-red-500' : ''}`}>
                                        <span className={`px-3 py-1 rounded-full text-sm ${isLowStock ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                                            }`}>
                                            {item.quantity} {item.unit || 'units'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center text-sm">{item.location || '-'}</td>
                                    <td className="py-3 px-4 text-center flex justify-center gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingItem(item);
                                                setShowFormModal(true);
                                            }}
                                            className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
                                        >
                                            <Edit2 size={16} className="text-accent-primary" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
                                        >
                                            <Trash2 size={16} className="text-red-500" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filteredItems.length === 0 && (
                <div className="text-center py-12 text-text-secondary">
                    No items found. Create one to get started!
                </div>
            )}

            {/* Modals */}
            <StockItemFormModal
                isOpen={showFormModal}
                onClose={() => {
                    setShowFormModal(false);
                    setEditingItem(null);
                }}
                propertyId={propertyId}
                item={editingItem}
                onSuccess={handleFormSuccess}
            />

            <Suspense fallback={null}>
                <BarcodeScannerModal
                    isOpen={showScanModal}
                    onClose={() => setShowScanModal(false)}
                    onScanSuccess={handleScanSuccess}
                    title="Scan to Search"
                />
            </Suspense>

            {viewingItem && (
                <StockItemDetailsModal
                    isOpen={!!viewingItem}
                    onClose={() => setViewingItem(null)}
                    item={viewingItem}
                />
            )}

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

export default StockItemList;
