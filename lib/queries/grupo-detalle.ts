import { createClient } from "@/lib/supabase/server";
import type {
  FilaTablaPosiciones,
  Participante,
  Partido,
  Perfil,
  Prediccion,
  ReglasGrupo,
} from "@/lib/types/dominio";
import { SELECT_PARTIDOS, mapPartidoRow } from "@/lib/queries/_partido-map";

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
};

function perfilDe(u: unknown): Perfil {
  const x = (Array.isArray(u) ? u[0] : u) as {
    id: string;
    nombre_completo: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  return {
    id: x?.id ?? "",
    nombre_completo: x?.nombre_completo ?? "",
    email: x?.email ?? "",
    avatar_url: x?.avatar_url ?? null,
  };
}

/**
 * Carga todo el detalle de un grupo (con verificación de membresía). Devuelve
 * `null` si el usuario no es miembro o el grupo no existe.
 */
export async function getGrupoDetalle(id: string): Promise<GrupoDetalle | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Puerta de membresía: solo miembros ven el detalle.
  const { data: miPart } = await supabase
    .from("tblParticipantes")
    .select("id, rol")
    .eq("grupo_id", id)
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (!miPart) return null;

  const [grupoRes, reglasRes, partsRes, tablaRes, gpRes, predsRes] =
    await Promise.all([
      supabase
        .from("tblGrupos")
        .select("id, nombre, descripcion, codigo_invitacion, creador_id")
        .eq("id", id)
        .single(),
      supabase.from("tblReglasGrupo").select("*").eq("grupo_id", id).single(),
      supabase
        .from("tblParticipantes")
        .select(
          "id, rol, pago_realizado, usuario:tblProfiles(id, nombre_completo, email, avatar_url)",
        )
        .eq("grupo_id", id),
      supabase
        .from("vwTablaPosiciones")
        .select(
          "participante_id, posicion, nombre_completo, avatar_url, puntos_totales, aciertos, marcadores_exactos",
        )
        .eq("grupo_id", id)
        .order("posicion", { ascending: true }),
      supabase.from("tblGrupoPartidos").select("partido_id").eq("grupo_id", id),
      supabase
        .from("tblPredicciones")
        .select(
          "id, participante_id, partido_id, goles_local, goles_visitante, puntos_obtenidos, prediccion_unica",
        )
        .eq("participante_id", miPart.id),
    ]);

  if (grupoRes.error || !grupoRes.data || reglasRes.error || !reglasRes.data) {
    return null;
  }

  // Puntos por participante (desde la tabla de posiciones).
  const puntosPorParticipante = new Map<string, number>(
    (tablaRes.data ?? []).map((f) => [
      f.participante_id ?? "",
      Number(f.puntos_totales ?? 0),
    ]),
  );

  const participantes: Participante[] = (partsRes.data ?? []).map((p) => ({
    id: p.id,
    grupo_id: id,
    usuario: perfilDe(p.usuario),
    rol: p.rol,
    pago_realizado: p.pago_realizado,
    puntos_totales: puntosPorParticipante.get(p.id) ?? 0,
  }));

  const tabla: FilaTablaPosiciones[] = (tablaRes.data ?? []).map((f) => ({
    participante_id: f.participante_id ?? "",
    posicion: Number(f.posicion ?? 0),
    nombre_completo: f.nombre_completo ?? "",
    avatar_url: f.avatar_url ?? null,
    puntos_totales: Number(f.puntos_totales ?? 0),
    aciertos: Number(f.aciertos ?? 0),
    marcadores_exactos: Number(f.marcadores_exactos ?? 0),
    es_actual: f.participante_id === miPart.id,
  }));

  // Partidos del grupo (por ids de tblGrupoPartidos).
  const ids = (gpRes.data ?? []).map((r) => r.partido_id);
  let partidos: Partido[] = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from("tblPartidos")
      .select(SELECT_PARTIDOS)
      .in("id", ids)
      .order("fecha_hora", { ascending: true });
    partidos = (data ?? []).map(mapPartidoRow);
  }

  const misPredicciones: Prediccion[] = (predsRes.data ?? []).map((p) => ({
    id: p.id,
    participante_id: p.participante_id,
    partido_id: p.partido_id,
    goles_local: p.goles_local,
    goles_visitante: p.goles_visitante,
    puntos_obtenidos: p.puntos_obtenidos,
    prediccion_unica: p.prediccion_unica,
  }));

  // Postgres devuelve `numeric` (valor_apuesta) como string vía PostgREST; lo
  // normalizamos a número para que el formulario lo precargue y el guardado
  // valide con `reglasSchema` (que espera números).
  const reglas: ReglasGrupo = {
    grupo_id: reglasRes.data.grupo_id,
    pts_marcador_exacto: Number(reglasRes.data.pts_marcador_exacto),
    pts_ganador: Number(reglasRes.data.pts_ganador),
    pts_gol_acertado: Number(reglasRes.data.pts_gol_acertado),
    pts_prediccion_unica: Number(reglasRes.data.pts_prediccion_unica),
    bono_dieciseisavos: Number(reglasRes.data.bono_dieciseisavos),
    bono_octavos: Number(reglasRes.data.bono_octavos),
    bono_cuartos: Number(reglasRes.data.bono_cuartos),
    bono_semifinales: Number(reglasRes.data.bono_semifinales),
    bono_final: Number(reglasRes.data.bono_final),
    valor_apuesta: Number(reglasRes.data.valor_apuesta),
    premio_primer_lugar: Number(reglasRes.data.premio_primer_lugar),
    premio_segundo_lugar: Number(reglasRes.data.premio_segundo_lugar),
    premio_tercer_lugar: Number(reglasRes.data.premio_tercer_lugar),
    minutos_cierre_prediccion: Number(reglasRes.data.minutos_cierre_prediccion),
  };

  return {
    grupo: {
      id: grupoRes.data.id,
      nombre: grupoRes.data.nombre,
      descripcion: grupoRes.data.descripcion,
      codigo_invitacion: grupoRes.data.codigo_invitacion,
      creador_id: grupoRes.data.creador_id,
      total_participantes: participantes.length,
    },
    reglas,
    esAdmin: miPart.rol === "admin",
    miParticipanteId: miPart.id,
    participantes,
    tabla,
    partidos,
    misPredicciones,
  };
}
