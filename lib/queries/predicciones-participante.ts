import { useQuery } from "@tanstack/react-query";
import type { BonoFase } from "@/lib/types/dominio";
import { createClient } from "@/lib/supabase/client";

/** Predicción de un participante en un partido cerrado (sin PII extra). */
export type PrediccionParticipante = {
  partido_id: string;
  goles_local: number;
  goles_visitante: number;
  puntos_obtenidos: number;
  prediccion_unica: boolean;
  /** Equipo marcado para avanzar si predijo empate en eliminatoria (o null). */
  equipo_avanza_id: string | null;
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
          "partido_id, goles_local, goles_visitante, puntos_obtenidos, prediccion_unica, equipo_avanza_id",
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
        equipo_avanza_id: p.equipo_avanza_id ?? null,
      }));
    },
    staleTime: 60_000,
  });
}

/**
 * Bonos de fase ganados por UN participante (todo-o-nada por acertar el equipo
 * que avanza en toda una fase eliminatoria — ver migración 0054). Se muestran
 * como registros aparte en el detalle de la tabla de posiciones.
 *
 * El RLS de `tblBonosFase` (migración 0054) solo deja leer los bonos de
 * participantes del propio grupo, así que no hace falta filtrar en cliente.
 */
export function useBonosFaseParticipante(
  participanteId: string | null,
  habilitado: boolean,
) {
  return useQuery({
    queryKey: ["bonos-fase-participante", participanteId],
    enabled: habilitado && !!participanteId,
    queryFn: async (): Promise<BonoFase[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tblBonosFase")
        .select("fase, puntos")
        .eq("participante_id", participanteId!);
      if (error) throw error;

      return (data ?? []).map((b) => ({
        fase: b.fase,
        puntos: b.puntos ?? 0,
      }));
    },
    staleTime: 60_000,
  });
}
