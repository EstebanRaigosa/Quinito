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
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F8FAFC",
    theme_color: "#16A34A",
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
