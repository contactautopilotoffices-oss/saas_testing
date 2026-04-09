/**
 * Minimalist Service Worker
 * 
 * This worker strictly handles Web Push Notifications.
 * Caching and offline mode have been removed to ensure the app 
 * always fetches fresh data and never gets stuck with stale JS chunks.
 */

// 1. Force immediate activation for new versions of this worker
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Reclaim all clients immediately to ensure they are managed by this new worker
    event.waitUntil(self.clients.claim());
});

/**
 * NOTE: We do NOT implement a 'fetch' listener here.
 * This ensures that the browser handles all network requests natively,
 * bypassing the Service Worker entirely for pages and API calls.
 */

// 2. Web Push Notifications
self.addEventListener("push", (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch (e) {
        console.error('Push event data parsing failed:', e);
    }
    
    const title = data.title || "Autopilot Notice";
    const options = {
        body: data.body || "You have a new notification from Autopilot",
        icon: "/android-chrome-192x192.png",
        badge: "/android-chrome-192x192.png",
        data: data.url ? { url: data.url } : undefined,
        requireInteraction: true,
        vibrate: [200, 100, 200]
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// 3. Notification Click Handling
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data ? event.notification.data.url : null;

    if (url) {
        event.waitUntil(
            self.clients.matchAll({ type: "window" }).then((clientList) => {
                // If a matching tab is already open, focus it
                for (const client of clientList) {
                    if (client.url === url && "focus" in client) {
                        return client.focus();
                    }
                }
                // Otherwise open a new tab
                if (self.clients.openWindow) {
                    return self.clients.openWindow(url);
                }
            })
        );
    }
});