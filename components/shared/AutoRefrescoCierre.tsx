"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Tope de cada `setTimeout`: re-evaluamos al menos cada 60 s. Sirve de tramo
 * para esperas largas y de cooldown si hay que reintentar (ver `evaluar`).
 */
const TRAMO_MS = 60_000;

/**
 * Margen tras el instante de cierre antes de refrescar. Garantiza que cuando el
 * servidor vuelva a renderizar, su `ahora` ya esté pasado el cierre (que usa
 * `>=`) y considere la apuesta cerrada, evitando un refresco "en falso".
 */
const MARGEN_MS = 1_000;

type Props = {
  /**
   * Instante (epoch ms) en que se cierra la próxima apuesta aún abierta de la
   * vista, o `null` si no hay ninguna pendiente de cerrar. Lo calcula el
   * servidor a partir del kickoff y los minutos de cierre del grupo.
   */
  proximoCierre: number | null;
};

/**
 * Refresca los datos del servidor (`router.refresh`) en el momento exacto en
 * que se cierra el próximo partido, para que la página de quien la está mirando
 * pase sola a "cerrada / En juego" sin recargar a mano. Renderiza `null`.
 *
 * El cierre es 100% derivado del tiempo (kickoff − minutos de cierre), así que
 * basta agendar un refresco en ese instante; al volver, el render del servidor
 * trae el siguiente `proximoCierre` (o `null`) y el efecto se reagenda solo.
 *
 * Compatibilidad iOS/PWA (CLAUDE.md §3.3): los timers se congelan en segundo
 * plano, así que además resincronizamos en `visibilitychange`/`pageshow`: al
 * volver al frente, si el cierre ya pasó, refrescamos de inmediato. El refresco
 * es no bloqueante y conserva pestaña activa y scroll (igual que
 * `TabsConRefresh`).
 */
export function AutoRefrescoCierre({ proximoCierre }: Props) {
  const router = useRouter();
  // Último cierre para el que ya disparamos refresco. Evita un bucle si el reloj
  // del cliente va adelantado y el servidor aún devuelve el mismo `proximoCierre`.
  const yaRefrescado = useRef<number | null>(null);

  useEffect(() => {
    if (proximoCierre == null) return;
    let timer: ReturnType<typeof setTimeout>;

    const evaluar = () => {
      const restante = proximoCierre + MARGEN_MS - Date.now();
      if (restante <= 0) {
        // Ya refrescamos para este cierre y el servidor lo sigue devolviendo
        // (reloj del cliente adelantado): reintenta con cooldown, sin bucle.
        if (yaRefrescado.current === proximoCierre) {
          timer = setTimeout(evaluar, TRAMO_MS);
          return;
        }
        yaRefrescado.current = proximoCierre;
        router.refresh();
        return;
      }
      timer = setTimeout(evaluar, Math.min(restante, TRAMO_MS));
    };

    const alVolver = () => {
      if (document.visibilityState === "visible") evaluar();
    };

    evaluar();
    window.addEventListener("pageshow", alVolver);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pageshow", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [proximoCierre, router]);

  return null;
}
