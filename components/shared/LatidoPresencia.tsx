"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { nombreSeccion } from "@/lib/utils/seccion-actual";
import { usePresencia } from "@/lib/stores/presencia";
import type { Database } from "@/lib/supabase/types";

type Latido = Database["public"]["Tables"]["tblSesionesActivas"]["Insert"];

/** Cada cuánto refrescamos el latido mientras la pestaña está visible. */
const INTERVALO_MS = 45_000;

function detectarDispositivo(): "movil" | "escritorio" {
  if (typeof navigator === "undefined") return "escritorio";
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    ? "movil"
    : "escritorio";
}

/**
 * ¿La app corre como PWA instalada (modo standalone) o en el navegador?
 * - Android/escritorio: media query `(display-mode: standalone)`.
 * - iOS Safari (no estándar): `navigator.standalone`.
 * Se evalúa en cada latido porque el modo no cambia dentro de una sesión, pero
 * sí difiere entre abrir desde el ícono instalado y abrir desde el navegador.
 */
function detectarEsPwa(): boolean {
  if (typeof window === "undefined") return false;
  const standalone =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || iosStandalone;
}

/** ¿La ruta es el detalle de UNA polla (donde hay sub-pestañas de cliente)? */
function enDetalleDePolla(pathname: string): boolean {
  return (
    pathname.startsWith("/grupos/") &&
    pathname !== "/grupos/buscar" &&
    pathname !== "/grupos/crear" &&
    !pathname.endsWith("/configurar")
  );
}

/**
 * Latido de presencia: cada usuario logueado actualiza SU propia fila en
 * `tblSesionesActivas` con throttle (al montar, cada 45s, al cambiar de sección
 * y al volver del segundo plano). Alimenta el panel "Usuarios conectados" del
 * admin. Renderiza `null`.
 *
 * Liviano por diseño: un UPSERT esporádico por usuario, sin Realtime ni
 * escrituras en ráfaga, así que no afecta el rendimiento de la app.
 *
 * Privacidad (CLAUDE.md §3.4): la RLS deja que cada quien solo toque su fila;
 * nadie lee la presencia de otro desde el cliente.
 *
 * Compatibilidad iOS/PWA (CLAUDE.md §3.3): que iOS congele el `setInterval` en
 * segundo plano no importa, porque también latimos en `pageshow` /
 * `visibilitychange` al volver al frente (mismo patrón que `RealtimePartidos`).
 */
export function LatidoPresencia({ usuarioId }: { usuarioId: string }) {
  const pathname = usePathname();
  const detalle = usePresencia((s) => s.detalle);
  const seccionRef = useRef(pathname);
  const detalleRef = useRef(detalle);
  const latirRef = useRef<(visible: boolean) => void>(() => {});

  useEffect(() => {
    const supabase = createClient();
    const dispositivo = detectarDispositivo();
    const esPwa = detectarEsPwa();
    let inicioEnviado = false;

    // Dentro de una polla usamos el detalle de la pestaña ("{polla} · {sección}")
    // que publica `TabsConRefresh`; fuera, la sección derivada de la ruta.
    const seccionActual = () => {
      const ruta = seccionRef.current;
      if (enDetalleDePolla(ruta) && detalleRef.current) return detalleRef.current;
      return nombreSeccion(ruta);
    };

    const latir = (visible: boolean) => {
      const ahora = new Date().toISOString();
      const fila: Latido = {
        usuario_id: usuarioId,
        ultima_actividad: ahora,
        seccion: seccionActual(),
        dispositivo,
        es_pwa: esPwa,
        visible,
      };
      // Solo en el primer latido del montaje reiniciamos "conectado desde".
      if (!inicioEnviado) {
        fila.conectado_en = ahora;
        inicioEnviado = true;
      }
      void supabase
        .from("tblSesionesActivas")
        .upsert(fila, { onConflict: "usuario_id" })
        .then(({ error }) => {
          // Log solo en desarrollo (CLAUDE.md §4.6): ayuda a depurar si la RLS
          // o la red rechazan el latido. En producción falla en silencio.
          if (error && process.env.NODE_ENV !== "production") {
            console.error("[LatidoPresencia] upsert falló:", error.message);
          }
        });
    };
    latirRef.current = latir;

    latir(document.visibilityState === "visible");

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") latir(true);
    }, INTERVALO_MS);

    const alVolver = () => latir(document.visibilityState === "visible");
    window.addEventListener("pageshow", alVolver);
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      clearInterval(timer);
      window.removeEventListener("pageshow", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [usuarioId]);

  // Latido inmediato al navegar a otra sección (salta el primer render, que ya
  // lo cubre el efecto principal).
  const primeraRuta = useRef(true);
  useEffect(() => {
    // Actualizamos la sección dentro del efecto (no en render).
    seccionRef.current = pathname;
    if (primeraRuta.current) {
      primeraRuta.current = false;
      return;
    }
    latirRef.current(
      typeof document === "undefined"
        ? true
        : document.visibilityState === "visible",
    );
  }, [pathname]);

  // Latido al cambiar de pestaña dentro de una polla (el detalle del store cambia
  // sin que cambie la ruta). Salta el primer render.
  const primerDetalle = useRef(true);
  useEffect(() => {
    detalleRef.current = detalle;
    if (primerDetalle.current) {
      primerDetalle.current = false;
      return;
    }
    latirRef.current(
      typeof document === "undefined"
        ? true
        : document.visibilityState === "visible",
    );
  }, [detalle]);

  return null;
}
