"use client";

import { useEffect } from "react";
import {
  aplicar,
  getPreferencia,
  resolver,
  subscribePreferencia,
} from "@/lib/theme";

/**
 * Mantiene el atributo `data-theme` de <html> a prueba de re-renders del
 * servidor.
 *
 * El tema se aplica como atributo del DOM (lo pone el script del <head> en el
 * primer pintado), fuera del árbol de React. Como React renderiza <html> SIN
 * `data-theme`, un `router.refresh()` / `revalidatePath("/", "layout")` puede
 * reconciliar el elemento y borrar el atributo, dejando la app en el tema claro
 * por defecto (ver `globals.css` → `:root`). Este componente lo restaura:
 *
 *  - Un MutationObserver reaplica el tema resuelto si `data-theme` se borra o
 *    cambia de forma inesperada (el caso del refresh del servidor).
 *  - Resincroniza al volver del segundo plano (`pageshow`/`visibilitychange`),
 *    importante en PWA iOS donde los timers se congelan (CLAUDE.md §3.3).
 *  - Se suscribe a cambios de preferencia (otra pestaña) y del tema del sistema.
 *
 * Renderiza `null`. El primer pintado lo sigue cubriendo el script del <head>;
 * esto solo evita que el atributo se pierda después.
 */
export function ThemeKeeper() {
  useEffect(() => {
    // Reaplica el tema esperado si el atributo no coincide. `aplicar` solo
    // escribe cuando cambia, así que el observer converge en un paso (no hay
    // bucle: tras igualar el valor, la siguiente notificación es no-op).
    const sincronizar = () => {
      const esperado = resolver(getPreferencia());
      if (document.documentElement.dataset.theme !== esperado) {
        aplicar(esperado);
      }
    };

    const observer = new MutationObserver(sincronizar);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Preferencia (otra pestaña) + tema del sistema. `subscribePreferencia` ya
    // reaplica en sus handlers; el callback nos resincroniza por si acaso.
    const desuscribir = subscribePreferencia(sincronizar);

    window.addEventListener("pageshow", sincronizar);
    document.addEventListener("visibilitychange", sincronizar);

    // Estado correcto al montar (por si el atributo ya se perdió antes).
    sincronizar();

    return () => {
      observer.disconnect();
      desuscribir();
      window.removeEventListener("pageshow", sincronizar);
      document.removeEventListener("visibilitychange", sincronizar);
    };
  }, []);

  return null;
}
