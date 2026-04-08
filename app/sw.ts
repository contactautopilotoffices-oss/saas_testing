/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, NetworkFirst, Serwist } from "serwist";

declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
        __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
    }
}

declare const self: ServiceWorkerGlobalScope;

// ─── Filter out the dangerous defaultCache rules ──────────────────────────────
// We remove rules that cache API responses and pages for 24h, which cause
// users to get stuck after new deployments with stale JS chunks.
const safeRuntimeCache = defaultCache.filter((entry) => {
    // Remove: API caching (causes stale auth/session responses)
    if (
        typeof entry.matcher === "function" &&
        entry.matcher.toString().includes("/api/")
    ) {
        return false;
    }
    // Remove: pages, pages-rsc, others — these cache HTML that references
    // old JS chunk hashes, breaking the app after every new deployment
    if (
        (entry as any)?.handler?.cacheName === "pages" ||
        (entry as any)?.handler?.cacheName === "pages-rsc" ||
        (entry as any)?.handler?.cacheName === "pages-rsc-prefetch" ||
        (entry as any)?.handler?.cacheName === "others"
    ) {
        return false;
    }
    return true;
});

const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,

    // Do NOT wait. We need immediate activation to prevent the old SW from
    // trapping the user in a broken chunk state when they open a new tab.
    skipWaiting: true,

    // clientsClaim: true so when the new SW finally activates it takes
    // over all tabs immediately.
    clientsClaim: true,

    navigationPreload: true,

    runtimeCaching: [
        // ── LAYER 1: Auth & API routes (REMOVED) ────────────────────────
        // We purposefully DO NOT intercept auth and API routes at all.
        // Allowing the browser to handle these natively allows OAuth 302 
        // redirects to external domains (like Google/Zoho) to execute normally.

        // ── LAYER 2: Next.js page navigation — short cache, network first ────
        // Cache pages for only 60 seconds so users always get fresh HTML
        // after a deployment. NetworkFirst means it tries network first, falls
        // back to cache only when truly offline.
        {
            matcher: ({ request, url, sameOrigin }) =>
                request.headers.get("Accept")?.includes("text/html") &&
                sameOrigin &&
                !url.pathname.startsWith("/api/"),
            handler: new NetworkFirst({
                cacheName: "pages",
                networkTimeoutSeconds: 5,
            }),
        },

        // ── LAYER 3: RSC (React Server Components) — short-lived ─────────────
        {
            matcher: ({ request, url, sameOrigin }) =>
                request.headers.get("RSC") === "1" &&
                sameOrigin &&
                !url.pathname.startsWith("/api/"),
            handler: new NetworkFirst({
                cacheName: "pages-rsc",
                networkTimeoutSeconds: 5,
            }),
        },

        // ── LAYER 4: Safe static assets (fonts, images) — longer cache ───────
        // These don't change between deploys (content-addressed or versioned)
        ...safeRuntimeCache,
    ],
});

serwist.addEventListeners();

// ── Listen for SKIP_WAITING from the update banner ───────────────────────────
// When the user clicks "Update Now", the app posts this message and the
// new SW activates immediately.
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
    const data = event.data?.json() ?? {};
    const title = data.title || "Autopilot Notice";
    const options = {
        body: data.body || "You have a new notification from Autopilot",
        icon: "/android-chrome-192x192.png",
        badge: "/android-chrome-192x192.png",
        data: data.url ? { url: data.url } : undefined,
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url;

    if (url) {
        event.waitUntil(
            self.clients.matchAll({ type: "window" }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url === url && "focus" in client) {
                        return client.focus();
                    }
                }
                if (self.clients.openWindow) {
                    return self.clients.openWindow(url);
                }
            })
        );
    }
});
