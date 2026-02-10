'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Bell, CheckCircle2, AlertCircle, Clock, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/frontend/utils/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';

interface Notification {
    id: string;
    notification_type: string;
    title: string;
    message: string;
    deep_link: string;
    ticket_id?: string;
    is_read: boolean;
    created_at: string;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    const fetchNotifications = useCallback(async () => {
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
        setIsLoading(false);
    }, [supabase]);

    useEffect(() => {
        const init = async () => {
            await fetchNotifications();
        };
        init();

        // Subscribe to real-time updates
        const channel = supabase
            .channel('user-notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                (payload) => {
                    setNotifications((prev) => [payload.new as Notification, ...prev]);
                    setUnreadCount((count) => count + 1);
                    // Play notification sound (optional)
                }
            )
            .subscribe();

        // Close dropdown when clicking outside
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            supabase.removeChannel(channel);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [fetchNotifications, supabase]);

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(count => Math.max(0, count - 1));
        }
    };

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        }
    };

    const handleNotificationClick = (notif: Notification) => {
        if (!notif.is_read) {
            markAsRead(notif.id);
        }
        setIsOpen(false);
        // Use deep_link if available, otherwise fallback to ticket detail page
        const link = notif.deep_link || (notif.ticket_id ? `/tickets/${notif.ticket_id}?via=notification` : '/notifications');
        router.push(link);
    };

    // Parse created_at as UTC to avoid timezone offset issues
    const parseUTCDate = (dateStr: string): Date => {
        // Supabase returns UTC timestamps, but without 'Z' suffix
        // JavaScript Date() treats strings without 'Z' as local time
        if (dateStr && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
            return new Date(dateStr + 'Z');
        }
        return new Date(dateStr);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'TICKET_CREATED': return <AlertCircle className="w-4 h-4 text-primary" />;
            case 'TICKET_ASSIGNED': return <Clock className="w-4 h-4 text-amber-500" />;
            case 'TICKET_COMPLETED': return <CheckCircle2 className="w-4 h-4 text-success" />;
            default: return <Info className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl border border-border bg-white text-text-tertiary hover:text-text-primary hover:border-primary/20 transition-all group"
            >
                <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-wiggle' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-black text-white border-2 border-white shadow-sm shadow-primary/40">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-80 bg-white border border-border rounded-2xl shadow-2xl z-[100] overflow-hidden"
                    >
                        <div className="p-4 border-b border-border bg-surface-elevated/50 flex justify-between items-center">
                            <h3 className="text-[11px] font-black uppercase tracking-widest text-text-primary">Notifications</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-[10px] font-bold text-primary hover:underline"
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto">
                            {isLoading ? (
                                <div className="p-8 text-center text-[11px] font-medium text-text-tertiary">Loading notifications...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center gap-3">
                                    <div className="w-12 h-12 bg-surface-elevated rounded-full flex items-center justify-center text-text-tertiary/20">
                                        <Bell className="w-6 h-6" />
                                    </div>
                                    <p className="text-[11px] font-medium text-text-tertiary">No notifications yet</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-4 border-b border-border/50 hover:bg-surface-elevated cursor-pointer transition-colors relative group ${notif.is_read ? '' : 'bg-primary/5'}`}
                                    >
                                        {!notif.is_read && (
                                            <div className="absolute top-4 right-4 w-1.5 h-1.5 bg-primary rounded-full" />
                                        )}
                                        <div className="flex gap-3">
                                            <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${notif.is_read ? 'bg-slate-50 text-slate-400' : 'bg-primary/10 text-primary'}`}>
                                                {getIcon(notif.notification_type)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className={`text-[13px] font-bold leading-tight mb-1 truncate ${notif.is_read ? 'text-text-secondary' : 'text-text-primary'}`}>
                                                    {notif.title}
                                                </h4>
                                                <p className="text-[11px] text-text-tertiary line-clamp-2 leading-relaxed">
                                                    {notif.message}
                                                </p>
                                                <p className="text-[9px] font-black text-text-tertiary/60 uppercase tracking-widest mt-2 flex items-center gap-1.5">
                                                    <Clock className="w-2.5 h-2.5" />
                                                    {formatDistanceToNow(parseUTCDate(notif.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-3 border-t border-border bg-surface-elevated/20 text-center">
                            <button
                                onClick={() => { setIsOpen(false); router.push('/notifications'); }}
                                className="text-[10px] font-black uppercase tracking-widest text-text-tertiary hover:text-primary transition-colors"
                            >
                                View All Activity
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
