import type { MetadataRoute } from "next";

/**
 * Manifest PWA. Los íconos PNG en todos los tamaños + splash screens iOS se
 * completan en la Fase 7 (PLAN). Por ahora un ícono SVG de marca instalable.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Polla Mundial 2026",
    short_name: "Polla",
    description:
      "Crea y participa en pollas grupales del Mundial 2026. Predice marcadores y compite con tu parche.",
    // Raíz (no /dashboard, que es protegida): RootPage decide a dónde llevar
    // según haya sesión. Evita un redirect a /login en cada cold start si ITP
    // evictó la sesión (COMPATIBILIDAD-STACK §1/§8).
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8FAFC",
    // Alineado con el themeColor (light) del viewport en app/layout.tsx.
    theme_color: "#F8FAFC",
    lang: "es-CO",
    categories: ["sports", "games", "social"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      // PNG en tamaños concretos: algunos contextos de instalación (Android/
      // Chrome) los prefieren sobre el SVG.
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
