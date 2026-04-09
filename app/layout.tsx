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

                                // ── DEEP PURGE & RESET ───────────────────────────────────────────
                                // We aggressively unregister ALL workers and clear ALL caches 
                                // to recover from the aggressive caching bugs in previous versions.
                                const PURGE_KEY = 'sw_deep_purge_v5';
                                if (!localStorage.getItem(PURGE_KEY)) {
                                    localStorage.setItem(PURGE_KEY, 'true');
                                    
                                    // 1. Unregister EVERY found worker
                                    navigator.serviceWorker.getRegistrations().then(function(regs) {
                                        for (let reg of regs) reg.unregister();
                                    });

                                    // 2. Delete EVERY found cache bucket
                                    if ('caches' in window) {
                                        caches.keys().then(function(keys) {
                                            keys.forEach(function(key) { caches.delete(key); });
                                        });
                                    }
                                    
                                    // 3. Force a one-time clean reload
                                    console.log('[Deep Purge] Cleaning up old workers/caches and reloading...');
                                    setTimeout(function() { window.location.reload(); }, 500);
                                    return;
                                }

                                // ── Minimal Registration for Push Notifications ───────────────────
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
