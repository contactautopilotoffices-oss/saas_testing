'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, TrendingDown, AlertTriangle, Package, Scan, ArrowUpCircle, ArrowDownCircle, Clock } from 'lucide-react';
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

interface Movement {
    id: string;
    action: string;
    quantity: number;
    notes: string | null;
    created_at: string;
    stock_items: { name: string; item_code: string; unit?: string } | null;
    users: { full_name: string } | null;
}

const StockDashboard: React.FC<StockDashboardProps> = ({ propertyId }) => {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('inventory');
    const [showMovementModal, setShowMovementModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [stats, setStats] = useState({ totalItems: 0, lowStockCount: 0, totalValue: 0 });
    const [movements, setMovements] = useState<Movement[]>([]);
    const [isLoadingMovements, setIsLoadingMovements] = useState(false);
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
                totalValue: 0,
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : JSON.stringify(err);
            console.error('Error fetching stock stats:', msg);
        } finally {
            setIsLoading(false);
        }
    }, [propertyId, supabase]);

    const fetchMovements = useCallback(async () => {
        try {
            setIsLoadingMovements(true);
            const { data, error } = await supabase
                .from('stock_movements')
                .select('id, action, quantity_change, notes, created_at, quantity_before, quantity_after, stock_items:item_id(name, item_code, unit), users:user_id(full_name)')
                .eq('property_id', propertyId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            setMovements((data || []).map((m: any) => ({
                ...m,
                quantity: Math.abs(m.quantity_change),
            })));
        } catch (err) {
            console.error('Error fetching movements:', err);
        } finally {
            setIsLoadingMovements(false);
        }
    }, [propertyId, supabase]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        if (activeSubTab === 'movements') {
            fetchMovements();
        }
    }, [activeSubTab, fetchMovements]);

    const handleMovementSuccess = () => {
        setShowMovementModal(false);
        setToast({ message: 'Stock movement recorded successfully', type: 'success' });
        fetchStats();
        fetchMovements();
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="w-full space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Items</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalItems}</p>
                        </div>
                        <Package className="text-blue-500" size={32} />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Low Stock</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.lowStockCount}</p>
                        </div>
                        <AlertTriangle className="text-orange-500" size={32} />
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <p className="text-lg font-bold text-gray-900">Operational</p>
                        </div>
                        <TrendingDown className="text-green-500" size={32} />
                    </div>
                </div>
            </div>

            {/* Sub Tabs */}
            <div className="flex gap-3 border-b border-gray-200">
                <button
                    onClick={() => setActiveSubTab('inventory')}
                    className={`px-4 py-3 font-semibold text-sm transition-colors ${activeSubTab === 'inventory'
                        ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Inventory
                </button>
                <button
                    onClick={() => setActiveSubTab('movements')}
                    className={`px-4 py-3 font-semibold text-sm transition-colors ${activeSubTab === 'movements'
                        ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Stock Movements
                </button>
                <button
                    onClick={() => setActiveSubTab('reports')}
                    className={`px-4 py-3 font-semibold text-sm transition-colors ${activeSubTab === 'reports'
                        ? 'text-blue-600 border-b-2 border-blue-600 -mb-px'
                        : 'text-gray-500 hover:text-gray-700'
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
                            <div className="space-y-5">
                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => setShowMovementModal(true)}
                                        className="flex-1 flex items-center justify-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/20 font-semibold"
                                    >
                                        <Scan size={22} />
                                        Scan Barcode & Record Movement
                                    </button>
                                </div>

                                {/* Movement History */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Movements</h3>
                                    {isLoadingMovements ? (
                                        <Skeleton className="h-48" />
                                    ) : movements.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <Clock size={40} className="mx-auto mb-3 opacity-40" />
                                            <p className="font-medium">No movements recorded yet</p>
                                            <p className="text-sm mt-1">Scan a barcode to record your first movement</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {movements.map(mv => (
                                                <div key={mv.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-gray-100 transition-colors">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${mv.action === 'add' ? 'bg-emerald-100' : mv.action === 'remove' ? 'bg-red-100' : 'bg-blue-100'}`}>
                                                        {mv.action === 'add' ? (
                                                            <ArrowUpCircle size={20} className="text-emerald-600" />
                                                        ) : mv.action === 'remove' ? (
                                                            <ArrowDownCircle size={20} className="text-red-600" />
                                                        ) : (
                                                            <Package size={20} className="text-blue-600" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-900 text-sm">
                                                            {(mv.stock_items as any)?.name || 'Unknown Item'}
                                                        </p>
                                                        <p className="text-xs text-gray-400">
                                                            {mv.users?.full_name || 'System'}
                                                            {mv.notes && ` • ${mv.notes}`}
                                                        </p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0">
                                                        <span className={`text-sm font-bold ${mv.action === 'add' ? 'text-emerald-600' : mv.action === 'remove' ? 'text-red-600' : 'text-blue-600'}`}>
                                                            {mv.action === 'add' ? '+' : mv.action === 'remove' ? '−' : '↔'}{mv.quantity} {(mv.stock_items as any)?.unit || ''}
                                                        </span>
                                                        <p className="text-xs text-gray-400">{formatTime(mv.created_at)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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

