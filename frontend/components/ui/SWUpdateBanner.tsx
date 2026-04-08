'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, Zap } from 'lucide-react';

/**
 * SWUpdateBanner
 * 
 * Detects when a new Service Worker is waiting to activate (i.e., after a 
 * new deployment) and shows a non-intrusive banner asking the user to refresh.
 * 
 * When the user clicks "Refresh Now":
 *  1. We send SKIP_WAITING to the waiting SW
 *  2. The new SW activates and claims all clients
 *  3. We reload the page so users get the new version cleanly
 * 
 * This prevents the stale-cache / infinite-loading-spinner problem that 
 * occurs when users have old JS chunks cached after a new deployment.
 */
export default function SWUpdateBanner() {
    const [showBanner, setShowBanner] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleUpdate = useCallback(() => {
        if (!waitingWorker) return;
        setIsRefreshing(true);

        // Tell the waiting SW to skip waiting and activate immediately
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });

        // Once the new SW has taken control, reload this page
        // so users get the fresh JS chunks
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            window.location.reload();
        }, { once: true });
    }, [waitingWorker]);

    useEffect(() => {
        if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

        const checkForUpdate = async () => {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (!registration) return;

                // If there's already a waiting worker when we load, show banner immediately
                if (registration.waiting) {
                    setWaitingWorker(registration.waiting);
                    setShowBanner(true);
                }

                // Listen for new SW installations (future updates while the app is open)
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (!newWorker) return;

                    newWorker.addEventListener('statechange', () => {
                        // New SW installed and waiting — the old SW is still running
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            setWaitingWorker(newWorker);
                            setShowBanner(true);
                        }
                    });
                });

                // Force-check for updates every time the app gains focus
                // This catches the case where the user had the tab open during a deploy
                const handleFocus = () => registration.update().catch(() => {});
                window.addEventListener('focus', handleFocus);
                return () => window.removeEventListener('focus', handleFocus);
            } catch (err) {
                // Non-critical — fail silently
            }
        };

        checkForUpdate();
    }, []);

    return (
        <AnimatePresence>
            {showBanner && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md"
                >
                    <div className="bg-slate-900 text-white rounded-2xl shadow-2xl shadow-black/40 p-4 flex items-center gap-3 border border-slate-700">
                        {/* Icon */}
                        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Zap size={16} className="text-primary" />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-300">
                                New Version Available
                            </p>
                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                Refresh to get the latest updates
                            </p>
                        </div>

                        {/* Refresh button */}
                        <button
                            onClick={handleUpdate}
                            disabled={isRefreshing}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex-shrink-0 disabled:opacity-60"
                        >
                            <RefreshCw
                                size={11}
                                className={isRefreshing ? 'animate-spin' : ''}
                            />
                            {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
                        </button>

                        {/* Dismiss */}
                        <button
                            onClick={() => setShowBanner(false)}
                            className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                            title="Dismiss"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
