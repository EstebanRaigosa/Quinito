/// <reference lib="webworker" />
import {
  CacheFirst,
  ExpirationPlugin,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
  type RuntimeCaching,
  type SerwistGlobalConfig,
} from "serwist";

// Tipado del scope del service worker: el manifest de precache lo inyecta
// Serwist en build (`__SW_MANIFEST`).
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * Caché de runtime CURADA (NO usar `defaultCache`).
 *
 * PRIVACIDAD (CLAUDE.md §3.4 / COMPATIBILIDAD-STACK.md §2): `defaultCache` de
 * @serwist/next aplica `NetworkFirst` a las navegaciones/RSC, lo que guardaría
 * en disco HTML/payloads que pueden contener predicciones nominales (PII). En
 * un dispositivo compartido eso filtra datos. Por eso aquí **solo** cacheamos
 * estáticos inmutables (con hash en el nombre) y dejamos que TODA navegación,
 * RSC, server action y respuesta de datos vaya SIEMPRE a la red (sin caché).
 * El offline real de páginas se evaluará en la fase PWA con exclusiones
 * explícitas de los endpoints de predicciones.
 */
const runtimeCaching: RuntimeCaching[] = [
  // Fuentes de Google (CSS + woff2): inmutables, sin PII.
  {
    matcher: ({ url }) =>
      url.origin === "https://fonts.googleapis.com" ||
      url.origin === "https://fonts.gstatic.com",
    handler: new CacheFirst({
      cacheName: "google-fonts",
      plugins: [
        new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      ],
    }),
  },
  // Assets de build de Next (_next/static): nombre con hash → inmutables.
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith("/_next/static/"),
    handler: new CacheFirst({
      cacheName: "next-static",
      plugins: [
        new ExpirationPlugin({ maxEntries: 160, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      ],
    }),
  },
  // Imágenes (banderas, ilustraciones, íconos, splash): sin PII.
  {
    matcher: ({ request, sameOrigin }) =>
      sameOrigin && request.destination === "image",
    handler: new StaleWhileRevalidate({
      cacheName: "images",
      plugins: [
        new ExpirationPlugin({ maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // Sin caché de navegaciones → el preload de navegación no tiene consumidor.
  navigationPreload: false,
  runtimeCaching,
});

serwist.addEventListeners();
