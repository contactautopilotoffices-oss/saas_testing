'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, LogOut, Loader2, ChevronDown, Clock } from 'lucide-react';

interface NavbarShiftStatusProps {
    isCheckedIn: boolean;
    isLoading: boolean;
    onToggle: () => void;
}

export default function NavbarShiftStatus({ isCheckedIn, isLoading, onToggle }: NavbarShiftStatusProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Compact Navbar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all
          border ${isCheckedIn
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }
        `}
            >
                {/* Status Indicator Dot */}
                <div className={`
          w-2 h-2 rounded-full transition-all
          ${isCheckedIn ? 'bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-gray-400'}
        `} />

                {/* Status Text - Hidden on very small screens */}
                <span className={`
          text-xs font-semibold hidden sm:inline
          ${isCheckedIn ? 'text-green-700' : 'text-gray-600'}
        `}>
                    {isCheckedIn ? 'On Duty' : 'Off Duty'}
                </span>

                {/* Dropdown Arrow */}
                <ChevronDown className={`
          w-3 h-3 transition-transform
          ${isOpen ? 'rotate-180' : ''}
          ${isCheckedIn ? 'text-green-600' : 'text-gray-500'}
        `} />
            </button>

            {/* Dropdown Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                    <span className="text-sm font-semibold text-slate-900">Shift Status</span>
                                </div>
                                <span className={`
                  text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                  ${isCheckedIn ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}
                `}>
                                    {isCheckedIn ? 'On Duty' : 'Off Duty'}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-3">
                            {/* Info Card */}
                            <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-xs font-medium text-slate-700">
                                        {isCheckedIn ? 'Actively receiving tickets' : 'Shift currently inactive'}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                        {isCheckedIn
                                            ? 'Your load is being balanced across active MSTs.'
                                            : 'Check in to start receiving new service requests.'}
                                    </p>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={() => {
                                    onToggle();
                                    setIsOpen(false);
                                }}
                                disabled={isLoading}
                                className={`
                  w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all text-sm
                  ${isCheckedIn
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                        : 'bg-primary text-white hover:opacity-90 shadow-sm'
                                    } 
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isCheckedIn ? (
                                    <>
                                        <LogOut className="w-4 h-4" />
                                        Check Out
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-4 h-4" />
                                        Check In
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
