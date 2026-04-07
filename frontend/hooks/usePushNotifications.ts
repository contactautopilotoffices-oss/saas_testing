import { useState, useEffect } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false);
    const [subscription, setSubscription] = useState<PushSubscription | null>(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const isDev = process.env.NODE_ENV === 'development';
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            setIsSupported(true);
            if (!isDev) {
                registerServiceWorker();
            }
        }
    }, []);

    async function registerServiceWorker() {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);
        } catch (error) {
            console.error('Service Worker registration failed:', error);
        }
    }

    async function subscribeToPush() {
        if (!VAPID_PUBLIC_KEY) {
            console.error('VAPID public key not found in env');
            setMessage('Configuration error: No VAPID key');
            return null;
        }

        try {
            const registration = await navigator.serviceWorker.ready;
            let sub = await registration.pushManager.getSubscription();

            if (!sub) {
                // Automatically ask for permission during subscription
                sub = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
                });
            }

            setSubscription(sub);
            setMessage('Successfully subscribed to push notifications!');

            // Save subscription to backend
            await fetch('/api/web-push/save-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sub),
            });

            return sub;
        } catch (error) {
            console.error('Error subscribing to push:', error);
            setMessage(error instanceof Error ? error.message : 'Failed to subscribe to push');
            return null;
        }
    }

    return {
        isSupported,
        subscription,
        subscribeToPush,
        message
    };
}

function urlB64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
