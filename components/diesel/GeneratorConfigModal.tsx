'use client';

import React, { useState } from 'react';
import { X, Plus, Fuel, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GeneratorConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (generator: GeneratorFormData) => Promise<void>;
    existingGenerator?: GeneratorFormData & { id: string };
    isDark?: boolean;
}

interface GeneratorFormData {
    name: string;
    make: string;
    capacity_kva: number;
    tank_capacity_litres: number;
    fuel_efficiency_lphr: number;
    status: 'active' | 'standby' | 'maintenance';
    last_maintenance_date?: string;
    next_maintenance_date?: string;
}

const GeneratorConfigModal: React.FC<GeneratorConfigModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    existingGenerator,
    isDark = false,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<GeneratorFormData>({
        name: existingGenerator?.name || '',
        make: existingGenerator?.make || '',
        capacity_kva: existingGenerator?.capacity_kva || 500,
        tank_capacity_litres: existingGenerator?.tank_capacity_litres || 1000,
        fuel_efficiency_lphr: existingGenerator?.fuel_efficiency_lphr || 15,
        status: existingGenerator?.status || 'active',
        last_maintenance_date: existingGenerator?.last_maintenance_date || '',
        next_maintenance_date: existingGenerator?.next_maintenance_date || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name.trim()) {
            setError('Generator name is required');
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save generator');
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateField = (field: keyof GeneratorFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className={`relative ${isDark ? 'bg-[#161b22] border-[#21262d]' : 'bg-white'} border rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden`}
                >
                    {/* Header */}
                    <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-[#21262d] bg-gradient-to-r from-[#0d1117] to-[#161b22]' : 'border-slate-100 bg-gradient-to-r from-slate-50 to-white'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 ${isDark ? 'bg-primary/10' : 'bg-primary/10'} rounded-xl flex items-center justify-center`}>
                                <Settings2 className={`w-5 h-5 ${isDark ? 'text-primary' : 'text-primary'}`} />
                            </div>
                            <div>
                                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {existingGenerator ? 'Edit Generator' : 'Add Generator'}
                                </h2>
                                <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>Configure diesel generator settings</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 ${isDark ? 'hover:bg-[#21262d]' : 'hover:bg-slate-100'} rounded-lg transition-colors`}
                        >
                            <X className={`w-5 h-5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {error && (
                            <div className={`${isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-rose-50 border-rose-200 text-rose-700'} text-sm px-4 py-3 rounded-lg border`}>
                                {error}
                            </div>
                        )}

                        {/* Name and Make */}
                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex flex-col gap-1.5">
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>
                                    Name <span className="text-rose-500">*</span>
                                </span>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    placeholder="e.g., DG-1"
                                    className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-primary' : 'bg-white border-slate-200 focus:border-primary'} rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-primary/20' : 'focus:ring-primary/20'} border`}
                                />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>Make</span>
                                <input
                                    type="text"
                                    value={formData.make}
                                    onChange={(e) => updateField('make', e.target.value)}
                                    placeholder="e.g., Cummins"
                                    className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-primary' : 'bg-white border-slate-200 focus:border-primary'} rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-primary/20' : 'focus:ring-primary/20'} border`}
                                />
                            </label>
                        </div>

                        {/* Capacity and Tank */}
                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex flex-col gap-1.5">
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>Capacity (KVA)</span>
                                <input
                                    type="number"
                                    value={formData.capacity_kva}
                                    onChange={(e) => updateField('capacity_kva', parseInt(e.target.value) || 0)}
                                    className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-primary' : 'bg-white border-slate-200 focus:border-primary'} rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-primary/20' : 'focus:ring-primary/20'} border`}
                                />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>Tank Capacity (L)</span>
                                <input
                                    type="number"
                                    value={formData.tank_capacity_litres}
                                    onChange={(e) => updateField('tank_capacity_litres', parseInt(e.target.value) || 0)}
                                    className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-primary' : 'bg-white border-slate-200 focus:border-primary'} rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-primary/20' : 'focus:ring-primary/20'} border`}
                                />
                            </label>
                        </div>

                        {/* Fuel Efficiency and Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex flex-col gap-1.5">
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>Fuel Rate (L/hr)</span>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.fuel_efficiency_lphr}
                                    onChange={(e) => updateField('fuel_efficiency_lphr', parseFloat(e.target.value) || 0)}
                                    className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-primary' : 'bg-white border-slate-200 focus:border-primary'} rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-primary/20' : 'focus:ring-primary/20'} border`}
                                />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>Status</span>
                                <select
                                    value={formData.status}
                                    onChange={(e) => updateField('status', e.target.value)}
                                    className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-primary' : 'bg-white border-slate-200 focus:border-primary'} rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-primary/20' : 'focus:ring-primary/20'} border cursor-not-allowed`}
                                >
                                    <option value="active">Active</option>
                                    <option value="standby">Standby</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </label>
                        </div>

                        {/* Maintenance Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex flex-col gap-1.5">
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>Last Maintenance</span>
                                <input
                                    type="date"
                                    value={formData.last_maintenance_date || ''}
                                    onChange={(e) => updateField('last_maintenance_date', e.target.value)}
                                    className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-primary' : 'bg-white border-slate-200 focus:border-primary'} rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-primary/20' : 'focus:ring-primary/20'} border`}
                                />
                            </label>
                            <label className="flex flex-col gap-1.5">
                                <span className={`text-xs font-bold ${isDark ? 'text-slate-500' : 'text-slate-500'} uppercase tracking-wide`}>Next Maintenance</span>
                                <input
                                    type="date"
                                    value={formData.next_maintenance_date || ''}
                                    onChange={(e) => updateField('next_maintenance_date', e.target.value)}
                                    className={`w-full ${isDark ? 'bg-[#0d1117] border-[#21262d] text-white focus:border-primary' : 'bg-white border-slate-200 focus:border-primary'} rounded-lg px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-primary/20' : 'focus:ring-primary/20'} border`}
                                />
                            </label>
                        </div>

                        {/* Info Box */}
                        <div className={`${isDark ? 'bg-primary/10 border-primary/20' : 'bg-primary/5 border-primary/20'} rounded-lg p-4 flex items-start gap-3 border`}>
                            <Fuel className={`w-5 h-5 ${isDark ? 'text-primary' : 'text-primary'} mt-0.5 flex-shrink-0`} />
                            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-primary'}`}>
                                <p className="font-bold mb-1">Fuel Rate Calculation</p>
                                <p>The fuel rate is used to estimate daily consumption. Set this to your generator&apos;s average litres per hour of operation.</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className={`flex-1 px-4 py-3 border ${isDark ? 'border-[#30363d] text-slate-400 hover:bg-[#21262d]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'} font-bold rounded-xl transition-colors`}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`flex-1 px-4 py-3 ${isDark ? 'bg-primary hover:bg-primary-dark' : 'bg-primary hover:bg-primary-dark'} text-white font-bold rounded-xl transition-colors shadow-lg ${isDark ? 'shadow-primary/40' : 'shadow-primary/20'} disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        {existingGenerator ? 'Update Generator' : 'Add Generator'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default GeneratorConfigModal;
