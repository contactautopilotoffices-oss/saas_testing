'use client';

import React, { useState, useEffect } from 'react';
import {
    X, History, Calendar, Fuel, Clock,
    ArrowRight, IndianRupee, Zap, Droplets
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Reading {
    id: string;
    reading_date: string;
    generator_id: string;
    opening_hours: number;
    closing_hours: number;
    opening_kwh?: number;
    closing_kwh?: number;
    opening_diesel_level?: number;
    closing_diesel_level?: number;
    diesel_added_litres: number;
    computed_run_hours: number;
    computed_consumed_litres: number;
    computed_cost: number;
    tariff_rate_used?: number;
    notes?: string;
    generator?: {
        name: string;
    };
}

interface DieselHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    isDark?: boolean;
}

const DieselHistoryModal: React.FC<DieselHistoryModalProps> = ({
    isOpen,
    onClose,
    propertyId,
    isDark = false
}) => {
    const [readings, setReadings] = useState<Reading[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchReadings();
        }
    }, [isOpen, propertyId]);

    const fetchReadings = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/properties/${propertyId}/diesel-readings?period=month`);
            if (!res.ok) throw new Error('Failed to fetch history');
            const data = await res.json();
            setReadings(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl ${isDark ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-slate-200'
                        } border`}
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-[#30363d]' : 'border-slate-100'
                        }`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <History className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    Reading History
                                </h3>
                                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                    Complete logs from the last 30 days
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-[#21262d] text-slate-400' : 'hover:bg-slate-100 text-slate-500'
                                }`}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="overflow-auto p-6 max-h-[calc(90vh-140px)]">
                        {isLoading ? (
                            <div className="py-20 text-center">
                                <div className="inline-block w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
                                <p className={`text-sm font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Fetching history...
                                </p>
                            </div>
                        ) : readings.length === 0 ? (
                            <div className="py-20 text-center">
                                <History className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                                <p className={`text-lg font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    No history found
                                </p>
                                <p className="text-sm text-slate-400">Start logging readings to see them here.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {readings.map((r) => (
                                    <div
                                        key={r.id}
                                        className={`${isDark ? 'bg-[#0d1117] hover:bg-[#21262d]' : 'bg-slate-50 hover:bg-slate-100'
                                            } rounded-2xl p-5 transition-all border ${isDark ? 'border-[#21262d]' : 'border-slate-100'}`}
                                    >
                                        {/* Top Row: Date, Generator, Cost */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="w-4 h-4 text-primary" />
                                                    <span className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                        {formatDate(r.reading_date)}
                                                    </span>
                                                </div>
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${isDark ? 'bg-[#21262d] text-slate-300' : 'bg-white text-slate-600 shadow-sm border border-slate-200'
                                                    }`}>
                                                    {r.generator?.name || 'DG'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <IndianRupee className="w-4 h-4 text-primary" />
                                                <span className="text-xl font-black text-primary">
                                                    {r.computed_cost?.toLocaleString('en-IN') || 0}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {/* Run Hours */}
                                            <div className={`p-3 rounded-xl ${isDark ? 'bg-[#161b22]' : 'bg-white border border-slate-100'}`}>
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Clock className="w-3 h-3 text-slate-400" />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                                        Run Hours
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{r.opening_hours}</span>
                                                    <ArrowRight className="w-3 h-3 text-slate-300" />
                                                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{r.closing_hours}</span>
                                                    <span className="text-xs font-black text-primary ml-1">
                                                        (+{r.computed_run_hours?.toFixed(1) || 0}h)
                                                    </span>
                                                </div>
                                            </div>

                                            {/* kWh Energy */}
                                            <div className={`p-3 rounded-xl ${isDark ? 'bg-[#161b22]' : 'bg-white border border-slate-100'}`}>
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Zap className="w-3 h-3 text-emerald-500" />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                                        Energy (kWh)
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{r.opening_kwh || 0}</span>
                                                    <ArrowRight className="w-3 h-3 text-slate-300" />
                                                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{r.closing_kwh || 0}</span>
                                                    <span className="text-xs font-black text-emerald-500 ml-1">
                                                        (+{((r.closing_kwh || 0) - (r.opening_kwh || 0)).toLocaleString()})
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Diesel Level */}
                                            <div className={`p-3 rounded-xl ${isDark ? 'bg-[#161b22]' : 'bg-white border border-slate-100'}`}>
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Droplets className="w-3 h-3 text-amber-500" />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                                        Diesel Level
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{r.opening_diesel_level || 0}L</span>
                                                    <ArrowRight className="w-3 h-3 text-slate-300" />
                                                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{r.closing_diesel_level || 0}L</span>
                                                </div>
                                            </div>

                                            {/* Fuel Stats */}
                                            <div className={`p-3 rounded-xl ${isDark ? 'bg-[#161b22]' : 'bg-white border border-slate-100'}`}>
                                                <div className="flex items-center gap-1.5 mb-2">
                                                    <Fuel className="w-3 h-3 text-primary" />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                                        Fuel
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <span className={`text-[8px] uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Added</span>
                                                        <div className={`text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                            +{r.diesel_added_litres}L
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className={`text-[8px] uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Consumed</span>
                                                        <div className="text-sm font-black text-primary">
                                                            {r.computed_consumed_litres?.toFixed(0) || 0}L
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tariff Info */}
                                        {r.tariff_rate_used && r.tariff_rate_used > 0 && (
                                            <div className={`mt-3 pt-3 border-t ${isDark ? 'border-[#21262d]' : 'border-slate-100'} flex items-center gap-2`}>
                                                <span className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                                                    Rate Applied:
                                                </span>
                                                <span className="text-xs font-bold text-emerald-500">
                                                    ₹{r.tariff_rate_used}/L
                                                </span>
                                            </div>
                                        )}

                                        {/* Notes */}
                                        {r.notes && (
                                            <div className={`mt-3 pt-3 border-t ${isDark ? 'border-[#21262d]' : 'border-slate-100'}`}>
                                                <span className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                                    Note: {r.notes}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className={`p-4 border-t ${isDark ? 'border-[#30363d] bg-[#0d1117]/50' : 'border-slate-100 bg-slate-50/50'
                        } flex justify-between items-center`}>
                        <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Showing {readings.length} readings from the last 30 days
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
                        >
                            Done
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default DieselHistoryModal;
