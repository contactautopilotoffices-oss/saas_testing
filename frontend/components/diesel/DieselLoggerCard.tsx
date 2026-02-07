'use client';

import React, { useState, useEffect } from 'react';
import { Fuel, Plus, Minus, AlertTriangle, Save, Trash2 } from 'lucide-react';
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

interface DGTariff {
    id: string;
    cost_per_litre: number;
    effective_from: string;
}

interface DieselReading {
    opening_hours: number;
    diesel_added_litres: number;
    closing_hours: number;
    computed_consumed_litres?: number;
    tariff_id?: string;
    tariff_rate?: number;
    notes?: string;
}

interface DieselLoggerCardProps {
    generator: Generator;
    previousClosing?: number;
    averageConsumption?: number;
    activeTariff?: DGTariff | null;
    onReadingChange: (generatorId: string, reading: DieselReading) => void;
    onSave?: (generatorId: string) => Promise<void>;
    onDelete?: (generatorId: string) => void;
    isSubmitting?: boolean;
    isDark?: boolean;
}

/**
 * Diesel Logger Card v2.1
 * PRD: Pure input, no analytics, no cost shown.
 * Front: Opening (Auto), Closing (User), Diesel Added, Save Entry.
 */
const DieselLoggerCard: React.FC<DieselLoggerCardProps> = ({
    generator,
    previousClosing,
    averageConsumption,
    activeTariff,
    onReadingChange,
    onSave,
    onDelete,
    isSubmitting = false,
    isDark = false
}) => {
    const [openingHours, setOpeningHours] = useState<number>(previousClosing || 0);
    const [dieselAdded, setDieselAdded] = useState<number>(0);
    const [closingHours, setClosingHours] = useState<number | ''>('');
    const [notes, setNotes] = useState<string>('');

    // Calculate consumption (Internal logic only for data submission, NOT displayed)
    const runHours = (closingHours !== '' && closingHours > openingHours) ? closingHours - openingHours : 0;
    const fuelEfficiency = generator.fuel_efficiency_lphr || 15;
    const estimatedConsumption = Math.round(runHours * fuelEfficiency);
    const tariffRate = activeTariff?.cost_per_litre || 0;

    const hasValidReading = closingHours !== '' && closingHours > openingHours;

    // Notify parent of changes
    useEffect(() => {
        if (hasValidReading) {
            onReadingChange(generator.id, {
                opening_hours: openingHours,
                diesel_added_litres: dieselAdded,
                closing_hours: Number(closingHours),
                computed_consumed_litres: estimatedConsumption,
                tariff_id: activeTariff?.id,
                tariff_rate: tariffRate,
                notes: notes || undefined,
            });
        }
    }, [openingHours, dieselAdded, closingHours, notes, hasValidReading, activeTariff, estimatedConsumption, tariffRate]);

    // Set opening hours from previous closing
    useEffect(() => {
        if (previousClosing !== undefined) {
            setOpeningHours(previousClosing);
        }
    }, [previousClosing]);

    // Handle Save
    const handleSaveEntry = async () => {
        if (onSave && hasValidReading) {
            await onSave(generator.id);
        }
    };

    // Status styling
    const getStatusColor = () => {
        if (generator.status === 'standby') return isDark ? 'bg-[#21262d] text-slate-400' : 'bg-slate-200 text-slate-500';
        if (generator.status === 'maintenance') return 'bg-rose-100 text-rose-600';
        return 'bg-primary/10 text-primary';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group relative flex flex-col justify-between ${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-200'} rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border overflow-hidden min-h-[480px]`}
        >
            {/* Status Strip */}
            <div className={`absolute top-0 left-0 w-1.5 h-full ${hasValidReading ? 'bg-primary' : (isDark ? 'bg-[#21262d]' : 'bg-slate-200')} transition-colors`} />

            <div className="p-5 md:p-6 flex flex-col h-full justify-between">
                {/* Header */}
                <div className="flex justify-between items-start mb-4 pl-2">
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
                </div>

                {/* Input Grid */}
                <div className="flex-1 space-y-6 flex flex-col justify-center pl-2">
                    {/* Row 1: Opening & Added */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Opening Hours (readonly) */}
                        <div className={`${isDark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-slate-50 border-slate-200'} rounded-lg p-3 border border-dashed`}>
                            <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide block mb-1`}>Opening</span>
                            <div className={`text-xl font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {openingHours.toFixed(1)} <span className="text-sm">hrs</span>
                            </div>
                        </div>

                        {/* Diesel Added */}
                        <div>
                            <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide block mb-1`}>Diesel Added</span>
                            <div className="relative flex items-center">
                                <button
                                    onClick={() => setDieselAdded(Math.max(0, dieselAdded - 10))}
                                    className={`absolute left-0 z-10 p-2 ${isDark ? 'text-slate-500 hover:text-primary' : 'text-slate-400 hover:text-primary'}`}
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <input
                                    type="number"
                                    value={dieselAdded}
                                    onChange={(e) => setDieselAdded(Math.max(0, parseInt(e.target.value) || 0))}
                                    className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white' : 'bg-white border-slate-200 text-slate-900'} font-bold rounded-lg py-3 px-8 text-center border focus:outline-none focus:ring-2 focus:ring-primary/20`}
                                />
                                <button
                                    onClick={() => setDieselAdded(dieselAdded + 10)}
                                    className={`absolute right-0 z-10 p-2 ${isDark ? 'text-slate-500 hover:text-primary' : 'text-slate-400 hover:text-primary'}`}
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Closing Reading (User) */}
                    <div>
                        <span className={`text-xs font-bold ${isDark ? 'text-primary' : 'text-primary'} uppercase tracking-wide block mb-2`}>
                            Closing Reading
                        </span>
                        <div className="relative">
                            <input
                                type="number"
                                value={closingHours}
                                onChange={(e) => setClosingHours(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className={`w-full ${isDark ? 'bg-[#0d1117] border-primary/50 text-white placeholder-slate-600' : 'bg-white border-primary/30 text-slate-900 placeholder-slate-300'} border-2 focus:ring-4 ${isDark ? 'focus:ring-primary/10' : 'focus:ring-primary/10'} text-3xl font-bold rounded-xl py-4 px-5 shadow-sm transition-all outline-none`}
                                placeholder="Hours"
                            />
                            <span className={`absolute right-5 top-6 ${isDark ? 'text-slate-600' : 'text-slate-400'} font-bold`}>hrs</span>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="mt-6 mb-2 pl-2">
                    <button
                        onClick={handleSaveEntry}
                        disabled={!hasValidReading || isSubmitting}
                        className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${hasValidReading
                                ? 'bg-primary text-white hover:bg-primary-dark shadow-lg shadow-primary/20 hover:scale-[1.02]'
                                : `${isDark ? 'bg-[#21262d] text-slate-600' : 'bg-slate-100 text-slate-400'} cursor-not-allowed`
                            }`}
                    >
                        {isSubmitting ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Save Entry
                            </>
                        )}
                    </button>
                    {hasValidReading && (
                        <p className={`text-xs text-center mt-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            Consumption will be calculated automatically
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default DieselLoggerCard;
