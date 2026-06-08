import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import type { Partido } from "@/lib/types/dominio";
import { SELECT_PARTIDOS, mapPartidoRow } from "@/lib/queries/_partido-map";
import { puedePredecir } from "@/lib/utils/prediccion";
import { claveDiaBogota } from "@/lib/utils/fechas";

/** Un partido predecible de hoy, ligado a la polla donde el usuario participa. */
export type PrediccionPendiente = {
  grupoId: string;
  grupoNombre: string;
  partido: Partido;
  /** Marcador ya predicho por el usuario, o `null` si está pendiente. */
  miPrediccion: { goles_local: number; goles_visitante: number } | null;
  /** Cierre de la apuesta en UTC ISO (kickoff − minutos_cierre). */
  cierre: string;
};

/**
 * Partidos de HOY (zona Bogotá) abiertos a predicción, agregados de TODAS las
 * pollas del usuario. Cada elemento es una tarea de predicción: un mismo partido
 * en dos pollas aparece dos veces. Ordena pendientes primero y, dentro de cada
 * grupo, por cierre más próximo.
 *
 * Privacidad (CLAUDE.md §3.4): solo se leen las predicciones del propio usuario.
 */
export async function getPrediccionesPendientesHoy(
  ahora: Date = new Date(),
): Promise<PrediccionPendiente[]> {
  const user = await getUsuarioActual();
  if (!user) return [];
  const supabase = await createClient();

  // Mis participaciones: a qué pollas pertenezco y con qué participante_id.
  const { data: parts } = await supabase
    .from("tblParticipantes")
    .select("id, grupo_id")
    .eq("usuario_id", user.id);
  if (!parts || parts.length === 0) return [];

  const grupoIds = [...new Set(parts.map((p) => p.grupo_id))];
  const participanteIds = parts.map((p) => p.id);
  const participantePorGrupo = new Map(parts.map((p) => [p.grupo_id, p.id]));

  // Ventana "hoy" en Bogotá (UTC-5 fijo, sin horario de verano):
  // medianoche local = 05:00 UTC.
  const dia = claveDiaBogota(ahora);
  const inicioUTC = new Date(`${dia}T05:00:00.000Z`);
  const finUTC = new Date(inicioUTC.getTime() + 86_400_000);

  const [gruposRes, reglasRes, gpRes] = await Promise.all([
    supabase.from("tblGrupos").select("id, nombre").in("id", grupoIds),
    supabase
      .from("tblReglasGrupo")
      .select("grupo_id, minutos_cierre_prediccion")
      .in("grupo_id", grupoIds),
    supabase
      .from("tblGrupoPartidos")
      .select("grupo_id, partido_id")
      .in("grupo_id", grupoIds),
  ]);

  const nombrePorGrupo = new Map(
    (gruposRes.data ?? []).map((g) => [g.id, g.nombre]),
  );
  const cierrePorGrupo = new Map(
    (reglasRes.data ?? []).map((r) => [
      r.grupo_id,
      r.minutos_cierre_prediccion ?? 0,
    ]),
  );
  const grupoPartidos = gpRes.data ?? [];
  const partidoIds = [...new Set(grupoPartidos.map((r) => r.partido_id))];
  if (partidoIds.length === 0) return [];

  // Partidos de hoy entre los que apuestan mis pollas.
  const { data: partidosData } = await supabase
    .from("tblPartidos")
    .select(SELECT_PARTIDOS)
    .in("id", partidoIds)
    .gte("fecha_hora", inicioUTC.toISOString())
    .lt("fecha_hora", finUTC.toISOString())
    .order("fecha_hora", { ascending: true });
  const partidos = (partidosData ?? []).map(mapPartidoRow);
  if (partidos.length === 0) return [];

  const partidoPorId = new Map(partidos.map((p) => [p.id, p]));
  const partidosHoyIds = new Set(partidos.map((p) => p.id));

  // Solo mis predicciones de esos partidos (nunca las de terceros).
  const { data: predsData } = await supabase
    .from("tblPredicciones")
    .select("participante_id, partido_id, goles_local, goles_visitante")
    .in("participante_id", participanteIds)
    .in("partido_id", [...partidosHoyIds]);
  const predPorClave = new Map(
    (predsData ?? []).map((p) => [`${p.participante_id}:${p.partido_id}`, p]),
  );

  const items: PrediccionPendiente[] = [];
  for (const { grupo_id, partido_id } of grupoPartidos) {
    if (!partidosHoyIds.has(partido_id)) continue;
    const partido = partidoPorId.get(partido_id);
    if (!partido) continue;
    const minutosCierre = cierrePorGrupo.get(grupo_id) ?? 0;
    // Solo lo que todavía se puede predecir (abierto + equipos definidos).
    if (!puedePredecir(partido, minutosCierre, ahora)) continue;

    const participanteId = participantePorGrupo.get(grupo_id);
    const pred = participanteId
      ? predPorClave.get(`${participanteId}:${partido_id}`)
      : undefined;
    items.push({
      grupoId: grupo_id,
      grupoNombre: nombrePorGrupo.get(grupo_id) ?? "Polla",
      partido,
      miPrediccion: pred
        ? { goles_local: pred.goles_local, goles_visitante: pred.goles_visitante }
        : null,
      cierre: new Date(
        new Date(partido.fecha_hora).getTime() - minutosCierre * 60_000,
      ).toISOString(),
    });
  }

  // Pendientes primero; dentro de cada grupo, cierre más próximo arriba.
  items.sort((a, b) => {
    const ap = a.miPrediccion ? 1 : 0;
    const bp = b.miPrediccion ? 1 : 0;
    if (ap !== bp) return ap - bp;
    return +new Date(a.cierre) - +new Date(b.cierre);
  });

  return items;
}
