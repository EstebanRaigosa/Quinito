import type { Metadata, Viewport } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { AppleSplashLinks } from "@/components/shared/AppleSplashLinks";
import { ThemeKeeper } from "@/components/shared/ThemeKeeper";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { SITE_URL } from "@/lib/constants";

const mulish = Mulish({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  // Base para resolver URLs absolutas de Open Graph / Twitter (previews de link).
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Pollota Mundial 2026",
    template: "%s · Pollota Mundial 2026",
  },
  description:
    "Crea y participa en pollas grupales del Mundial 2026. Predice marcadores, compite con tu grupo y sube en la tabla.",
  applicationName: "Pollota",
  openGraph: {
    type: "website",
    siteName: "Pollota Mundial 2026",
    locale: "es_CO",
    title: "Pollota Mundial 2026",
    description:
      "Crea y participa en pollas grupales del Mundial 2026. Predice marcadores, compite con tu grupo y sube en la tabla.",
    images: [
      {
        url: "/images/estadio.png",
        width: 1200,
        height: 630,
        alt: "Estadio de fútbol lleno visto desde la grada, con las luces encendidas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pollota Mundial 2026",
    description: "Crea y participa en pollas grupales del Mundial 2026.",
    images: ["/images/estadio.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pollota",
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
        {/* Mantiene `data-theme` en <html> aunque un refresh del servidor
            reconcilie el elemento y lo borre (evita el salto a tema claro). */}
        <ThemeKeeper />
        <Providers>{children}</Providers>
        <Toaster />
      </body>
    </html>
  );
}
