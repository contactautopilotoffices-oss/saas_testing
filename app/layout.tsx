import type { Metadata, Viewport } from "next";
import { Poppins, Urbanist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/frontend/context/AuthContext";
import { GlobalProvider } from "@/frontend/context/GlobalContext";
import { ThemeProvider } from "@/frontend/context/ThemeContext";
import { DataCacheProvider } from "@/frontend/context/DataCacheContext";
import { SessionProvider, CookieConsentToast } from "@/frontend/components/analytics";
import NotificationSystem from "@/frontend/components/ops/NotificationSystem";
import SWUpdateBanner from "@/frontend/components/ui/SWUpdateBanner";

const poppins = Poppins({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700", "800", "900"],
    variable: "--font-display",
    display: 'swap',
});

const urbanist = Urbanist({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
    variable: "--font-body",
    display: 'swap',
});

export const metadata: Metadata = {
    title: "Autopilot | Facility Management on Autopilot",
    description: "Facilities that run without constant follow-ups. Fewer complaints. Faster fixes. Clear accountability. The operating system for modern buildings.",
    keywords: ["facility management", "building maintenance", "operations automation", "property management", "SaaS"],
    manifest: "/manifest.json",
};

export const viewport: Viewport = {
    themeColor: "#ffffff",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;

}>) {
    return (
        <html lang="en" className={`${poppins.variable} ${urbanist.variable}`} suppressHydrationWarning>
            <head>
                <link rel="manifest" href="/manifest.json" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body className="bg-background text-foreground antialiased overflow-x-hidden font-body">
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                if (!('serviceWorker' in navigator)) return;

                                // ── DEV MODE GUARD ───────────────────────────────────────────────────
                                // In development (localhost), the production sw.js contains baked-in
                                // chunk hashes that don't match dev server chunks → 404 errors.
                                // Always unregister the SW on localhost so dev works cleanly.
                                var isLocalhost = (
                                    window.location.hostname === 'localhost' ||
                                    window.location.hostname === '127.0.0.1' ||
                                    window.location.hostname.endsWith('.local') ||
                                    window.location.hostname.endsWith('.loca.lt')
                                );
                                if (isLocalhost) {
                                    if ('serviceWorker' in navigator) {
                                        navigator.serviceWorker.getRegistrations().then(function(regs) {
                                            regs.forEach(function(r) { r.unregister(); });
                                        });
                                    }
                                    if ('caches' in window) {
                                        caches.keys().then(function(keys) {
                                            keys.forEach(function(key) { caches.delete(key); });
                                        });
                                    }
                                    return;
                                }

                                // ── PRODUCTION ONLY BELOW ────────────────────────────────────────────
                                // One-time migration: clear stale SW that aggressively cached pages.
                                // Runs once per user on their first visit after this deployment.
                                const MIGRATION_KEY = 'sw_cache_migration_v7';
                                if (!localStorage.getItem(MIGRATION_KEY)) {
                                    // Fix: await all unregister + cache deletion before reload,
                                    // otherwise the old SW handles the reload (race condition).
                                    localStorage.setItem(MIGRATION_KEY, 'true');
                                    Promise.all([
                                        navigator.serviceWorker.getRegistrations().then(function(registrations) {
                                            return Promise.all(registrations.map(function(reg) { return reg.unregister(); }));
                                        }),
                                        'caches' in window ? caches.keys().then(function(keys) {
                                            return Promise.all(keys.map(function(key) { return caches.delete(key); }));
                                        }) : Promise.resolve()
                                    ]).then(function() {
                                        window.location.reload();
                                    });
                                    return;
                                }

                                // ── Register + force-check for updates on every page load ───────────
                                window.addEventListener('load', function() {
                                    navigator.serviceWorker.register('/sw.js').then(function(reg) {
                                        reg.update();
                                    }).catch(function() {});

                                    // ── Hydration Watchdog ───────────────────────────────────────────
                                    // If the app does not signal window.HYDRATED within 10 seconds,
                                    // it means React failed to hydrate (likely due to stale JS chunks).
                                    // We force-clear all SW caches and reload to recover the user.
                                    setTimeout(function() {
                                        if (window.HYDRATED) return;
                                        console.error('[SW Watchdog] Hydration timeout — clearing SW and reloading.');
                                        Promise.all([
                                            navigator.serviceWorker.getRegistrations().then(function(regs) {
                                                return Promise.all(regs.map(function(r) { return r.unregister(); }));
                                            }),
                                            'caches' in window ? caches.keys().then(function(keys) {
                                                return Promise.all(keys.map(function(k) { return caches.delete(k); }));
                                            }) : Promise.resolve()
                                        ]).then(function() {
                                            window.location.reload();
                                        });
                                    }, 10000);
                                });
                            })();

                        `,
                    }}
                />
                <ThemeProvider>
                    <AuthProvider>
                        <GlobalProvider>
                            <DataCacheProvider>
                                <SessionProvider>
                                    {children}
                                    <SWUpdateBanner />
                                    <NotificationSystem />
                                    <CookieConsentToast />
                                </SessionProvider>
                            </DataCacheProvider>
                        </GlobalProvider>
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
