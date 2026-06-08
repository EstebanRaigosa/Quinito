/**
 * Gestión de tema claro/oscuro sin dependencias.
 *
 * - La preferencia del usuario ("light" | "dark" | "system") se guarda en
 *   localStorage bajo la clave `THEME_KEY`.
 * - El tema *resuelto* ("light" | "dark") se aplica como `data-theme` en <html>;
 *   `globals.css` define los tokens por modo en `[data-theme="..."]`.
 * - Para evitar FOUC, el primer pintado lo resuelve un script inline en el
 *   layout (ver `app/layout.tsx`); estas utilidades manejan los cambios en runtime.
 */

export type Preferencia = "light" | "dark" | "system";
export type TemaResuelto = "light" | "dark";

export const THEME_KEY = "polla-theme";

/** Lee la preferencia guardada; "system" si no hay nada o estamos en server. */
export function getPreferencia(): Preferencia {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(THEME_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

/** ¿El sistema operativo pide modo oscuro? */
export function sistemaPrefiereOscuro(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Convierte una preferencia en el tema concreto a aplicar. */
export function resolver(pref: Preferencia): TemaResuelto {
  if (pref === "system") return sistemaPrefiereOscuro() ? "dark" : "light";
  return pref;
}

/** Aplica el tema al <html> (sin tocar localStorage). */
export function aplicar(tema: TemaResuelto): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = tema;
}

// ── Store para useSyncExternalStore (evita setState-en-effect) ──────────────
type Listener = () => void;
const listeners = new Set<Listener>();

function emit(): void {
  listeners.forEach((l) => l());
}

/** Suscribe a cambios de preferencia (otra pestaña) y del tema del sistema. */
export function subscribePreferencia(cb: Listener): () => void {
  listeners.add(cb);
  if (typeof window === "undefined") return () => listeners.delete(cb);

  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (getPreferencia() === "system") aplicar(resolver("system"));
    cb();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== THEME_KEY) return;
    aplicar(resolver(getPreferencia()));
    cb();
  };
  mq.addEventListener("change", onSystem);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
  };
}

/** Snapshot en cliente (lee localStorage) y en servidor (siempre "system"). */
export const getPreferenciaSnapshot = getPreferencia;
export const getPreferenciaServerSnapshot = (): Preferencia => "system";

/** Guarda la preferencia, la aplica y notifica a los suscriptores. */
export function setPreferencia(pref: Preferencia): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_KEY, pref);
  aplicar(resolver(pref));
  emit();
}

/**
 * Script inline (string) para el <head>: resuelve y aplica el tema antes del
 * primer pintado. Se inyecta con dangerouslySetInnerHTML en el layout.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var k = "${THEME_KEY}";
    var p = localStorage.getItem(k) || "system";
    var dark = p === "dark" || (p === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  } catch (e) {}
})();
`;
