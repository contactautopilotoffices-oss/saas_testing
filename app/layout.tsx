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
                                const MIGRATION_KEY = 'sw_cache_migration_v5';
                                if (!localStorage.getItem(MIGRATION_KEY)) {
                                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                                        registrations.forEach(function(reg) { reg.unregister(); });
                                    });
                                    if ('caches' in window) {
                                        caches.keys().then(function(keys) {
                                            keys.forEach(function(key) { caches.delete(key); });
                                        });
                                    }
                                    localStorage.setItem(MIGRATION_KEY, 'true');
                                    window.location.reload();
                                    return;
                                }

                                // ── Register + force-check for updates on every page load ───────────
                                // reg.update() checks for a new sw.js immediately, reducing the
                                // stale-cache window from hours to seconds after each deployment.
                                window.addEventListener('load', function() {
                                    navigator.serviceWorker.register('/sw.js').then(function(reg) {
                                        reg.update();
                                    }).catch(function() {});
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
