"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /**
   * Torneos cuyos partidos se observan en vivo (normalmente uno). Se reciben los
   * cambios de cualquiera de ellos. Vacío → no se suscribe.
   */
  torneoIds: string[];
};

/**
 * Suscribe la vista a los cambios en vivo de los partidos (marcador, estado) vía
 * Supabase Realtime y refresca los datos del servidor (`router.refresh`) cuando
 * un partido del torneo cambia. Así el marcador y el paso a "En juego" /
 * "Finalizado" aparecen solos, sin recargar. Renderiza `null`.
 *
 * A diferencia de `AutoRefrescoCierre` (cierre derivado del tiempo), aquí el
 * disparador es un cambio real en la BD —lo carga el admin—, que no es
 * predecible por reloj.
 *
 * Requiere que "tblPartidos" esté en la publicación `supabase_realtime`
 * (migración 0042). La RLS de lectura pública de partidos basta: Realtime
 * respeta RLS en `postgres_changes`.
 *
 * Compatibilidad iOS/PWA (CLAUDE.md §3.3): el heartbeat de Realtime corre en un
 * Web Worker (`realtime.worker` en `lib/supabase/client.ts`) para sobrevivir a
 * los timers congelados en segundo plano; además, al volver al frente se
 * refresca una vez por si el socket estuvo caído mientras la app no era visible.
 */
export function RealtimePartidos({ torneoIds }: Props) {
  const router = useRouter();
  // Clave estable: evita re-suscribir en cada render por una nueva referencia
  // de array (las props llegan serializadas desde el server component).
  const clave = torneoIds.join(",");

  useEffect(() => {
    const ids = clave ? clave.split(",") : [];
    if (ids.length === 0) return;

    const supabase = createClient();

    // Debounce: en una jornada varios partidos pueden cambiar casi a la vez; un
    // solo refresco por ráfaga basta.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refrescar = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 800);
    };

    const canal = supabase.channel(`partidos-vivo:${clave}`);
    for (const id of ids) {
      canal.on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tblPartidos",
          filter: `torneo_id=eq.${id}`,
        },
        refrescar,
      );
    }
    canal.subscribe();

    const alVolver = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    window.addEventListener("pageshow", alVolver);
    document.addEventListener("visibilitychange", alVolver);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("pageshow", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
      supabase.removeChannel(canal);
    };
  }, [clave, router]);

  return null;
}
