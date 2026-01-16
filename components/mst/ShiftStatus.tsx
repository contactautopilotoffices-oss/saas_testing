'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, LogOut, Clock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ShiftStatusProps {
  isCheckedIn: boolean;
  isLoading: boolean;
  onToggle: () => void;
}

export default function ShiftStatus({ isCheckedIn, isLoading, onToggle }: ShiftStatusProps) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isCheckedIn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          <h3 className="font-semibold text-foreground">Shift Status</h3>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
          isCheckedIn ? 'bg-green-500/10 text-green-600' : 'bg-gray-100 text-gray-500'
        }`}>
          {isCheckedIn ? 'ON DUTY' : 'OFF DUTY'}
        </span>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3 bg-background rounded-lg border border-border/50">
          <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {isCheckedIn ? 'Actively receiving tickets' : 'Shift currently inactive'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isCheckedIn 
                ? 'Your load is being balanced across active MSTs.' 
                : 'Check in to start receiving new service requests.'}
            </p>
          </div>
        </div>

        <button
          onClick={onToggle}
          disabled={isLoading}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-all ${
            isCheckedIn 
              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
              : 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
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
    </div>
  );
}

// Toast Component for Shift Updates
export const ShiftToast = ({ message, type, visible }: { message: string, type: 'success' | 'error', visible: boolean }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border shadow-2xl min-w-[300px]"
      >
        {type === 'success' ? (
          <CheckCircle2 className="w-5 h-5 text-green-500" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-500" />
        )}
        <p className="text-sm font-medium text-foreground">{message}</p>
      </motion.div>
    )}
  </AnimatePresence>
);
