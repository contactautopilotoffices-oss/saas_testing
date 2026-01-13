import type { Metadata } from "next";
import { Poppins, Urbanist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { GlobalProvider } from "@/context/GlobalContext";
import { ThemeProvider } from "@/context/ThemeContext";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;

}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${urbanist.variable}`} suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground antialiased overflow-x-hidden font-body">
        <ThemeProvider>
          <AuthProvider>
            <GlobalProvider>
              {children}
            </GlobalProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
