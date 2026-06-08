import type { Metadata, Viewport } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { AppleSplashLinks } from "@/components/shared/AppleSplashLinks";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const mulish = Mulish({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Polla Mundial 2026",
    template: "%s · Polla Mundial 2026",
  },
  description:
    "Crea y participa en pollas grupales del Mundial 2026. Predice marcadores, compite con tu grupo y sube en la tabla.",
  applicationName: "Polla",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Polla",
  },
  formatDetection: {
    telephone: false,
    date: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5, // no bloquear zoom por accesibilidad (§1)
  userScalable: true,
  viewportFit: "cover", // habilita env(safe-area-inset-*)
  interactiveWidget: "resizes-visual", // mejor manejo del teclado virtual iOS (§1.1/§4.1)
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#07111F" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO" className={mulish.variable} suppressHydrationWarning>
      <head>
        {/* Resuelve y aplica el tema antes del primer pintado (evita FOUC). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Splash screens iOS (evita pantalla blanca en la PWA instalada). */}
        <AppleSplashLinks />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
