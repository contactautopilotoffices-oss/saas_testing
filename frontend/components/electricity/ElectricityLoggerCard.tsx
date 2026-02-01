'use client';

import React, { useState, useEffect } from 'react';
import { Zap, Plus, Minus, AlertTriangle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface ElectricityMeter {
    id: string;
    name: string;
    meter_number?: string;
    meter_type?: string;
    max_load_kw?: number;
    status: string;
    last_reading?: number;
}

interface ElectricityReading {
    opening_reading: number;
    closing_reading: number;
    computed_units?: number;
    peak_load_kw?: number;
    notes?: string;
}

interface ElectricityLoggerCardProps {
    meter: ElectricityMeter;
    previousClosing?: number;
    averageConsumption?: number;
    onReadingChange: (meterId: string, reading: ElectricityReading) => void;
    isSubmitting?: boolean;
    isDark?: boolean;
}

/**
 * Individual meter input card for daily electricity logging
 * Similar to DieselLoggerCard but for electricity readings
 */
const ElectricityLoggerCard: React.FC<ElectricityLoggerCardProps> = ({
    meter,
    previousClosing,
    averageConsumption,
    onReadingChange,
    isSubmitting = false,
    isDark = false
}) => {
    const [openingReading, setOpeningReading] = useState<number>(previousClosing || meter.last_reading || 0);
    const [closingReading, setClosingReading] = useState<number>(0);
    const [peakLoad, setPeakLoad] = useState<number>(0);
    const [notes, setNotes] = useState<string>('');
    const [isFocused, setIsFocused] = useState(false);

    // Calculate consumption
    const unitsConsumed = closingReading > openingReading ? closingReading - openingReading : 0;

    // Warning state: consumption > 25% vs average
    const isHighConsumption = averageConsumption && unitsConsumed > averageConsumption * 1.25;
    const hasValidReading = closingReading > openingReading;

    // Status styling
    const getStatusColor = () => {
        if (meter.status === 'inactive') return isDark ? 'bg-[#21262d] text-slate-400' : 'bg-slate-200 text-slate-500';
        if (meter.status === 'faulty') return 'bg-rose-100 text-rose-600';
        return 'bg-amber-500/10 text-amber-500';
    };

    const getMeterTypeLabel = () => {
        switch (meter.meter_type) {
            case 'main': return 'Main Grid';
            case 'dg': return 'DG Backup';
            case 'solar': return 'Solar';
            case 'backup': return 'Backup';
            default: return meter.meter_type || 'Main';
        }
    };

    const getStripColor = () => {
        if (!hasValidReading) return isDark ? 'bg-[#21262d]' : 'bg-slate-200';
        if (isHighConsumption) return 'bg-amber-400';
        return isDark ? 'bg-amber-500' : 'bg-amber-500';
    };

    // Notify parent of changes
    useEffect(() => {
        if (hasValidReading) {
            onReadingChange(meter.id, {
                opening_reading: openingReading,
                closing_reading: closingReading,
                computed_units: unitsConsumed,
                peak_load_kw: peakLoad || undefined,
                notes: notes || undefined,
            });
        }
    }, [openingReading, closingReading, peakLoad, notes, hasValidReading]);

    // Set opening reading from previous closing
    useEffect(() => {
        if (previousClosing !== undefined) {
            setOpeningReading(previousClosing);
        } else if (meter.last_reading) {
            setOpeningReading(meter.last_reading);
        }
    }, [previousClosing, meter.last_reading]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group relative flex flex-col ${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-200'} rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border overflow-hidden ${meter.status === 'inactive' ? 'opacity-60 hover:opacity-100' : ''
                }`}
        >
            {/* Status Strip */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${getStripColor()} transition-colors`} />

            <div className="p-5 md:p-6 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-6 pl-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{meter.name}</h2>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusColor()}`}>
                                {meter.status}
                            </span>
                        </div>
                        <p className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {getMeterTypeLabel()} · {meter.meter_number || 'No meter #'} {meter.max_load_kw && `· ${meter.max_load_kw} kW`}
                        </p>
                    </div>
                    <div className="flex flex-col items-end">
                        {averageConsumption && (
                            <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                <TrendingUp className="w-3 h-3" />
                                <span>Avg: {averageConsumption} kWh/day</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Grid */}
                <div className="flex-1 space-y-5 pl-2">
                    {/* Row 1: Opening Reading */}
                    <label className="flex flex-col gap-1.5">
                        <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>Opening Reading</span>
                        <div className="relative">
                            <input
                                type="number"
                                value={openingReading}
                                readOnly
                                className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'} font-bold rounded-lg p-2.5 pl-3 focus:outline-none cursor-not-allowed border`}
                            />
                            <span className={`absolute right-3 top-2.5 ${isDark ? 'text-slate-600' : 'text-slate-400'} text-sm font-medium`}>kWh</span>
                        </div>
                    </label>

                    {/* Row 2: Closing Reading (Main Action) */}
                    <label className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                            <span className={`text-xs font-bold uppercase tracking-wide ${isHighConsumption ? 'text-amber-600' : (isDark ? 'text-amber-500' : 'text-amber-500')}`}>
                                Closing Reading
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${hasValidReading ? 'bg-green-100 text-green-700' : (isDark ? 'bg-[#0d1117] text-amber-500' : 'bg-amber-500/10 text-amber-500')
                                }`}>
                                {hasValidReading ? '✓ VALID' : 'REQUIRED'}
                            </span>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                value={closingReading || ''}
                                onChange={(e) => setClosingReading(parseFloat(e.target.value) || 0)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                className={`w-full ${isDark ? 'bg-[#0d1117] border-amber-500/50 focus:border-amber-500 text-white' : 'bg-white border-amber-500/30 focus:border-amber-500 text-slate-900'} border-2 focus:ring-4 ${isDark ? 'focus:ring-amber-500/10' : 'focus:ring-amber-500/10'} text-lg font-bold rounded-xl py-3 px-4 shadow-sm transition-all`}
                                placeholder={`>${openingReading}`}
                            />
                            <span className={`absolute right-4 top-4 ${isDark ? 'text-slate-600' : 'text-slate-400'} text-sm font-bold`}>kWh</span>
                        </div>
                        {isFocused && (
                            <p className={`text-xs ${isDark ? 'text-amber-500' : 'text-amber-500'} animate-pulse font-medium`}>Typing...</p>
                        )}
                        {isHighConsumption && hasValidReading && (
                            <div className={`flex items-center gap-1.5 text-xs text-amber-600 font-semibold ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'} p-2 rounded border border-amber-100`}>
                                <AlertTriangle className="w-4 h-4" />
                                Warning: Usage &gt; 25% vs 30-day Avg
                            </div>
                        )}
                    </label>

                    {/* Row 3: Peak Load (Optional) */}
                    <label className="flex flex-col gap-1.5">
                        <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>Peak Load (Optional)</span>
                        <div className="relative">
                            <button
                                onClick={() => setPeakLoad(Math.max(0, peakLoad - 10))}
                                className="absolute inset-y-0 left-0 flex items-center pl-2 z-10"
                            >
                                <span className={`p-1 rounded-md ${isDark ? 'text-slate-500 hover:text-amber-500 hover:bg-amber-500/10' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10'} transition-colors`}>
                                    <Minus className="w-4 h-4" />
                                </span>
                            </button>
                            <input
                                type="number"
                                value={peakLoad}
                                onChange={(e) => setPeakLoad(Math.max(0, parseInt(e.target.value) || 0))}
                                className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'} focus:ring-2 ${isDark ? 'focus:ring-amber-500/20' : 'focus:ring-amber-500/20'} text-slate-900 font-bold rounded-lg py-2.5 px-8 text-center transition-all shadow-sm border`}
                                placeholder="0"
                            />
                            <button
                                onClick={() => setPeakLoad(peakLoad + 10)}
                                className="absolute inset-y-0 right-0 flex items-center pr-2 z-10"
                            >
                                <span className={`p-1 rounded-md ${isDark ? 'text-slate-500 hover:text-amber-500 hover:bg-amber-500/10' : 'text-slate-400 hover:text-amber-500 hover:bg-amber-500/10'} transition-colors`}>
                                    <Plus className="w-4 h-4" />
                                </span>
                            </button>
                        </div>
                        <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'} text-right`}>kW</span>
                    </label>

                    {/* Calculation Result Box */}
                    <div className={`rounded-lg p-3 border flex justify-between items-center ${hasValidReading
                        ? (isDark ? 'bg-amber-500/5 border-amber-500/20' : 'bg-amber-500/5 border-amber-500/20')
                        : (isDark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-slate-50 border-slate-100')
                        }`}>
                        <div className="flex flex-col">
                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} font-medium`}>Units Consumed</span>
                            <div className="flex items-center gap-1">
                                <Zap className={`w-4 h-4 ${hasValidReading ? (isDark ? 'text-amber-500' : 'text-amber-500') : 'text-slate-300'}`} />
                                <span className={`text-lg font-black ${hasValidReading ? (isDark ? 'text-amber-500' : 'text-amber-500') : 'text-slate-300'}`}>
                                    {hasValidReading ? `${unitsConsumed} kWh` : '—'}
                                </span>
                            </div>
                        </div>
                        {peakLoad > 0 && (
                            <>
                                <div className={`h-8 w-[1px] ${isDark ? 'bg-[#21262d]' : 'bg-slate-200'}`} />
                                <div className="flex flex-col items-end">
                                    <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} font-medium`}>Peak Load</span>
                                    <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                        {peakLoad} kW
                                    </span>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Notes (Optional) */}
                    <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes (optional)..."
                        className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-amber-500/50' : 'bg-slate-50 border-slate-200 text-slate-600 focus:border-amber-500/50'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-amber-500/20' : 'focus:ring-amber-500/20'} border`}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default ElectricityLoggerCard;
