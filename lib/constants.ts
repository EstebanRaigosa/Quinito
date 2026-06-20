/** Constantes y textos centralizados (es-CO). */

export const APP_NOMBRE = "Pollota";
export const APP_DESCRIPCION = "Pollas del Mundial 2026 con tu parche";

/**
 * URL canónica del sitio. Para los `redirectTo` de Supabase usar SIEMPRE esta
 * (no `window.location.origin`): en PWA standalone iOS, el OAuth abre Safari y
 * `window.location.origin` puede resolver a un origen inesperado y dejar al
 * usuario sin sesión (COMPATIBILIDAD-MOVIL.md §14). Debe coincidir con los
 * Redirect URLs permitidos en Supabase.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (typeof window !== "undefined" ? window.location.origin : "https://pollota.com");

/** Rutas públicas (no requieren sesión). */
export const RUTAS_PUBLICAS = ["/", "/login", "/forgot-password", "/reset-password"];

/**
 * Inactividad máxima antes de cerrar la sesión automáticamente (6 horas).
 * Equilibrio UX/seguridad para una quiniela: protege la privacidad de las
 * predicciones en dispositivos compartidos sin castigar el uso normal en móvil
 * (dejar la app en segundo plano un rato y volver). Lo consume `useIdleTimeout`.
 */
export const IDLE_TIMEOUT_MS = 6 * 60 * 60 * 1000;

/**
 * Pestañas válidas del detalle de grupo para el deep-link `?tab=` (ej. una
 * notificación que enlaza a la tabla: `/grupos/<id>?tab=tabla`). Vive aquí (no
 * en `TabsConRefresh`, que es `"use client"`) para que el server component de la
 * página pueda importarla: un `Set` exportado desde un módulo cliente cruza la
 * frontera RSC como proxy y pierde sus métodos (`.has` deja de existir).
 */
export const PESTANAS_GRUPO_VALIDAS = new Set([
  "jugar",
  "partidos",
  "tabla",
  "reglas",
  "gente",
]);

/** Ítems del bottom nav (móvil). */
export const NAV_ITEMS = [
  { href: "/dashboard", etiqueta: "Inicio", icono: "home" },
  { href: "/grupos/buscar", etiqueta: "Buscar", icono: "search" },
  { href: "/grupos/crear", etiqueta: "Crear", icono: "plus" },
  { href: "/perfil", etiqueta: "Perfil", icono: "user" },
] as const;
