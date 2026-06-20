/// <reference lib="webworker" />
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
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
  // Navegaciones: SIEMPRE a la red, SIN cachear (NetworkOnly preserva la
  // privacidad — no guarda HTML/RSC con predicciones nominales). PERO si la red
  // falla, en vez del error del navegador servimos la página /offline neutra
  // (precacheada vía additionalPrecacheEntries). Esto NO viola §3.4: NetworkOnly
  // no almacena ninguna navegación real; el único documento en caché es /offline.
  {
    matcher: ({ request }) => request.mode === "navigate",
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // Sin caché de navegaciones → el preload de navegación no tiene consumidor.
  navigationPreload: false,
  runtimeCaching,
  // Fallback offline: cuando una navegación (documento) falla por falta de red,
  // se sirve la página /offline precacheada en vez del error del navegador.
  // Serwist cablea la instancia internamente. /offline se precachea vía
  // `additionalPrecacheEntries` en next.config.
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// ── Web Push ────────────────────────────────────────────────────────────────
// Notificaciones de la PWA (iOS 16.4+ instalada / Android / desktop). El server
// firma con VAPID y manda un payload JSON; aquí lo mostramos. PRIVACIDAD
// (CLAUDE.md §3.4): el payload nunca trae predicciones de nadie, solo texto
// genérico ("cierra X partido pronto") + una URL a la que navegar al tocar.

/** Forma del payload JSON que envía la Edge Function. */
type PushPayload = {
  titulo: string;
  cuerpo: string;
  /** Ruta interna a abrir al tocar la notificación (ej. "/partidos"). */
  url?: string;
  /** Ícono redondo de la notificación (ej. "/api/notif-vs?l=BRA&v=ARG"). */
  icono?: string;
  /** Agrupa/reemplaza notificaciones del mismo tema (ej. "partido-74"). */
  tag?: string;
  /** Banner grande (solo lo muestra Android/Chrome; iOS lo ignora). */
  imagen?: string;
  /** Etiqueta de un botón de acción (solo Android; iOS lo ignora). */
  accion?: string;
};

self.addEventListener("push", (event) => {
  // Sin datos legibles → notificación mínima (algunos push services hacen ping
  // sin payload). userVisibleOnly nos obliga a mostrar SIEMPRE algo.
  let payload: PushPayload = {
    titulo: "Pollota",
    cuerpo: "Tienes una novedad en tu polla.",
  };
  try {
    if (event.data) payload = { ...payload, ...(event.data.json() as PushPayload) };
  } catch {
    // Payload no-JSON: usar el texto plano como cuerpo si vino algo.
    const texto = event.data?.text();
    if (texto) payload.cuerpo = texto;
  }

  const opciones: NotificationOptions & {
    renotify?: boolean;
    image?: string;
    actions?: { action: string; title: string }[];
  } = {
    body: payload.cuerpo,
    // Ícono "vs" con las banderas si el server lo mandó; si no, el de la app.
    // (iOS ignora `icon` y usa el ícono de la PWA; en Android sí se ve la bolita.)
    icon: payload.icono ?? "/icon-notif.png",
    // Badge = ícono pequeño de la barra de estado (Android). Android descarta el
    // color y usa SOLO el alfa, pintando la silueta de blanco: por eso debe ser
    // un PNG monocromático sobre fondo transparente. Si se le pasa el ícono a
    // color con fondo opaco, sale un cuadrado blanco sólido.
    badge: "/badge-notif.png",
    tag: payload.tag,
    // Re-notificar aunque exista una con el mismo tag (recordatorio que apremia).
    // `renotify` es estándar de Web Push pero aún no está en los tipos DOM.
    renotify: Boolean(payload.tag),
    data: { url: payload.url ?? "/" },
  };
  // Banner grande (Android). Tipos DOM aún no incluyen `image`.
  if (payload.imagen) opciones.image = payload.imagen;
  // Botón de acción (Android). Al tocarlo, `notificationclick` recibe el action.
  if (payload.accion) {
    opciones.actions = [{ action: "abrir", title: payload.accion }];
  }

  event.waitUntil(self.registration.showNotification(payload.titulo, opciones));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Tanto el tap en el cuerpo como en el botón de acción abren el mismo destino.
  const destino = (event.notification.data as { url?: string } | null)?.url ?? "/";

  event.waitUntil(
    (async () => {
      const clientes = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Si la PWA ya está abierta, enfocarla y navegar (sin abrir otra ventana).
      for (const cliente of clientes) {
        if ("focus" in cliente) {
          await cliente.focus();
          if ("navigate" in cliente && destino) {
            try {
              await cliente.navigate(destino);
            } catch {
              // navigate puede fallar entre orígenes/estados; el focus ya ayudó.
            }
          }
          return;
        }
      }
      // App cerrada → abrir nueva ventana en la ruta destino.
      await self.clients.openWindow(destino);
    })(),
  );
});
