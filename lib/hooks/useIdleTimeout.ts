"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { IDLE_TIMEOUT_MS } from "@/lib/constants";

/**
 * Inactividad: cierre de sesión (idle timeout).
 *
 * Diseño pensado para PWA en iOS/Safari (COMPATIBILIDAD-MOVIL §3.3): NO se cuenta
 * el tiempo con `setTimeout` en segundo plano —WebKit congela el JS al suspender
 * la app y el timer no es fiable—. En su lugar se guarda el timestamp de la
 * última actividad en `localStorage` y la decisión se toma comparando contra
 * `Date.now()` en tres momentos:
 *
 *   1. Al reactivarse la app (`pageshow` + `visibilitychange`→visible). Cubre el
 *      caso real más importante: el usuario cerró/minimizó la app y vuelve.
 *   2. Periódicamente mientras está en primer plano (`setInterval`). Cierra
 *      aunque deje la app abierta y quieta.
 *   3. Al montar (la app pudo estar suspendida más del umbral antes de cargar).
 *
 * La actividad (`pointerdown`, `keydown`, `touchstart`, `scroll`) reinicia el
 * contador, con *throttle* para no escribir en `localStorage` en cada evento.
 * Como la clave es compartida, la actividad y el cierre se propagan entre
 * pestañas vía el evento `storage`.
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

/** Borra el contador. Llamar al cerrar sesión (evita relogins fantasma). */
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
  const router = useRouter();
  const pathname = usePathname();

  // Evita disparar dos cierres simultáneos.
  const cerrandoRef = useRef(false);
  // Última escritura en localStorage (para el throttle de actividad).
  const ultimaEscrituraRef = useRef(0);
  // pathname más reciente sin re-suscribir los listeners en cada navegación.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const cerrarPorInactividad = useCallback(async () => {
    if (cerrandoRef.current) return;
    cerrandoRef.current = true;

    // Señaliza a otras pestañas que la sesión expiró (verán el `storage` event).
    try {
      window.localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, "0");
    } catch {
      // se ignora
    }

    const supabase = createClient();
    await supabase.auth.signOut();

    const destino = pathnameRef.current;
    const next =
      destino && destino !== "/login"
        ? `?next=${encodeURIComponent(destino)}`
        : "";

    // El Toaster vive en el layout raíz, sobrevive a la navegación cliente.
    toast.error("Tu sesión se cerró por inactividad. Vuelve a ingresar.");
    router.replace(`/login${next}`);
    router.refresh();
  }, [router]);

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
    // 0 = sin marca o señal de cierre de otra pestaña → cerrar también aquí.
    if (ultima === 0 || Date.now() - ultima >= IDLE_TIMEOUT_MS) {
      void cerrarPorInactividad();
    }
  }, [cerrarPorInactividad]);

  useEffect(() => {
    if (!habilitado || typeof window === "undefined") return;

    cerrandoRef.current = false;

    // Sembrar timestamp inicial cuando NO hay una marca de actividad válida.
    // Cuenta como inválida tanto la ausencia de clave como el centinela "0"
    // (el valor que deja `cerrarPorInactividad` al cerrar por inactividad).
    //
    // Por qué "0" se siembra acá: al cerrar por inactividad se escribe "0" y se
    // hace signOut; el borrado de la clave depende del `SIGNED_OUT` de IdleGuard,
    // que es una carrera y a veces no alcanza a limpiar antes del próximo login.
    // Si "0" sobrevive, al volver a entrar (habilitado pasa a true) este efecto
    // re-corre: el usuario ACABA de iniciar sesión → está activo → sembramos en
    // vez de cerrar. Sin esto, `verificarInactividad` leería "0" y dispararía un
    // relogin fantasma (mensaje de inactividad apenas se inicia sesión).
    //
    // No rompe: (a) el cierre cross-tab va por el evento `storage` en pestañas YA
    // activas, no por este sembrado; (b) la suspensión real >6h deja un timestamp
    // viejo (no "0"), que sí se detecta y cierra; (c) el token-refresh no cambia
    // `habilitado`, así que el efecto no re-corre y no resetea el contador.
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

    // Otra pestaña actualizó la actividad o cerró la sesión.
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
