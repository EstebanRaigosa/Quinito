import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/** Predicción de un participante en un partido cerrado (sin PII extra). */
export type PrediccionParticipante = {
  partido_id: string;
  goles_local: number;
  goles_visitante: number;
  puntos_obtenidos: number;
  prediccion_unica: boolean;
};

/**
 * Predicciones de UN participante en el grupo, para el detalle de su desempeño.
 *
 * Lee de `vwPrediccionesGrupoPartido`, que por RLS (migración 0004) solo expone
 * predicciones de partidos YA CERRADOS y solo a miembros del grupo. Es decir, la
 * privacidad (CLAUDE.md §3.4) la garantiza la vista: nunca se revelan
 * predicciones de partidos abiertos de otro usuario. No hay filtro en cliente.
 *
 * `habilitado` permite el fetch lazy (solo cuando el Sheet de detalle se abre).
 */
export function usePrediccionesParticipante(
  grupoId: string,
  participanteId: string | null,
  habilitado: boolean,
) {
  return useQuery({
    queryKey: ["predicciones-participante", grupoId, participanteId],
    enabled: habilitado && !!participanteId,
    queryFn: async (): Promise<PrediccionParticipante[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("vwPrediccionesGrupoPartido")
        .select(
          "partido_id, goles_local, goles_visitante, puntos_obtenidos, prediccion_unica",
        )
        .eq("grupo_id", grupoId)
        .eq("participante_id", participanteId!);
      if (error) throw error;

      return (data ?? []).map((p) => ({
        partido_id: p.partido_id ?? "",
        goles_local: p.goles_local ?? 0,
        goles_visitante: p.goles_visitante ?? 0,
        puntos_obtenidos: p.puntos_obtenidos ?? 0,
        prediccion_unica: p.prediccion_unica ?? false,
      }));
    },
    staleTime: 60_000,
  });
}
