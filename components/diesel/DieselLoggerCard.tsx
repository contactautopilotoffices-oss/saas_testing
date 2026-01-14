'use client';

import React, { useState, useEffect } from 'react';
import { Fuel, Plus, Minus, AlertTriangle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface Generator {
    id: string;
    name: string;
    make?: string;
    capacity_kva?: number;
    tank_capacity_litres?: number;
    fuel_efficiency_lphr?: number;
    status: string;
}

interface DieselReading {
    opening_hours: number;
    diesel_added_litres: number;
    closing_hours: number;
    computed_consumed_litres?: number;
    notes?: string;
}

interface DieselLoggerCardProps {
    generator: Generator;
    previousClosing?: number;
    averageConsumption?: number;
    onReadingChange: (generatorId: string, reading: DieselReading) => void;
    isSubmitting?: boolean;
    isDark?: boolean;
}

/**
 * Individual generator input card for daily diesel logging
 * Matches the provided HTML mockup with warning states
 */
const DieselLoggerCard: React.FC<DieselLoggerCardProps> = ({
    generator,
    previousClosing,
    averageConsumption,
    onReadingChange,
    isSubmitting = false,
    isDark = false
}) => {
    const [openingHours, setOpeningHours] = useState<number>(previousClosing || 0);
    const [dieselAdded, setDieselAdded] = useState<number>(0);
    const [closingHours, setClosingHours] = useState<number>(0);
    const [notes, setNotes] = useState<string>('');
    const [isFocused, setIsFocused] = useState(false);

    // Calculate consumption and run time
    const runHours = closingHours > openingHours ? closingHours - openingHours : 0;
    const fuelEfficiency = generator.fuel_efficiency_lphr || 15;
    const estimatedConsumption = Math.round(runHours * fuelEfficiency);

    // Warning state: consumption > 25% vs average
    const isHighConsumption = averageConsumption && estimatedConsumption > averageConsumption * 1.25;
    const hasValidReading = closingHours > openingHours;

    // Status styling
    const getStatusColor = () => {
        if (generator.status === 'standby') return isDark ? 'bg-[#21262d] text-slate-400' : 'bg-slate-200 text-slate-500';
        if (generator.status === 'maintenance') return 'bg-rose-100 text-rose-600';
        return 'bg-primary/10 text-primary';
    };

    const getStripColor = () => {
        if (!hasValidReading) return isDark ? 'bg-[#21262d]' : 'bg-slate-200';
        if (isHighConsumption) return 'bg-amber-400';
        return isDark ? 'bg-primary' : 'bg-primary';
    };

    // Notify parent of changes
    useEffect(() => {
        if (hasValidReading) {
            onReadingChange(generator.id, {
                opening_hours: openingHours,
                diesel_added_litres: dieselAdded,
                closing_hours: closingHours,
                computed_consumed_litres: estimatedConsumption,
                notes: notes || undefined,
            });
        }
    }, [openingHours, dieselAdded, closingHours, notes, hasValidReading]);

    // Set opening hours from previous closing
    useEffect(() => {
        if (previousClosing !== undefined) {
            setOpeningHours(previousClosing);
        }
    }, [previousClosing]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group relative flex flex-col ${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-200'} rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border overflow-hidden ${generator.status === 'standby' ? 'opacity-60 hover:opacity-100' : ''
                }`}
        >
            {/* Status Strip */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${getStripColor()} transition-colors`} />

            <div className="p-5 md:p-6 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-start mb-6 pl-2">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{generator.name}</h2>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getStatusColor()}`}>
                                {generator.status}
                            </span>
                        </div>
                        <p className={`text-sm font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            {generator.make || 'Generator'} · {generator.capacity_kva || '—'} KVA
                        </p>
                    </div>
                    <div className="flex flex-col items-end">
                        {averageConsumption && (
                            <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                <TrendingUp className="w-3 h-3" />
                                <span>Avg: {averageConsumption}L/day</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Grid */}
                <div className="flex-1 space-y-5 pl-2">
                    {/* Row 1: Opening & Added */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Opening Hours (readonly) */}
                        <label className="flex flex-col gap-1.5">
                            <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>Opening</span>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={openingHours}
                                    readOnly
                                    className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-500'} font-bold rounded-lg p-2.5 pl-3 focus:outline-none cursor-not-allowed border`}
                                />
                                <span className={`absolute right-3 top-2.5 ${isDark ? 'text-slate-600' : 'text-slate-400'} text-sm font-medium`}>H</span>
                            </div>
                        </label>

                        {/* Diesel Added */}
                        <label className="flex flex-col gap-1.5">
                            <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>Diesel Added</span>
                            <div className="relative">
                                <button
                                    onClick={() => setDieselAdded(Math.max(0, dieselAdded - 10))}
                                    className="absolute inset-y-0 left-0 flex items-center pl-2 z-10"
                                >
                                    <span className={`p-1 rounded-md ${isDark ? 'text-slate-500 hover:text-primary hover:bg-primary/10' : 'text-slate-400 hover:text-primary hover:bg-primary/10'} transition-colors`}>
                                        <Minus className="w-4 h-4" />
                                    </span>
                                </button>
                                <input
                                    type="number"
                                    value={dieselAdded}
                                    onChange={(e) => setDieselAdded(Math.max(0, parseInt(e.target.value) || 0))}
                                    className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-primary' : 'bg-white border-slate-200 focus:border-primary'} focus:ring-2 ${isDark ? 'focus:ring-primary/20' : 'focus:ring-primary/20'} text-slate-900 font-bold rounded-lg py-2.5 px-8 text-center transition-all shadow-sm border`}
                                    placeholder="0"
                                />
                                <button
                                    onClick={() => setDieselAdded(dieselAdded + 10)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-2 z-10"
                                >
                                    <span className={`p-1 rounded-md ${isDark ? 'text-slate-500 hover:text-primary hover:bg-primary/10' : 'text-slate-400 hover:text-primary hover:bg-primary/10'} transition-colors`}>
                                        <Plus className="w-4 h-4" />
                                    </span>
                                </button>
                            </div>
                            <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-slate-400'} text-right`}>Litres</span>
                        </label>
                    </div>

                    {/* Row 2: Closing Reading (Main Action) */}
                    <label className="flex flex-col gap-2">
                        <div className="flex justify-between items-end">
                            <span className={`text-xs font-bold uppercase tracking-wide ${isHighConsumption ? 'text-amber-600' : (isDark ? 'text-primary' : 'text-primary')}`}>
                                Closing Reading
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${hasValidReading ? 'bg-green-100 text-green-700' : (isDark ? 'bg-[#0d1117] text-amber-500' : 'bg-primary/10 text-primary')
                                }`}>
                                {hasValidReading ? '✓ VALID' : 'REQUIRED'}
                            </span>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                value={closingHours || ''}
                                onChange={(e) => setClosingHours(parseFloat(e.target.value) || 0)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                className={`w-full ${isDark ? 'bg-[#0d1117] border-primary/50 focus:border-primary text-white' : 'bg-white border-primary/30 focus:border-primary text-slate-900'} border-2 focus:ring-4 ${isDark ? 'focus:ring-primary/10' : 'focus:ring-primary/10'} text-lg font-bold rounded-xl py-3 px-4 shadow-sm transition-all`}
                                placeholder={`>${openingHours}`}
                            />
                            <span className={`absolute right-4 top-4 ${isDark ? 'text-slate-600' : 'text-slate-400'} text-sm font-bold`}>Hours</span>
                        </div>
                        {isFocused && (
                            <p className={`text-xs ${isDark ? 'text-primary' : 'text-primary'} animate-pulse font-medium`}>Typing...</p>
                        )}
                        {isHighConsumption && hasValidReading && (
                            <div className={`flex items-center gap-1.5 text-xs text-amber-600 font-semibold ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'} p-2 rounded border border-amber-100`}>
                                <AlertTriangle className="w-4 h-4" />
                                Warning: Usage &gt; 25% vs 30-day Avg
                            </div>
                        )}
                    </label>

                    {/* Calculation Result Box */}
                    <div className={`rounded-lg p-3 border flex justify-between items-center ${hasValidReading
                        ? (isDark ? 'bg-primary/5 border-primary/20' : 'bg-primary/5 border-primary/20')
                        : (isDark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-slate-50 border-slate-100')
                        }`}>
                        <div className="flex flex-col">
                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} font-medium`}>Run Time</span>
                            <span className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {hasValidReading ? `${Math.floor(runHours)}h ${Math.round((runHours % 1) * 60)}m` : '—'}
                            </span>
                        </div>
                        <div className={`h-8 w-[1px] ${isDark ? 'bg-[#21262d]' : 'bg-slate-200'}`} />
                        <div className="flex flex-col items-end">
                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'} font-medium`}>Consumption</span>
                            <div className="flex items-center gap-1">
                                <Fuel className={`w-4 h-4 ${hasValidReading ? (isDark ? 'text-primary' : 'text-primary') : 'text-slate-300'}`} />
                                <span className={`text-lg font-black ${hasValidReading ? (isDark ? 'text-primary' : 'text-primary') : 'text-slate-300'}`}>
                                    {hasValidReading ? `${estimatedConsumption}L` : '—'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notes (Optional) */}
                    <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes (optional)..."
                        className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-primary/50' : 'bg-slate-50 border-slate-200 text-slate-600 focus:border-primary/50'} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-primary/20' : 'focus:ring-primary/20'} border`}
                    />
                </div>
            </div>
        </motion.div>
    );
};

export default DieselLoggerCard;
