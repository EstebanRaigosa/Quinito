"use client";

import { useCallback, useEffect, useRef } from "react";
import { IDLE_TIMEOUT_MS } from "@/lib/constants";

/**
 * Inactividad: recarga de la página (idle timeout). **NO cierra la sesión** —
 * tras el umbral de inactividad simplemente recarga la página para refrescar los
 * datos; la sesión de Supabase se mantiene intacta.
 *
 * Diseño pensado para PWA en iOS/Safari (COMPATIBILIDAD-MOVIL §3.3): NO se cuenta
 * el tiempo con `setTimeout` en segundo plano —WebKit congela el JS al suspender
 * la app y el timer no es fiable—. En su lugar se guarda el timestamp de la
 * última actividad en `localStorage` y la decisión se toma comparando contra
 * `Date.now()` en tres momentos:
 *
 *   1. Al reactivarse la app (`pageshow` + `visibilitychange`→visible). Cubre el
 *      caso real más importante: el usuario cerró/minimizó la app y vuelve.
 *   2. Periódicamente mientras está en primer plano (`setInterval`). Recarga
 *      aunque deje la app abierta y quieta.
 *   3. Al montar (la app pudo estar suspendida más del umbral antes de cargar).
 *
 * La actividad (`pointerdown`, `keydown`, `touchstart`, `scroll`) reinicia el
 * contador, con *throttle* para no escribir en `localStorage` en cada evento.
 * Como la clave es compartida, la actividad se propaga entre pestañas vía el
 * evento `storage`.
 */

/** Clave de `localStorage` con el timestamp (ms UTC) de la última actividad. */
const CLAVE_ULTIMA_ACTIVIDAD = "pollota:ultimaActividad";

/** Máx. una escritura de actividad cada 30s (evita castigar el rendimiento). */
const THROTTLE_ACTIVIDAD_MS = 30_000;

/** Cada cuánto se revisa la inactividad mientras la app está visible. */
const INTERVALO_CHEQUEO_MS = 60_000;

/** Eventos del DOM que cuentan como actividad del usuario. */
const EVENTOS_ACTIVIDAD = [
  "pointerdown",
  "keydown",
  "touchstart",
  "scroll",
] as const;

/** Borra el contador. Se llama al cerrar sesión para no arrastrar marcas viejas. */
export function limpiarUltimaActividad(): void {
  try {
    window.localStorage.removeItem(CLAVE_ULTIMA_ACTIVIDAD);
  } catch {
    // localStorage no disponible: se ignora.
  }
}

type Opciones = {
  /** Solo se cuenta la inactividad cuando hay sesión activa. */
  habilitado: boolean;
};

export function useIdleTimeout({ habilitado }: Opciones) {
  // Evita disparar dos recargas simultáneas.
  const recargandoRef = useRef(false);
  // Última escritura en localStorage (para el throttle de actividad).
  const ultimaEscrituraRef = useRef(0);

  const recargarPorInactividad = useCallback(() => {
    if (recargandoRef.current) return;
    recargandoRef.current = true;

    // Reinicia el contador ANTES de recargar: si no, la página recargada volvería
    // a leer el timestamp viejo al montar, detectaría inactividad otra vez y
    // entraría en bucle de recargas. Sembrar `now` le da una ventana nueva.
    try {
      window.localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(Date.now()));
    } catch {
      // se ignora
    }

    // Recarga dura: refresca datos y RSC manteniendo la sesión (no signOut).
    window.location.reload();
  }, []);

  const marcarActividad = useCallback(() => {
    const ahora = Date.now();
    if (ahora - ultimaEscrituraRef.current < THROTTLE_ACTIVIDAD_MS) return;
    ultimaEscrituraRef.current = ahora;
    try {
      window.localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(ahora));
    } catch {
      // se ignora
    }
  }, []);

  const verificarInactividad = useCallback(() => {
    let ultima: number;
    try {
      ultima = Number(window.localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)) || 0;
    } catch {
      return;
    }
    // 0 = sin marca todavía (el efecto la siembra); no recargamos en ese caso.
    if (ultima !== 0 && Date.now() - ultima >= IDLE_TIMEOUT_MS) {
      recargarPorInactividad();
    }
  }, [recargarPorInactividad]);

  useEffect(() => {
    if (!habilitado || typeof window === "undefined") return;

    recargandoRef.current = false;

    // Sembrar el timestamp inicial cuando no hay una marca de actividad válida
    // (ausencia de clave, o un "0" heredado de versiones previas). Así el primer
    // chequeo arranca desde "ahora" y no dispara una recarga inmediata.
    try {
      const marca = window.localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD);
      if (!marca || marca === "0") {
        window.localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(Date.now()));
      }
    } catch {
      // se ignora
    }

    // Por si la app estuvo suspendida más del umbral antes de montar.
    verificarInactividad();

    for (const evento of EVENTOS_ACTIVIDAD) {
      window.addEventListener(evento, marcarActividad, { passive: true });
    }

    // Reactivación (clave en iOS: el JS se congela en segundo plano).
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      verificarInactividad();
    };
    const onPageShow = () => {
      verificarInactividad();
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);

    // Otra pestaña actualizó la actividad: re-evaluamos por si acá ya venció.
    const onStorage = (e: StorageEvent) => {
      if (e.key === CLAVE_ULTIMA_ACTIVIDAD) verificarInactividad();
    };
    window.addEventListener("storage", onStorage);

    // Chequeo periódico mientras está en primer plano.
    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") verificarInactividad();
    }, INTERVALO_CHEQUEO_MS);

    return () => {
      for (const evento of EVENTOS_ACTIVIDAD) {
        window.removeEventListener(evento, marcarActividad);
      }
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(intervalo);
    };
  }, [habilitado, marcarActividad, verificarInactividad]);
}
