"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  guardarSuscripcion,
  eliminarSuscripcion,
} from "@/app/(app)/notificaciones/actions";

/**
 * Convierte la clave pública VAPID (base64url) al `Uint8Array` que exige
 * `pushManager.subscribe({ applicationServerKey })`.
 */
function vapidKeyABytes(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normal);
  // ArrayBuffer explícito (no SharedArrayBuffer) para que el tipo case con
  // `applicationServerKey: BufferSource`.
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Extrae las claves p256dh/auth de la suscripción en base64url. */
function extraerClaves(sub: PushSubscription): { p256dh: string; auth: string } {
  const json = sub.toJSON();
  return { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" };
}

/** ¿La app corre como PWA instalada (standalone)? Requisito de push en iOS. */
function estaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || iosStandalone;
}

/** Detecta iOS (iPhone/iPad/iPod), incluido el iPad que se reporta como Mac. */
function esIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPhone = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iPhone || iPadOS;
}

/** ¿El navegador soporta Web Push? (Notification + SW + PushManager). */
function soportaPush(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

/**
 * ¿La página corre en un contexto seguro (HTTPS o localhost)? Los service
 * workers y Web Push SOLO existen en contexto seguro: si la app se abre por una
 * IP/origen HTTP (ej. `http://192.168.x.x:3000` para probar en el celular),
 * `serviceWorker`/`PushManager` no están disponibles y `soportaPush()` da
 * `false` en TODOS los dispositivos. Distinguirlo permite explicar la causa.
 */
function esContextoSeguro(): boolean {
  return typeof window !== "undefined" && window.isSecureContext;
}

const noop = () => () => {};

/** Lee un valor solo-cliente sin hydration mismatch (rinde `false` en SSR). */
function useFlagCliente(leer: () => boolean): boolean {
  return useSyncExternalStore(noop, leer, () => false);
}

export type EstadoPush = {
  /** El navegador soporta Web Push (Notification + SW + PushManager). */
  soporta: boolean;
  /**
   * La página corre en contexto seguro (HTTPS/localhost). Si es `false`, los
   * service workers no existen y `soporta` será `false` en todo dispositivo:
   * la causa es el origen HTTP, no el navegador.
   */
  seguro: boolean;
  /** La app corre instalada (standalone). En iOS es requisito para push. */
  standalone: boolean;
  /** El dispositivo es iOS (iPhone/iPad). */
  ios: boolean;
  /** `null` mientras se determina; luego `true`/`false`. Evita parpadeos. */
  suscrito: boolean | null;
  /** Hay una operación de (de)suscripción en curso. */
  cargando: boolean;
  /** El usuario bloqueó las notificaciones en el navegador (`denied`). */
  denegado: boolean;
  /**
   * Lanza el flujo de permiso + suscripción. DEBE invocarse desde un gesto del
   * usuario (click), nunca en montaje: iOS/Safari exigen interacción para
   * `Notification.requestPermission()`. Devuelve `true` si quedó suscrito.
   */
  activar: () => Promise<boolean>;
  /** Elimina la suscripción de ESTE navegador (local + BD). */
  desactivar: () => Promise<void>;
};

/**
 * Encapsula todo el ciclo de vida de las notificaciones push de la PWA:
 * detección de soporte/plataforma, estado de suscripción, y las acciones de
 * activar/desactivar (permiso + `pushManager` + persistencia en Supabase).
 *
 * Lo consumen tanto el toggle del perfil (`BotonNotificaciones`) como el prompt
 * de bienvenida (`PromptNotificaciones`) para no duplicar el flujo —que es la
 * parte frágil en WebKit/iOS (CLAUDE.md §3.3).
 */
export function usePushNotificaciones(): EstadoPush {
  const soporta = useFlagCliente(soportaPush);
  const seguro = useFlagCliente(esContextoSeguro);
  const standalone = useFlagCliente(estaInstalada);
  const ios = useFlagCliente(esIOS);

  const [suscrito, setSuscrito] = useState<boolean | null>(null);
  const [cargando, setCargando] = useState(false);
  const [denegado, setDenegado] = useState(false);

  // Estado inicial: ¿ya hay una suscripción activa en este navegador?
  useEffect(() => {
    if (!soportaPush()) return;
    let vivo = true;
    // setState dentro del callback async (no en el cuerpo del effect): evita
    // los renders en cascada que el proyecto prohíbe (react-hooks/set-state).
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (!vivo) return;
        setDenegado(Notification.permission === "denied");
        setSuscrito(Boolean(sub));
        // Re-sincroniza la suscripción de ESTE navegador con la BD en cada
        // arranque (upsert idempotente por endpoint). Cubre el caso en que el
        // push service rotó la suscripción o la BD la perdió (p. ej. la Edge
        // Function la borró por un 410): sin esto, el navegador seguiría
        // diciendo "suscrito" mientras el server ya no tiene a dónde enviar.
        // Fire-and-forget y SIN toast: el usuario no pidió esta acción, así que
        // un fallo (sesión expirada, sin red) debe ser invisible.
        if (sub) {
          const { p256dh, auth } = extraerClaves(sub);
          if (p256dh && auth) {
            void guardarSuscripcion({
              endpoint: sub.endpoint,
              p256dh,
              auth,
              userAgent: navigator.userAgent.slice(0, 200),
            }).catch(() => {});
          }
        }
      })
      .catch(() => {
        if (vivo) setSuscrito(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const activar = useCallback(async (): Promise<boolean> => {
    setCargando(true);
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setDenegado(permiso === "denied");
        toast.error(
          permiso === "denied"
            ? "Bloqueaste las notificaciones. Actívalas desde los ajustes del navegador."
            : "No se concedió el permiso de notificaciones.",
        );
        return false;
      }

      const reg = await navigator.serviceWorker.ready;
      const clavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!clavePublica) {
        toast.error("Configuración de notificaciones incompleta.");
        return false;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKeyABytes(clavePublica),
      });

      const { p256dh, auth } = extraerClaves(sub);
      const res = await guardarSuscripcion({
        endpoint: sub.endpoint,
        p256dh,
        auth,
        userAgent: navigator.userAgent.slice(0, 200),
      });
      if (!res.ok) {
        // No dejar una suscripción local huérfana si el server falló.
        await sub.unsubscribe().catch(() => {});
        toast.error(res.error);
        return false;
      }

      setSuscrito(true);
      toast.success("Notificaciones activadas. Te avisaremos antes de cada cierre.");
      return true;
    } catch {
      toast.error("No se pudieron activar las notificaciones. Intenta de nuevo.");
      return false;
    } finally {
      setCargando(false);
    }
  }, []);

  const desactivar = useCallback(async (): Promise<void> => {
    setCargando(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await eliminarSuscripcion(sub.endpoint);
        await sub.unsubscribe().catch(() => {});
      }
      setSuscrito(false);
      toast.success("Notificaciones desactivadas.");
    } catch {
      toast.error("No se pudieron desactivar. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }, []);

  return { soporta, seguro, standalone, ios, suscrito, cargando, denegado, activar, desactivar };
}
