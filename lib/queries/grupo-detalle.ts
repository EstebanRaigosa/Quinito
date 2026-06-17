import { createClient } from "@/lib/supabase/server";
import type {
  BonoFase,
  CriterioDesempate,
  FaseTorneo,
  FilaTablaPosiciones,
  Participante,
  Partido,
  Prediccion,
  ReglasGrupo,
} from "@/lib/types/dominio";

/** Criterios válidos de desempate, para sanear el array crudo del RPC. */
const CRITERIOS_VALIDOS: CriterioDesempate[] = ["exactos", "unicas", "aciertos"];
import { mapPartidoRow } from "@/lib/queries/_partido-map";

export type GrupoDetalle = {
  grupo: {
    id: string;
    nombre: string;
    descripcion: string | null;
    codigo_invitacion: string;
    creador_id: string;
    total_participantes: number;
  };
  reglas: ReglasGrupo;
  esAdmin: boolean;
  miParticipanteId: string;
  participantes: Participante[];
  tabla: FilaTablaPosiciones[];
  partidos: Partido[];
  misPredicciones: Prediccion[];
  /** Bonos por fase ganados por el usuario actual. */
  misBonosFase: BonoFase[];
};

/** Shape crudo que devuelve el RPC `grupo_detalle` (jsonb). */
type RawDetalle = {
  miParticipanteId: string;
  esAdmin: boolean;
  grupo: {
    id: string;
    nombre: string;
    descripcion: string | null;
    codigo_invitacion: string;
    creador_id: string;
  };
  reglas: Record<string, number | string | string[] | null>;
  participantes: {
    id: string;
    rol: Participante["rol"];
    pago_realizado: boolean;
    puntos_iniciales: number;
    exactos_iniciales: number;
    unicas_iniciales: number;
    aciertos_iniciales: number;
    usuario: {
      id: string;
      nombre_completo: string | null;
      email: string | null;
      avatar_url: string | null;
    } | null;
  }[];
  tabla: {
    participante_id: string;
    posicion: number;
    nombre_completo: string | null;
    avatar_url: string | null;
    puntos_totales: number;
    puntos_iniciales: number;
    aciertos: number;
    marcadores_exactos: number;
    unicas_acertadas: number;
    bonos_fase: number;
  }[];
  misBonosFase: { fase: FaseTorneo; puntos: number }[];
  partidos: Parameters<typeof mapPartidoRow>[0][];
  misPredicciones: {
    id: string;
    participante_id: string;
    partido_id: string;
    goles_local: number;
    goles_visitante: number;
    puntos_obtenidos: number;
    prediccion_unica: boolean;
    equipo_avanza_id: string | null;
  }[];
};

/**
 * Carga todo el detalle de un grupo (con verificación de membresía) en UNA sola
 * llamada a la base (RPC `grupo_detalle`). Devuelve `null` si el usuario no es
 * miembro o el grupo no existe.
 *
 * Antes esto eran ~4 olas de latencia de red (membresía → 6 queries en paralelo
 * → partidos); ahora es una. El RPC ya impone la puerta de membresía y la
 * privacidad de predicciones (CLAUDE.md §3.4).
 */
