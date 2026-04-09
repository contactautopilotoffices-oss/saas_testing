import type { Metadata, Viewport } from "next";
import { Poppins, Urbanist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/frontend/context/AuthContext";
import { GlobalProvider } from "@/frontend/context/GlobalContext";
import { ThemeProvider } from "@/frontend/context/ThemeContext";
import { DataCacheProvider } from "@/frontend/context/DataCacheContext";
import { SessionProvider, CookieConsentToast } from "@/frontend/components/analytics";
import NotificationSystem from "@/frontend/components/ops/NotificationSystem";

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

                                // ── ONE-TIME CACHE PURGE ───────────────────────────────────────────
                                // We clear all previous Serwist caches to recover the user from any
                                // stale-chunk bugs caused by the previous caching strategy.
                                const PURGE_KEY = 'sw_cache_purge_v3';
                                if (!localStorage.getItem(PURGE_KEY)) {
                                    localStorage.setItem(PURGE_KEY, 'true');
                                    if ('caches' in window) {
                                        caches.keys().then(function(keys) {
                                            keys.forEach(function(key) { caches.delete(key); });
                                        });
                                    }
                                }

                                // ── Minimal Registration for Push Notifications ───────────────────
                                // We keep the Service Worker registered ONLY for notifications.
                                // The new sw.js has no fetch listener, so all requests are native.
                                window.addEventListener('load', function() {
                                    navigator.serviceWorker.register('/sw.js').catch(function() {});
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
