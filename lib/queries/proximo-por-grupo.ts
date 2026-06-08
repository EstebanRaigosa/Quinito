import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import type { Partido } from "@/lib/types/dominio";
import { SELECT_PARTIDOS, mapPartidoRow } from "@/lib/queries/_partido-map";
import { puedePredecir } from "@/lib/utils/prediccion";

/** Próximo partido predecible de un grupo + tu predicción (si existe). */
export type ProximoPartidoGrupo = {
  partido: Partido;
  /** Marcador ya predicho por el usuario, o `null` si está pendiente. */
  miPrediccion: { goles_local: number; goles_visitante: number } | null;
  /** Cierre de la apuesta en UTC ISO (kickoff − minutos_cierre). */
  cierre: string;
};

/**
 * Para cada grupo dado, el siguiente partido que el usuario TODAVÍA puede
 * predecir (abierto + equipos definidos), con su marcador si ya predijo.
 * Devuelve un `Map` indexado por `grupoId` (los grupos sin partido predecible
 * simplemente no aparecen).
 *
 * Privacidad (CLAUDE.md §3.4): solo se leen las predicciones del propio usuario.
 */
export async function getProximoPartidoPorGrupo(
  grupoIds: string[],
  ahora: Date = new Date(),
): Promise<Map<string, ProximoPartidoGrupo>> {
  const resultado = new Map<string, ProximoPartidoGrupo>();
  if (grupoIds.length === 0) return resultado;

  const user = await getUsuarioActual();
  if (!user) return resultado;
  const supabase = await createClient();

  // Mis participaciones en esos grupos (para leer solo mis predicciones).
  const { data: parts } = await supabase
    .from("tblParticipantes")
    .select("id, grupo_id")
    .eq("usuario_id", user.id)
    .in("grupo_id", grupoIds);
  const participantePorGrupo = new Map(
    (parts ?? []).map((p) => [p.grupo_id, p.id]),
  );

  const [reglasRes, gpRes] = await Promise.all([
    supabase
      .from("tblReglasGrupo")
      .select("grupo_id, minutos_cierre_prediccion")
      .in("grupo_id", grupoIds),
    supabase
      .from("tblGrupoPartidos")
      .select("grupo_id, partido_id")
      .in("grupo_id", grupoIds),
  ]);

  const cierrePorGrupo = new Map(
    (reglasRes.data ?? []).map((r) => [
      r.grupo_id,
      r.minutos_cierre_prediccion ?? 0,
    ]),
  );
  const grupoPartidos = gpRes.data ?? [];
  const partidoIds = [...new Set(grupoPartidos.map((r) => r.partido_id))];
  if (partidoIds.length === 0) return resultado;

  // Solo partidos a futuro (a partir de ahora), ordenados por fecha.
  const { data: partidosData } = await supabase
    .from("tblPartidos")
    .select(SELECT_PARTIDOS)
    .in("id", partidoIds)
    .gte("fecha_hora", ahora.toISOString())
    .order("fecha_hora", { ascending: true });
  const partidos = (partidosData ?? []).map(mapPartidoRow);
  const partidoPorId = new Map(partidos.map((p) => [p.id, p]));

  // Agrupa los partidos por grupo (preservando solo los que existen a futuro).
  const partidosDeGrupo = new Map<string, Partido[]>();
  for (const { grupo_id, partido_id } of grupoPartidos) {
    const partido = partidoPorId.get(partido_id);
    if (!partido) continue;
    const arr = partidosDeGrupo.get(grupo_id) ?? [];
    arr.push(partido);
    partidosDeGrupo.set(grupo_id, arr);
  }

  // Para cada grupo: el primer partido (por fecha) que todavía es predecible.
  const elegidos: { grupoId: string; partido: Partido; cierre: string }[] = [];
  for (const grupoId of grupoIds) {
    const lista = partidosDeGrupo.get(grupoId);
    if (!lista) continue;
    const minutosCierre = cierrePorGrupo.get(grupoId) ?? 0;
    const proximo = lista
      .slice()
      .sort((a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora))
      .find((p) => puedePredecir(p, minutosCierre, ahora));
    if (!proximo) continue;
    elegidos.push({
      grupoId,
      partido: proximo,
      cierre: new Date(
        new Date(proximo.fecha_hora).getTime() - minutosCierre * 60_000,
      ).toISOString(),
    });
  }
  if (elegidos.length === 0) return resultado;

  // Solo mis predicciones de los partidos elegidos (nunca las de terceros).
  const participanteIds = [...participantePorGrupo.values()];
  const elegidoPartidoIds = [...new Set(elegidos.map((e) => e.partido.id))];
  const predsData =
    participanteIds.length > 0
      ? (
          await supabase
            .from("tblPredicciones")
            .select("participante_id, partido_id, goles_local, goles_visitante")
            .in("participante_id", participanteIds)
            .in("partido_id", elegidoPartidoIds)
        ).data
      : [];
  const predPorClave = new Map(
    (predsData ?? []).map((p) => [`${p.participante_id}:${p.partido_id}`, p]),
  );

  for (const e of elegidos) {
    const participanteId = participantePorGrupo.get(e.grupoId);
    const pred = participanteId
      ? predPorClave.get(`${participanteId}:${e.partido.id}`)
      : undefined;
    resultado.set(e.grupoId, {
      partido: e.partido,
      miPrediccion: pred
        ? {
            goles_local: pred.goles_local,
            goles_visitante: pred.goles_visitante,
          }
        : null,
      cierre: e.cierre,
    });
  }

  return resultado;
}