export async function getGrupoDetalle(id: string): Promise<GrupoDetalle | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("grupo_detalle", {
    p_grupo_id: id,
  });
  // `null` → no es miembro o no existe (la puerta vive en el RPC).
  if (error || !data) return null;

  const d = data as unknown as RawDetalle;

  const participantes: Participante[] = d.participantes.map((p) => ({
    id: p.id,
    grupo_id: id,
    usuario: {
      id: p.usuario?.id ?? "",
      nombre_completo: p.usuario?.nombre_completo ?? "",
      email: p.usuario?.email ?? "",
      avatar_url: p.usuario?.avatar_url ?? null,
    },
    rol: p.rol,
    pago_realizado: p.pago_realizado,
    puntos_iniciales: Number(p.puntos_iniciales ?? 0),
    exactos_iniciales: Number(p.exactos_iniciales ?? 0),
    unicas_iniciales: Number(p.unicas_iniciales ?? 0),
    aciertos_iniciales: Number(p.aciertos_iniciales ?? 0),
    // Puntos por participante desde la tabla de posiciones.
    puntos_totales:
      d.tabla.find((f) => f.participante_id === p.id)?.puntos_totales ?? 0,
  }));

  const tabla: FilaTablaPosiciones[] = d.tabla.map((f) => ({
    participante_id: f.participante_id ?? "",
    posicion: Number(f.posicion ?? 0),
    nombre_completo: f.nombre_completo ?? "",
    avatar_url: f.avatar_url ?? null,
    puntos_totales: Number(f.puntos_totales ?? 0),
    puntos_iniciales: Number(f.puntos_iniciales ?? 0),
    aciertos: Number(f.aciertos ?? 0),
    marcadores_exactos: Number(f.marcadores_exactos ?? 0),
    unicas_acertadas: Number(f.unicas_acertadas ?? 0),
    bonos_fase: Number(f.bonos_fase ?? 0),
    es_actual: f.participante_id === d.miParticipanteId,
  }));

  const misBonosFase: BonoFase[] = (d.misBonosFase ?? []).map((b) => ({
    fase: b.fase,
    puntos: Number(b.puntos ?? 0),
  }));

  const partidos: Partido[] = d.partidos.map(mapPartidoRow);

  const misPredicciones: Prediccion[] = d.misPredicciones.map((p) => ({
    id: p.id,
    participante_id: p.participante_id,
    partido_id: p.partido_id,
    goles_local: p.goles_local,
    goles_visitante: p.goles_visitante,
    puntos_obtenidos: p.puntos_obtenidos,
    prediccion_unica: p.prediccion_unica,
    equipo_avanza_id: p.equipo_avanza_id ?? null,
  }));

  // `numeric` llega como número en JSON; `Number(...)` normaliza por si acaso.
  const r = d.reglas;
  const criteriosCrudos = Array.isArray(r.criterios_desempate)
    ? r.criterios_desempate
    : [];
  // Saneamos valores inválidos PRESERVANDO el orden configurado del grupo.
  const criterios = criteriosCrudos.filter((c): c is CriterioDesempate =>
    (CRITERIOS_VALIDOS as string[]).includes(c),
  );
  const reglas: ReglasGrupo = {
    grupo_id: String(r.grupo_id ?? id),
    criterios_desempate:
      criterios.length > 0 ? criterios : [...CRITERIOS_VALIDOS],
    pts_marcador_exacto: Number(r.pts_marcador_exacto),
    pts_ganador: Number(r.pts_ganador),
    pts_gol_acertado: Number(r.pts_gol_acertado),
    pts_prediccion_unica: Number(r.pts_prediccion_unica),
    bono_dieciseisavos: Number(r.bono_dieciseisavos),
    bono_octavos: Number(r.bono_octavos),
    bono_cuartos: Number(r.bono_cuartos),
    bono_semifinales: Number(r.bono_semifinales),
    bono_final: Number(r.bono_final),
    valor_apuesta: Number(r.valor_apuesta),
    premio_primer_lugar: Number(r.premio_primer_lugar),
    premio_segundo_lugar: Number(r.premio_segundo_lugar),
    premio_tercer_lugar: Number(r.premio_tercer_lugar),
    minutos_cierre_prediccion: Number(r.minutos_cierre_prediccion),
  };

  return {
    grupo: {
      id: d.grupo.id,
      nombre: d.grupo.nombre,
      descripcion: d.grupo.descripcion,
      codigo_invitacion: d.grupo.codigo_invitacion,
      creador_id: d.grupo.creador_id,
      total_participantes: participantes.length,
    },
    reglas,
    esAdmin: d.esAdmin,
    miParticipanteId: d.miParticipanteId,
    participantes,
    tabla,
    partidos,
    misPredicciones,
    misBonosFase,
  };
}
