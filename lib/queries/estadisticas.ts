import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { DistribucionGanador, MarcadorComun } from "@/lib/types/dominio";

const DIST_VACIA: DistribucionGanador = {
  local_pct: 0,
  empate_pct: 0,
  visitante_pct: 0,
};

/**
 * Resumen agregado de la POLLA para un partido: distribución de ganador + top
 * marcadores, solo del grupo (no de la plataforma). Anónimo (sin PII). El umbral
 * de privacidad lo aplica la UI antes del cierre (ver EstadisticasGrupoResumen).
 */
export function useEstadisticasGrupoResumen(grupoId: string, partidoId: string) {
  return useQuery({
    queryKey: ["estadisticas-grupo-resumen", grupoId, partidoId],
    queryFn: async (): Promise<{
      distribucion: DistribucionGanador;
      marcadores: MarcadorComun[];
      total: number;
    }> => {
      const supabase = createClient();
      const [dist, marc] = await Promise.all([
        supabase
          .from("vwEstadisticasPartidoGanadorGrupo")
          .select("pct_local, pct_empate, pct_visitante, total_predicciones")
          .eq("grupo_id", grupoId)
          .eq("partido_id", partidoId)
          .maybeSingle(),
        supabase
          .from("vwEstadisticasPartidoMarcadoresGrupo")
          .select("goles_local, goles_visitante, porcentaje, cantidad")
          .eq("grupo_id", grupoId)
          .eq("partido_id", partidoId)
          .order("porcentaje", { ascending: false })
          .limit(8),
      ]);

      return {
        distribucion: dist.data
          ? {
              local_pct: Math.round(dist.data.pct_local ?? 0),
              empate_pct: Math.round(dist.data.pct_empate ?? 0),
              visitante_pct: Math.round(dist.data.pct_visitante ?? 0),
            }
          : DIST_VACIA,
        marcadores: (marc.data ?? []).map((m) => ({
          goles_local: m.goles_local ?? 0,
          goles_visitante: m.goles_visitante ?? 0,
          porcentaje: Number(m.porcentaje ?? 0),
          cantidad: Number(m.cantidad ?? 0),
        })),
        total: Number(dist.data?.total_predicciones ?? 0),
      };
    },
    staleTime: 60_000,
  });
}

/** Distribución de ganador anónima del GRUPO (+ total que predijo). */
export function useEstadisticasGrupo(grupoId: string, partidoId: string) {
  return useQuery({
    queryKey: ["estadisticas-grupo", grupoId, partidoId],
    queryFn: async (): Promise<{
      distribucion: DistribucionGanador;
      total: number;
    }> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("vwEstadisticasPartidoGanadorGrupo")
        .select("pct_local, pct_empate, pct_visitante, total_predicciones")
        .eq("grupo_id", grupoId)
        .eq("partido_id", partidoId)
        .maybeSingle();

      return {
        distribucion: data
          ? {
              local_pct: Math.round(data.pct_local ?? 0),
              empate_pct: Math.round(data.pct_empate ?? 0),
              visitante_pct: Math.round(data.pct_visitante ?? 0),
            }
          : DIST_VACIA,
        total: Number(data?.total_predicciones ?? 0),
      };
    },
    staleTime: 60_000,
  });
}

export type PrediccionNominal = {
  participante: string;
  goles_local: number;
  goles_visitante: number;
  puntos: number | null;
  /** Si fue predicción única (para el bono en el desglose de puntos). */
  prediccion_unica: boolean;
};

/**
 * Predicciones nominales del grupo para un partido. La vista solo devuelve
 * filas DESPUÉS del cierre (privacidad), así que si está vacía es porque aún no
 * cierra o nadie predijo.
 */
export function usePrediccionesNominales(
  grupoId: string,
  partidoId: string,
  habilitado: boolean,
) {
  return useQuery({
    queryKey: ["predicciones-nominales", grupoId, partidoId],
    enabled: habilitado,
    queryFn: async (): Promise<PrediccionNominal[]> => {
      const supabase = createClient();
      const { data } = await supabase
        .from("vwPrediccionesGrupoPartido")
        .select(
          "nombre_completo, goles_local, goles_visitante, puntos_obtenidos, prediccion_unica",
        )
        .eq("grupo_id", grupoId)
        .eq("partido_id", partidoId);

      return (data ?? []).map((n) => ({
        participante: n.nombre_completo ?? "Jugador",
        goles_local: n.goles_local ?? 0,
        goles_visitante: n.goles_visitante ?? 0,
        puntos: n.puntos_obtenidos ?? null,
        prediccion_unica: n.prediccion_unica ?? false,
      }));
    },
    staleTime: 60_000,
  });
}
