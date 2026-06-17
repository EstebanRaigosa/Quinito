import type {
  Equipo,
  EstadoPartido,
  FaseTorneo,
  Partido,
  TipoDefinicion,
} from "@/lib/types/dominio";

// Select con ambos equipos embebidos vía el FK explícito (hay dos FKs a
// tblEquipos, hay que desambiguar con el nombre de la constraint).
export const SELECT_PARTIDOS = `
  id, torneo_id, numero_partido, fase, grupo,
  placeholder_local, placeholder_visitante, fecha_hora, estadio, ciudad,
  goles_local, goles_visitante, penales_local, penales_visitante,
  prorroga_local, prorroga_visitante,
  tipo_definicion, equipo_avanza_id, estado,
  equipo_local:tblEquipos!tblPartidos_equipo_local_id_fkey (id, nombre, codigo_iso, bandera_url, grupo),
  equipo_visitante:tblEquipos!tblPartidos_equipo_visitante_id_fkey (id, nombre, codigo_iso, bandera_url, grupo)
`;

type EquipoEmbebido = {
  id: string;
  nombre: string;
  codigo_iso: string | null;
  bandera_url: string | null;
  grupo: string | null;
} | null;

function mapEquipo(e: EquipoEmbebido | EquipoEmbebido[]): Equipo | null {
  const eq = Array.isArray(e) ? (e[0] ?? null) : e;
  if (!eq) return null;
  return {
    id: eq.id,
    nombre: eq.nombre,
    codigo_iso: eq.codigo_iso,
    // El dominio espera `bandera` (emoji en el mock). Flag usa codigo_iso; aquí
    // pasamos la url si existe.
    bandera: eq.bandera_url ?? "",
    grupo: eq.grupo,
  };
}

/** Fila cruda de tblPartidos con equipos embebidos → dominio `Partido`. */
export function mapPartidoRow(p: {
  id: string;
  torneo_id: string;
  numero_partido: number;
  fase: string;
  grupo: string | null;
  placeholder_local: string | null;
  placeholder_visitante: string | null;
  fecha_hora: string;
  estadio: string | null;
  ciudad: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
  penales_local?: number | null;
  penales_visitante?: number | null;
  prorroga_local?: number | null;
  prorroga_visitante?: number | null;
  tipo_definicion?: string | null;
  equipo_avanza_id?: string | null;
  estado: string;
  equipo_local: EquipoEmbebido | EquipoEmbebido[];
  equipo_visitante: EquipoEmbebido | EquipoEmbebido[];
}): Partido {
  return {
    id: p.id,
    torneo_id: p.torneo_id,
    numero_partido: p.numero_partido,
    fase: p.fase as FaseTorneo,
    grupo: p.grupo,
    equipo_local: mapEquipo(p.equipo_local),
    equipo_visitante: mapEquipo(p.equipo_visitante),
    placeholder_local: p.placeholder_local,
    placeholder_visitante: p.placeholder_visitante,
    fecha_hora: p.fecha_hora,
    estadio: p.estadio,
    ciudad: p.ciudad,
    goles_local: p.goles_local,
    goles_visitante: p.goles_visitante,
    penales_local: p.penales_local ?? null,
    penales_visitante: p.penales_visitante ?? null,
    prorroga_local: p.prorroga_local ?? null,
    prorroga_visitante: p.prorroga_visitante ?? null,
    tipo_definicion: (p.tipo_definicion ?? "regular") as TipoDefinicion,
    equipo_avanza_id: p.equipo_avanza_id ?? null,
    estado: p.estado as EstadoPartido,
  };
}
