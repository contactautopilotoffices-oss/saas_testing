import type { Metadata } from "next"; // Fixed: Import Metadata type
import { Inter, Outfit } from "next/font/google"; // Outfit as proxy for "Söhne/Architectural"
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { GlobalProvider } from "@/context/GlobalContext";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: 'swap',
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
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
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground antialiased overflow-x-hidden font-sans">
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
