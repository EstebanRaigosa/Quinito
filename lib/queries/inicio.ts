import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import { mapPartidoRow } from "@/lib/queries/_partido-map";
import { puedePredecir } from "@/lib/utils/prediccion";
import { claveDiaBogota } from "@/lib/utils/fechas";
import type { PrediccionPendiente } from "@/lib/queries/predicciones-hoy";
import type { ProximoPartidoGrupo } from "@/lib/queries/proximo-por-grupo";

/**
 * Datos del dashboard que NO vienen de `mis_grupos`: las predicciones de hoy y
 * el próximo partido por polla. Antes los resolvían dos funciones separadas
 * (`getPrediccionesPendientesHoy` + `getProximoPartidoPorGrupo`) con ~11
 * round-trips de red entre ambas, consultando las mismas tablas. Ahora un único
 * RPC (`inicio_extras`) trae todo en una sola llamada y aquí derivamos ambas
 * vistas en memoria.
 */
export type InicioDashboard = {
  pendientesHoy: PrediccionPendiente[];
  proximoPorGrupo: Map<string, ProximoPartidoGrupo>;
};

/** Filas crudas que devuelve el RPC (mismo shape que espera `mapPartidoRow`). */
type RawPartido = Parameters<typeof mapPartidoRow>[0];
type Bundle = {
  participantes: { grupo_id: string; participante_id: string }[];
  grupos: { id: string; nombre: string }[];
  reglas: { grupo_id: string; minutos_cierre_prediccion: number }[];
  grupo_partidos: { grupo_id: string; partido_id: string }[];
  partidos: RawPartido[];
  predicciones: {
    participante_id: string;
    partido_id: string;
    goles_local: number;
    goles_visitante: number;
  }[];
};

const VACIO: InicioDashboard = {
  pendientesHoy: [],
  proximoPorGrupo: new Map(),
};

/**
 * Resuelve en UNA sola llamada a la base las dos secciones dinámicas del
 * dashboard. La lógica de negocio (ventana "hoy", `puedePredecir`, selección del
 * próximo) vive aquí, no en SQL, para no duplicar reglas.
 *
 * Privacidad (CLAUDE.md §3.4): el RPC solo devuelve las predicciones del propio
 * usuario.
 */
export async function getInicioDashboard(
  ahora: Date = new Date(),
): Promise<InicioDashboard> {
  const user = await getUsuarioActual();
  if (!user) return VACIO;
  const supabase = await createClient();

  // Ventana "hoy" en Bogotá (UTC-5 fijo): medianoche local = 05:00 UTC.
  const dia = claveDiaBogota(ahora);
  const inicioUTC = new Date(`${dia}T05:00:00.000Z`);
  const finUTC = new Date(inicioUTC.getTime() + 86_400_000);

  const { data, error } = await supabase.rpc("inicio_extras", {
    p_desde: inicioUTC.toISOString(),
  });
  if (error || !data) return VACIO;

  const bundle = data as unknown as Bundle;

  const nombrePorGrupo = new Map(bundle.grupos.map((g) => [g.id, g.nombre]));
  const cierrePorGrupo = new Map(
    bundle.reglas.map((r) => [r.grupo_id, r.minutos_cierre_prediccion ?? 0]),
  );
  const participantePorGrupo = new Map(
    bundle.participantes.map((p) => [p.grupo_id, p.participante_id]),
  );
  const partidoPorId = new Map(
    bundle.partidos.map((p) => [p.id, mapPartidoRow(p)]),
  );
  const predPorClave = new Map(
    bundle.predicciones.map((p) => [`${p.participante_id}:${p.partido_id}`, p]),
  );

  // ── Predicciones de hoy (cross-polla) ───────────────────────────────────
  const pendientesHoy: PrediccionPendiente[] = [];
  for (const { grupo_id, partido_id } of bundle.grupo_partidos) {
    const partido = partidoPorId.get(partido_id);
    if (!partido) continue;
    const t = new Date(partido.fecha_hora).getTime();
    // Solo los partidos dentro de la ventana de hoy.
    if (t < inicioUTC.getTime() || t >= finUTC.getTime()) continue;
    const minutosCierre = cierrePorGrupo.get(grupo_id) ?? 0;
    if (!puedePredecir(partido, minutosCierre, ahora)) continue;

    const participanteId = participantePorGrupo.get(grupo_id);
    const pred = participanteId
      ? predPorClave.get(`${participanteId}:${partido_id}`)
      : undefined;
    pendientesHoy.push({
      grupoId: grupo_id,
      grupoNombre: nombrePorGrupo.get(grupo_id) ?? "Polla",
      partido,
      miPrediccion: pred
        ? { goles_local: pred.goles_local, goles_visitante: pred.goles_visitante }
        : null,
      cierre: new Date(t - minutosCierre * 60_000).toISOString(),
    });
  }
  pendientesHoy.sort((a, b) => {
    const ap = a.miPrediccion ? 1 : 0;
    const bp = b.miPrediccion ? 1 : 0;
    if (ap !== bp) return ap - bp;
    return +new Date(a.cierre) - +new Date(b.cierre);
  });

  // ── Próximo partido predecible por polla ────────────────────────────────
  const partidosDeGrupo = new Map<string, ReturnType<typeof mapPartidoRow>[]>();
  for (const { grupo_id, partido_id } of bundle.grupo_partidos) {
    const partido = partidoPorId.get(partido_id);
    if (!partido) continue;
    const arr = partidosDeGrupo.get(grupo_id) ?? [];
    arr.push(partido);
    partidosDeGrupo.set(grupo_id, arr);
  }

  const proximoPorGrupo = new Map<string, ProximoPartidoGrupo>();
  for (const [grupoId, lista] of partidosDeGrupo) {
    const minutosCierre = cierrePorGrupo.get(grupoId) ?? 0;
    const proximo = lista
      .slice()
      .sort((a, b) => +new Date(a.fecha_hora) - +new Date(b.fecha_hora))
      .find((p) => puedePredecir(p, minutosCierre, ahora));
    if (!proximo) continue;

    const participanteId = participantePorGrupo.get(grupoId);
    const pred = participanteId
      ? predPorClave.get(`${participanteId}:${proximo.id}`)
      : undefined;
    proximoPorGrupo.set(grupoId, {
      partido: proximo,
      miPrediccion: pred
        ? { goles_local: pred.goles_local, goles_visitante: pred.goles_visitante }
        : null,
      cierre: new Date(
        new Date(proximo.fecha_hora).getTime() - minutosCierre * 60_000,
      ).toISOString(),
    });
  }

  return { pendientesHoy, proximoPorGrupo };
}
