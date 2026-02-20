'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, TrendingDown, AlertTriangle, Package } from 'lucide-react';
import { createClient } from '@/frontend/utils/supabase/client';
import { Toast } from '@/frontend/components/ui/Toast';
import Skeleton from '@/frontend/components/ui/Skeleton';
import StockItemList from './StockItemList';
import StockMovementModal from './StockMovementModal';
import StockReportView from './StockReportView';

type SubTab = 'inventory' | 'movements' | 'reports';

interface StockDashboardProps {
    propertyId: string;
}

const StockDashboard: React.FC<StockDashboardProps> = ({ propertyId }) => {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('inventory');
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [stats, setStats] = useState({ totalItems: 0, lowStockCount: 0, totalValue: 0 });
    const supabase = React.useMemo(() => createClient(), []);

    const fetchStats = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('stock_items')
                .select('*')
                .eq('property_id', propertyId);

            if (error) throw error;

            const items = data || [];
            const lowStockCount = items.filter(i => i.quantity < (i.min_threshold || 10)).length;

            setStats({
                totalItems: items.length,
                lowStockCount,
                totalValue: 0, // Can be calculated if pricing is added
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : JSON.stringify(err);
            console.error('Error fetching stock stats:', msg);
        } finally {
            setIsLoading(false);
        }
    }, [propertyId, supabase]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    const handleMovementSuccess = () => {
        setShowMovementModal(false);
        setToast({ message: 'Stock movement recorded successfully', type: 'success' });
        fetchStats();
    };

    return (
        <div className="w-full space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-text-secondary">Total Items</p>
                            <p className="text-2xl font-bold text-text-primary">{stats.totalItems}</p>
                        </div>
                        <Package className="text-blue-500" size={32} />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-text-secondary">Low Stock</p>
                            <p className="text-2xl font-bold text-text-primary">{stats.lowStockCount}</p>
                        </div>
                        <AlertTriangle className="text-orange-500" size={32} />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-text-secondary">Status</p>
                            <p className="text-lg font-bold text-text-primary">Operational</p>
                        </div>
                        <TrendingDown className="text-green-500" size={32} />
                    </div>
                </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex gap-3 border-b border-border-primary">
                <button
                    onClick={() => setActiveSubTab('inventory')}
                    className={`px-4 py-3 font-semibold text-sm transition-colors ${activeSubTab === 'inventory'
                        ? 'text-accent-primary border-b-2 border-accent-primary -mb-px'
                        : 'text-text-secondary hover:text-text-primary'
                        }`}
                >
                    Inventory
                </button>
                <button
                    onClick={() => setActiveSubTab('movements')}
                    className={`px-4 py-3 font-semibold text-sm transition-colors ${activeSubTab === 'movements'
                        ? 'text-accent-primary border-b-2 border-accent-primary -mb-px'
                        : 'text-text-secondary hover:text-text-primary'
                        }`}
                >
                    Stock Movements
                </button>
                <button
                    onClick={() => setActiveSubTab('reports')}
                    className={`px-4 py-3 font-semibold text-sm transition-colors ${activeSubTab === 'reports'
                        ? 'text-accent-primary border-b-2 border-accent-primary -mb-px'
                        : 'text-text-secondary hover:text-text-primary'
                        }`}
                >
                    Reports
                </button>
            </div>

            {/* Content */}
            <div className="mt-6">
                {isLoading ? (
                    <Skeleton className="h-96" />
                ) : (
                    <>
                        {activeSubTab === 'inventory' && (
                            <StockItemList propertyId={propertyId} onRefresh={fetchStats} />
                        )}

                        {activeSubTab === 'movements' && (
                            <div className="flex justify-center">
                                <button
                                    onClick={() => setShowMovementModal(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-accent-primary text-white rounded-xl hover:bg-accent-primary/90 transition-colors font-semibold"
                                >
                                    <Plus size={20} />
                                    Record Stock Movement
                                </button>
                            </div>
                        )}

                        {activeSubTab === 'reports' && (
                            <StockReportView propertyId={propertyId} />
                        )}
                    </>
                )}
            </div>

            {/* Modals */}
            <StockMovementModal
                isOpen={showMovementModal}
                onClose={() => setShowMovementModal(false)}
                propertyId={propertyId}
                onSuccess={handleMovementSuccess}
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

export default StockDashboard;
