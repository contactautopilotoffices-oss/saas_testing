'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Package, AlertTriangle, ArrowUpCircle, ArrowDownCircle,
    TrendingUp, Loader2, BarChart3, Activity, ShieldAlert, Box
} from 'lucide-react';
import { createClient } from '@/frontend/utils/supabase/client';

interface StockReportViewProps {
    propertyId?: string;
    orgId?: string;
}

interface StockItem {
    id: string;
    name: string;
    item_code: string;
    quantity: number;
    min_threshold: number;
    category?: string;
    unit?: string;
}

interface Movement {
    id: string;
    action: string;
    quantity_change: number;
    created_at: string;
    item_id: string;
    stock_items: { name: string; item_code: string; unit?: string } | null;
    users: { full_name: string } | null;
}

const StockReportView: React.FC<StockReportViewProps> = ({ propertyId }) => {
    const [items, setItems] = useState<StockItem[]>([]);
    const [movements, setMovements] = useState<Movement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState<'7d' | '30d' | 'all'>('30d');
    const supabase = useMemo(() => createClient(), []);

    const fetchData = useCallback(async () => {
        if (!propertyId) return;
        setIsLoading(true);

        try {
            // Fetch items
            const { data: itemsData } = await supabase
                .from('stock_items')
                .select('id, name, item_code, quantity, min_threshold, category, unit')
                .eq('property_id', propertyId)
                .order('name');

            // Fetch movements with date filter
            let movementQuery = supabase
                .from('stock_movements')
                .select('id, action, quantity_change, created_at, item_id, stock_items:item_id(name, item_code, unit), users:user_id(full_name)')
                .eq('property_id', propertyId)
                .order('created_at', { ascending: false })
                .limit(500);

            if (dateRange !== 'all') {
                const days = dateRange === '7d' ? 7 : 30;
                const since = new Date();
                since.setDate(since.getDate() - days);
                movementQuery = movementQuery.gte('created_at', since.toISOString());
            }

            const { data: movementsData } = await movementQuery;

            setItems(itemsData || []);
            setMovements(movementsData || []);
        } catch (err) {
            console.error('Error fetching report data:', err);
        } finally {
            setIsLoading(false);
        }
    }, [propertyId, supabase, dateRange]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ---- Computed analytics ----
    const totalItems = items.length;
    const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
    const lowStockItems = items.filter(i => i.quantity <= (i.min_threshold || 5));
    const outOfStockItems = items.filter(i => i.quantity === 0);

    const totalAdded = movements
        .filter(m => m.action === 'add')
        .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0);

    const totalRemoved = movements
        .filter(m => m.action === 'remove')
        .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0);

    const netChange = totalAdded - totalRemoved;

    // Category breakdown
    const categoryMap = useMemo(() => {
        const map: Record<string, { count: number; totalQty: number; lowStock: number }> = {};
        items.forEach(item => {
            const cat = item.category || 'Uncategorized';
            if (!map[cat]) map[cat] = { count: 0, totalQty: 0, lowStock: 0 };
            map[cat].count++;
            map[cat].totalQty += item.quantity;
            if (item.quantity <= (item.min_threshold || 5)) map[cat].lowStock++;
        });
        return Object.entries(map).sort((a, b) => b[1].count - a[1].count);
    }, [items]);

    // Top movers (most frequently moved items)
    const topMovers = useMemo(() => {
        const map: Record<string, { name: string; code: string; unit: string; added: number; removed: number; total: number }> = {};
        movements.forEach(m => {
            const id = m.item_id;
            const name = (m.stock_items as any)?.name || 'Unknown';
            const code = (m.stock_items as any)?.item_code || '';
            const unit = (m.stock_items as any)?.unit || 'units';
            if (!map[id]) map[id] = { name, code, unit, added: 0, removed: 0, total: 0 };
            const abs = Math.abs(m.quantity_change);
            if (m.action === 'add') map[id].added += abs;
            else if (m.action === 'remove') map[id].removed += abs;
            map[id].total += abs;
        });
        return Object.entries(map)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 5);
    }, [movements]);

    // Daily movement activity (last 7 or 30 days)
    const dailyActivity = useMemo(() => {
        const map: Record<string, { added: number; removed: number }> = {};
        movements.forEach(m => {
            const day = new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!map[day]) map[day] = { added: 0, removed: 0 };
            const abs = Math.abs(m.quantity_change);
            if (m.action === 'add') map[day].added += abs;
            else if (m.action === 'remove') map[day].removed += abs;
        });
        return Object.entries(map).reverse().slice(0, 14);
    }, [movements]);

    const maxDailyValue = useMemo(() => {
        return Math.max(1, ...dailyActivity.map(([, d]) => Math.max(d.added, d.removed)));
    }, [dailyActivity]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Date Range Filter */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <BarChart3 size={20} className="text-blue-500" />
                    Stock Analytics
                </h3>
                <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                    {(['7d', '30d', 'all'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${dateRange === range
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Package size={16} className="text-blue-600" />
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Items</p>
                    <p className="text-2xl font-black text-gray-900">{totalItems}</p>
                    <p className="text-xs text-gray-400 mt-1">{totalUnits} total units</p>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                            <ArrowUpCircle size={16} className="text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Added</p>
                    <p className="text-2xl font-black text-emerald-600">+{totalAdded}</p>
                    <p className="text-xs text-gray-400 mt-1">{movements.filter(m => m.action === 'add').length} movements</p>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                            <ArrowDownCircle size={16} className="text-red-600" />
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Removed</p>
                    <p className="text-2xl font-black text-red-600">−{totalRemoved}</p>
                    <p className="text-xs text-gray-400 mt-1">{movements.filter(m => m.action === 'remove').length} movements</p>
                </div>

                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
                            <TrendingUp size={16} className="text-violet-600" />
                        </div>
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Net Change</p>
                    <p className={`text-2xl font-black ${netChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {netChange >= 0 ? '+' : ''}{netChange}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{movements.length} total movements</p>
                </div>
            </div>

            {/* Movement Activity Chart (simple bar chart) */}
            {dailyActivity.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity size={16} className="text-blue-500" />
                        Daily Movement Activity
                    </h4>
                    <div className="flex items-end gap-1 h-32">
                        {dailyActivity.map(([day, data]) => (
                            <div key={day} className="flex-1 flex flex-col items-center gap-0.5" title={`${day}: +${data.added} / -${data.removed}`}>
                                {/* Added bar (green) */}
                                <div
                                    className="w-full bg-emerald-400 rounded-t-sm min-h-[2px] transition-all"
                                    style={{ height: `${Math.max(2, (data.added / maxDailyValue) * 100)}%` }}
                                />
                                {/* Removed bar (red) */}
                                <div
                                    className="w-full bg-red-400 rounded-b-sm min-h-[2px] transition-all"
                                    style={{ height: `${Math.max(2, (data.removed / maxDailyValue) * 100)}%` }}
                                />
                                <span className="text-[9px] text-gray-400 mt-1 truncate w-full text-center">{day.split(' ')[1]}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-emerald-400 rounded-sm" />
                            <span className="text-xs text-gray-500">Added</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 bg-red-400 rounded-sm" />
                            <span className="text-xs text-gray-500">Removed</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Low Stock Alerts */}
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <ShieldAlert size={16} className="text-orange-500" />
                        Low Stock Alerts
                        {lowStockItems.length > 0 && (
                            <span className="ml-auto px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-bold">
                                {lowStockItems.length}
                            </span>
                        )}
                    </h4>
                    {lowStockItems.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                            <Package size={28} className="mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-medium">All items are well stocked</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {lowStockItems.map(item => (
                                <div key={item.id} className="flex items-center gap-3 p-2.5 bg-orange-50 border border-orange-100 rounded-lg">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.quantity === 0 ? 'bg-red-100' : 'bg-orange-100'}`}>
                                        <AlertTriangle size={14} className={item.quantity === 0 ? 'text-red-600' : 'text-orange-600'} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm truncate">{item.name}</p>
                                        <p className="text-xs text-gray-400">{item.item_code}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-sm font-bold ${item.quantity === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                                            {item.quantity === 0 ? 'OUT' : item.quantity}
                                        </span>
                                        <p className="text-[10px] text-gray-400">min: {item.min_threshold || 5}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Moving Items */}
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp size={16} className="text-blue-500" />
                        Most Active Items
                    </h4>
                    {topMovers.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                            <Activity size={28} className="mx-auto mb-2 opacity-40" />
                            <p className="text-sm font-medium">No movements in this period</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {topMovers.map(([id, data], index) => (
                                <div key={id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <span className="text-xs font-black text-blue-600">#{index + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-gray-900 text-sm truncate">{data.name}</p>
                                        <p className="text-xs text-gray-400">
                                            <span className="text-emerald-500">+{data.added}</span>
                                            {' / '}
                                            <span className="text-red-500">−{data.removed}</span>
                                            {' '}
                                            {data.unit}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-gray-900">{data.total}</span>
                                        <p className="text-[10px] text-gray-400">{data.unit} moved</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Category Breakdown */}
            {categoryMap.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Box size={16} className="text-indigo-500" />
                        Category Breakdown
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {categoryMap.map(([category, data]) => (
                            <div key={category} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm truncate">{category}</p>
                                    <p className="text-xs text-gray-400">
                                        {data.count} items • {data.totalQty} total units
                                    </p>
                                </div>
                                {data.lowStock > 0 && (
                                    <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-xs font-bold flex-shrink-0">
                                        {data.lowStock} low
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Out of Stock Section */}
            {outOfStockItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
                        <AlertTriangle size={16} className="text-red-600" />
                        Out of Stock ({outOfStockItems.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {outOfStockItems.map(item => (
                            <span key={item.id} className="px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-700">
                                {item.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockReportView;
