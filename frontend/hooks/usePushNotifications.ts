'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { createClient } from '@/frontend/utils/supabase/client';
import { requestForToken, onMessageListener, app } from '@/frontend/lib/firebase';

export function usePushNotifications() {
    const [token, setToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<any>(null);
    const supabase = useMemo(() => createClient(), []);
    const lastProcessedUserId = useRef<string | null>(null);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                const user = session?.user;
                if (!user || lastProcessedUserId.current === user.id) return;

                // Mark this user as processed
                lastProcessedUserId.current = user.id;

                const initializePush = async () => {
                    if (!app) {
                        console.warn('Push Notifications: Firebase app not initialized.');
                        return;
                    }

                    // Register Service Worker
                    let registration: ServiceWorkerRegistration | undefined;
                    if ('serviceWorker' in navigator) {
                        try {
                            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                            await navigator.serviceWorker.ready;
                            console.log('Push Service Worker registered and ready');
                        } catch (err) {
                            console.error('Service Worker registration failed:', err);
                        }
                    }

                    if (!registration) {
                        console.warn('Cannot obtain token without service worker registration.');
                        return;
                    }

                    // Get FCM Token
                    const fcmToken = await requestForToken(registration);
                    if (fcmToken) {
                        setToken(fcmToken);

                        // Fetch property membership
                        const { data: membershipData } = await supabase
                            .from('property_memberships')
                            .select('property_id')
                            .eq('user_id', user.id)
                            .eq('is_active', true)
                            .limit(1)
                            .maybeSingle();

                        const propertyId = membershipData?.property_id || null;

                        // Cleanup old tokens for this device/browser
                        await supabase
                            .from('push_tokens')
                            .update({ is_active: false })
                            .eq('user_id', user.id)
                            .eq('browser', navigator.userAgent)
                            .neq('token', fcmToken);

                        // Upsert current token
                        const { error } = await supabase
                            .from('push_tokens')
                            .upsert({
                                user_id: user.id,
                                token: fcmToken,
                                browser: navigator.userAgent,
                                property_id: propertyId,
                                is_active: true,
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'token' });

                        if (error) console.error('Error saving push token:', error);
                        else console.log('Push token saved successfully for user:', user.id);
                    }
                };

                initializePush();
            }
        });

        if (app) {
            onMessageListener().then((payload: any) => {
                setNotification(payload);
                console.log('Foreground notification received:', payload);
            });
        }

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    return { token, notification };
}
