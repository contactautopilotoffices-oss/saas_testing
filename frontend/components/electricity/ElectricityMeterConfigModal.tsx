'use client';

import React, { useState } from 'react';
import { X, Zap, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ElectricityMeterConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
    isDark?: boolean;
}

/**
 * Modal for adding/editing electricity meters
 */
const ElectricityMeterConfigModal: React.FC<ElectricityMeterConfigModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    isDark = false
}) => {
    const [name, setName] = useState('');
    const [meterNumber, setMeterNumber] = useState('');
    const [meterType, setMeterType] = useState('main');
    const [maxLoadKw, setMaxLoadKw] = useState<number | ''>('');
    const [lastReading, setLastReading] = useState<number>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            setError('Meter name is required');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await onSubmit({
                name: name.trim(),
                meter_number: meterNumber.trim() || null,
                meter_type: meterType,
                max_load_kw: maxLoadKw || null,
                last_reading: lastReading || 0,
                status: 'active',
            });

            // Reset form
            setName('');
            setMeterNumber('');
            setMeterType('main');
            setMaxLoadKw('');
            setLastReading(0);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to add meter');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className={`${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white border-slate-200'} rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`${isDark ? 'bg-[#0d1117] border-[#21262d]' : 'bg-slate-50 border-slate-100'} px-6 py-4 flex items-center justify-between border-b`}>
                        <div className="flex items-center gap-3">
                            <div className={`${isDark ? 'bg-amber-500/10' : 'bg-amber-50'} p-2 rounded-xl`}>
                                <Zap className="w-5 h-5 text-amber-500" />
                            </div>
                            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Add Electricity Meter</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className={`${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-900'} transition-colors`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {error && (
                            <div className={`${isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-600 border-rose-100'} px-4 py-3 rounded-xl text-sm border`}>
                                {error}
                            </div>
                        )}

                        {/* Meter Name */}
                        <label className="flex flex-col gap-1.5">
                            <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>
                                Meter Name *
                            </span>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Main Meter, DG Meter"
                                className={`${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'} border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-amber-500/20' : 'focus:ring-amber-500/20'}`}
                                required
                            />
                        </label>

                        {/* Meter Number */}
                        <label className="flex flex-col gap-1.5">
                            <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>
                                Meter Number (Optional)
                            </span>
                            <input
                                type="text"
                                value={meterNumber}
                                onChange={(e) => setMeterNumber(e.target.value)}
                                placeholder="Physical meter serial number"
                                className={`${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'} border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-amber-500/20' : 'focus:ring-amber-500/20'}`}
                            />
                        </label>

                        {/* Meter Type */}
                        <label className="flex flex-col gap-1.5">
                            <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>
                                Meter Type
                            </span>
                            <select
                                value={meterType}
                                onChange={(e) => setMeterType(e.target.value)}
                                className={`${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'} border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-amber-500/20' : 'focus:ring-amber-500/20'}`}
                            >
                                <option value="main">Main Grid</option>
                                <option value="dg">DG Backup</option>
                                <option value="solar">Solar</option>
                                <option value="backup">Backup</option>
                            </select>
                        </label>

                        {/* Max Load */}
                        <label className="flex flex-col gap-1.5">
                            <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>
                                Max Load Capacity (kW) - Optional
                            </span>
                            <input
                                type="number"
                                value={maxLoadKw}
                                onChange={(e) => setMaxLoadKw(e.target.value ? parseInt(e.target.value) : '')}
                                placeholder="e.g., 100, 500"
                                className={`${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'} border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-amber-500/20' : 'focus:ring-amber-500/20'}`}
                            />
                        </label>

                        {/* Current Reading */}
                        <label className="flex flex-col gap-1.5">
                            <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>
                                Current Reading (kWh)
                            </span>
                            <input
                                type="number"
                                value={lastReading}
                                onChange={(e) => setLastReading(parseFloat(e.target.value) || 0)}
                                placeholder="Starting meter reading"
                                className={`${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-amber-500' : 'bg-white border-slate-200 focus:border-amber-500'} border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-amber-500/20' : 'focus:ring-amber-500/20'}`}
                            />
                        </label>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full ${isDark ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/40' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'} text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50`}
                        >
                            <Plus className="w-5 h-5" />
                            {isSubmitting ? 'Adding...' : 'Add Meter'}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ElectricityMeterConfigModal;
