'use client';

import React, { useState, useEffect } from 'react';
import { Fuel, Plus, Minus, AlertTriangle, Save, Trash2, Zap, Hourglass } from 'lucide-react';
import { motion } from 'framer-motion';

interface Generator {
    id: string;
    name: string;
    make?: string;
    capacity_kva?: number;
    tank_capacity_litres?: number;
    status: string;
}

interface DGTariff {
    id: string;
    cost_per_litre: number;
    effective_from: string;
}

interface DieselReading {
    opening_hours: number;
    closing_hours: number;
    opening_kwh: number;
    closing_kwh: number;
    opening_diesel_level: number;
    closing_diesel_level: number;
    diesel_added_litres: number;
    computed_consumed_litres?: number;
    tariff_id?: string;
    tariff_rate?: number;
    notes?: string;
}

interface DieselLoggerCardProps {
    generator: Generator;
    previousClosing?: {
        hours: number;
        kwh: number;
        diesel: number;
    };
    averageConsumption?: number;
    activeTariff?: DGTariff | null;
    onReadingChange: (generatorId: string, reading: DieselReading) => void;
    onSave?: (generatorId: string) => Promise<void>;
    onDelete?: (generatorId: string) => void;
    isSubmitting?: boolean;
    isDark?: boolean;
}

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
    // Openings (Auto-populated from previous closing or initial truth)
    const [openingHours, setOpeningHours] = useState<number>(previousClosing?.hours || 0);
    const [openingKwh, setOpeningKwh] = useState<number>(previousClosing?.kwh || 0);
    const [openingDiesel, setOpeningDiesel] = useState<number>(previousClosing?.diesel || 0);

    // Inputs
    const [closingHours, setClosingHours] = useState<number | ''>('');
    const [closingKwh, setClosingKwh] = useState<number | ''>('');
    const [closingDiesel, setClosingDiesel] = useState<number | ''>('');
    const [dieselAdded, setDieselAdded] = useState<number>(0);
    const [notes, setNotes] = useState<string>('');

    // Update openings when prop changes
    useEffect(() => {
        if (previousClosing) {
            setOpeningHours(previousClosing.hours);
            setOpeningKwh(previousClosing.kwh);
            setOpeningDiesel(previousClosing.diesel);
        }
    }, [previousClosing]);

    // Consumption Logic: (Opening + Added) - Closing
    const consumedLitres = (closingDiesel !== '')
        ? Math.max(0, (openingDiesel + dieselAdded) - Number(closingDiesel))
        : 0;

    const tariffRate = activeTariff?.cost_per_litre || 0;
    const hasValidReading = closingHours !== '' && closingHours >= openingHours &&
        closingKwh !== '' && closingKwh >= openingKwh &&
        closingDiesel !== '';

    // Notify parent of changes
    useEffect(() => {
        if (hasValidReading) {
            onReadingChange(generator.id, {
                opening_hours: openingHours,
                closing_hours: Number(closingHours),
                opening_kwh: openingKwh,
                closing_kwh: Number(closingKwh),
                opening_diesel_level: openingDiesel,
                closing_diesel_level: Number(closingDiesel),
                diesel_added_litres: dieselAdded,
                computed_consumed_litres: consumedLitres,
                tariff_id: activeTariff?.id,
                tariff_rate: tariffRate,
                notes: notes || undefined,
            });
        }
    }, [
        openingHours, closingHours,
        openingKwh, closingKwh,
        openingDiesel, closingDiesel,
        dieselAdded, notes, hasValidReading, activeTariff, tariffRate, consumedLitres
    ]);

    const handleSaveEntry = async () => {
        if (onSave && hasValidReading) {
            await onSave(generator.id);
        }
    };

    const getStatusColor = () => {
        if (generator.status === 'inactive') return isDark ? 'bg-rose-500/10 text-rose-500' : 'bg-rose-50 text-rose-600';
        return 'bg-emerald-500/10 text-emerald-500';
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex flex-col ${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-200'} rounded-[2.5rem] border shadow-sm overflow-hidden`}
        >
            {/* Header Area */}
            <div className={`p-8 border-b ${isDark ? 'border-[#21262d] bg-[#0d1117]/50' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h2 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tight`}>{generator.name}</h2>
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${getStatusColor()}`}>
                                {generator.status}
                            </span>
                        </div>
                        <p className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest`}>
                            {generator.make || 'DG'} · {generator.capacity_kva} KVA
                        </p>
                    </div>
                    {onDelete && (
                        <button onClick={() => onDelete(generator.id)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Section Warning */}
                {!activeTariff && (
                    <div className="p-3 bg-amber-500/10 rounded-2xl flex items-center gap-3 border border-amber-500/20 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">No active tariff found for this DG</span>
                    </div>
                )}
            </div>

            {/* Inputs Section */}
            <div className="p-8 space-y-10">
                {/* 1. Run Hours Reading */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Hourglass className="w-3.5 h-3.5 text-primary" />
                        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Run Hours Reading</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-3xl ${isDark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-slate-50 border-slate-100'} border-2 border-dashed`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-700' : 'text-slate-400'} block mb-1`}>Opening</span>
                            <div className={`text-xl font-mono font-black ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{openingHours.toFixed(1)}</div>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                placeholder="Closing"
                                value={closingHours}
                                onChange={(e) => setClosingHours(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className={`w-full p-4 rounded-3xl ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white' : 'bg-white border-slate-200'} border-2 text-xl font-mono font-black placeholder:text-slate-300 focus:outline-none focus:border-primary transition-all`}
                            />
                            {closingHours !== '' && closingHours < openingHours && (
                                <p className="absolute -bottom-5 left-2 text-[8px] font-black text-rose-500 uppercase">Must be ≥ Opening</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. kWh Energy Reading */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-3.5 h-3.5 text-emerald-500" />
                        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Energy Reading (kWh)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-3xl ${isDark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-slate-50 border-slate-100'} border-2 border-dashed`}>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-700' : 'text-slate-400'} block mb-1`}>Opening</span>
                            <div className={`text-xl font-mono font-black ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>{openingKwh.toLocaleString()}</div>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="Closing"
                                value={closingKwh}
                                onChange={(e) => setClosingKwh(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className={`w-full p-4 rounded-3xl ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white' : 'bg-white border-slate-200'} border-2 text-xl font-mono font-black placeholder:text-slate-300 focus:outline-none focus:border-emerald-500 transition-all`}
                            />
                            {closingKwh !== '' && closingKwh < openingKwh && (
                                <p className="absolute -bottom-5 left-2 text-[8px] font-black text-rose-500 uppercase">Must be ≥ Opening</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Diesel Level & Additions */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Fuel className="w-3.5 h-3.5 text-primary" />
                        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>Fuel Management (Litres)</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className={`p-3 rounded-2xl ${isDark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-slate-50 border-slate-100'} border`}>
                            <span className="text-[8px] font-black uppercase text-slate-400 block mb-1">Opening</span>
                            <div className="text-sm font-black text-slate-500">{openingDiesel} L</div>
                        </div>
                        <div className="relative col-span-2">
                            <span className="absolute -top-6 right-2 text-[8px] font-black text-primary uppercase">Closing Diesel Level *</span>
                            <input
                                type="number"
                                placeholder="Level"
                                value={closingDiesel}
                                onChange={(e) => setClosingDiesel(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className={`w-full p-3 rounded-2xl ${isDark ? 'bg-[#0d1117] border-primary/30 text-white' : 'bg-white border-primary/30'} border-2 text-lg font-black focus:outline-none focus:border-primary transition-all`}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Diesel Added Today?</span>
                        <div className="flex items-center gap-4">
                            <button onClick={() => setDieselAdded(Math.max(0, dieselAdded - 50))} className={`p-3 rounded-xl ${isDark ? 'bg-[#21262d]' : 'bg-slate-100'} hover:bg-primary hover:text-white transition-all`}><Minus className="w-4 h-4" /></button>
                            <div className="flex-1 text-center font-black text-xl italic">{dieselAdded} <span className="text-xs">Litres</span></div>
                            <button onClick={() => setDieselAdded(dieselAdded + 50)} className={`p-3 rounded-xl ${isDark ? 'bg-[#21262d]' : 'bg-slate-100'} hover:bg-primary hover:text-white transition-all`}><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>

                {/* Save Section */}
                <div className="pt-4">
                    <button
                        onClick={handleSaveEntry}
                        disabled={!hasValidReading || isSubmitting}
                        className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${hasValidReading
                            ? 'bg-primary text-white shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-98'
                            : `${isDark ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'} cursor-not-allowed`
                            }`}
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Commit Daily Log
                            </>
                        )}
                    </button>
                    {hasValidReading && (
                        <motion.p
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`text-[10px] font-black text-center mt-4 ${isDark ? 'text-emerald-500/50' : 'text-emerald-600/60'} uppercase tracking-widest`}
                        >
                            Derived Consumed: {consumedLitres} L
                        </motion.p>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default DieselLoggerCard;
