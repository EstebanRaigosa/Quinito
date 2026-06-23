/**
 * Tipos de dominio (provisionales).
 *
 * Reflejan el modelo de `REQUIREMENTS.md §5` con vocabulario en español. Cuando
 * exista el proyecto Supabase de Pollota, estos se reemplazan/derivan de los tipos
 * generados (`lib/supabase/types.ts`). Por ahora alimentan la capa mock del frontend.
 */

export type FaseTorneo =
  | "fase_grupos"
  | "dieciseisavos"
  | "octavos"
  | "cuartos"
  | "semifinales"
  | "tercer_lugar"
  | "final";

export type EstadoPartido =
  | "programado"
  | "en_vivo"
  | "finalizado"
  | "cancelado";

/** Cómo se definió un cruce eliminatorio (ver migración 0062). */
export type TipoDefinicion = "regular" | "prorroga" | "penales";

export type RolParticipante = "admin" | "jugador";

/** Estado derivado del grupo para la UI (no vive en BD). */
export type EstadoGrupo = "activo" | "proximo" | "finalizado";

export type Perfil = {
  id: string;
  nombre_completo: string;
  email: string;
  avatar_url: string | null;
};

export type Equipo = {
  id: string;
  nombre: string;
  codigo_iso: string | null;
  /** Bandera como emoji (mock). En producción será `bandera_url`. */
  bandera: string;
  grupo: string | null;
};

export type Torneo = {
  id: string;
  codigo: string;
  nombre: string;
  pais_sede: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
};

export type Partido = {
  id: string;
  torneo_id: string;
  numero_partido: number;
  fase: FaseTorneo;
  grupo: string | null;
  equipo_local: Equipo | null;
  equipo_visitante: Equipo | null;
  placeholder_local: string | null;
  placeholder_visitante: string | null;
  /** UTC ISO; renderizar siempre con helpers de `fechas.ts`. */
  fecha_hora: string;
  estadio: string | null;
  ciudad: string | null;
  goles_local: number | null;
  goles_visitante: number | null;
  /** Tanda de penales (solo cruces eliminatorios empatados); no puntúa. */
  penales_local: number | null;
  penales_visitante: number | null;
  /** Marcador final del tiempo extra (solo cruces resueltos en la prórroga); no puntúa. */
  prorroga_local: number | null;
  prorroga_visitante: number | null;
  /** Cómo se definió: 90' (regular), tiempo extra (prorroga) o penales. */
  tipo_definicion: TipoDefinicion;
  /**
   * Equipo que avanza cuando el marcador de los 90' quedó empatado (definido en
   * tiempo extra o penales). `null` si hubo ganador en los 90'. Ver migración 0064.
   */
  equipo_avanza_id: string | null;
  estado: EstadoPartido;
};

/** Criterios de desempate de la tabla (a igualdad de puntos), en orden. */
export type CriterioDesempate = "exactos" | "unicas" | "aciertos";

export type ReglasGrupo = {
  grupo_id: string;
  /** Orden de desempate cuando hay igualdad de puntos. */
  criterios_desempate: CriterioDesempate[];
  pts_marcador_exacto: number;
  pts_ganador: number;
  pts_gol_acertado: number;
  pts_prediccion_unica: number;
  bono_dieciseisavos: number;
  bono_octavos: number;
  bono_cuartos: number;
  bono_semifinales: number;
  bono_final: number;
  valor_apuesta: number;
  premio_primer_lugar: number;
  premio_segundo_lugar: number;
  premio_tercer_lugar: number;
  /** % del pozo reservado a administración (no se reparte como premio). */
  porcentaje_administracion: number;
  minutos_cierre_prediccion: number;
};

export type Participante = {
  id: string;
  grupo_id: string;
  usuario: Perfil;
  rol: RolParticipante;
  pago_realizado: boolean;
  puntos_totales: number;
  /** Puntaje de arranque al migrar la polla a mitad de torneo. */
  puntos_iniciales: number;
  /** Arranque de desempate: marcadores exactos acertados antes de migrar. */
  exactos_iniciales: number;
  /** Arranque de desempate: predicciones únicas acertadas antes de migrar. */
  unicas_iniciales: number;
  /** Arranque de desempate: otros aciertos (ganador/goles) antes de migrar. */
  aciertos_iniciales: number;
};

/** Un abono (pago parcial) de un participante hacia el valor de la apuesta. */
export type Abono = {
  id: string;
  monto: number;
  nota: string | null;
  creado_en: string;
  /** Nombre de quien registró el abono (admin/superadmin), si se conserva. */
  registrado_por_nombre: string | null;
  /** Código del comprobante 1-1 del abono (ej. "CMP-7F3K9Q2M"). */
  codigo: string | null;
};

/** Resultado de buscar un comprobante por su código (admin/superadmin). */
export type ComprobanteBusqueda = {
  codigo: string;
  monto: number;
  creado_en: string;
  metodo: string | null;
  participante_nombre: string | null;
  grupo_id: string;
  grupo_nombre: string;
  valor_apuesta: number;
  total_abonado: number;
  pagado: boolean;
};

/** Estado de pago de un participante frente al valor de la apuesta. */
export type EstadoPago = "pagado" | "parcial" | "pendiente" | "sin_costo";

/** Polla / quiniela creada por un usuario. */
export type Grupo = {
  id: string;
  nombre: string;
  descripcion: string | null;
  torneo: Torneo;
  codigo_invitacion: string;
  creador_id: string;
  total_participantes: number;
  /** Posición del usuario actual en este grupo (1-based). */
  mi_posicion: number | null;
  estado: EstadoGrupo;
};

export type Prediccion = {
  id: string;
  participante_id: string;
  partido_id: string;
  goles_local: number;
  goles_visitante: number;
  puntos_obtenidos: number;
  prediccion_unica: boolean;
  /**
   * Equipo que el usuario predice que avanza cuando su marcador es empate (solo
   * fases eliminatorias). `null` en cualquier otro caso. Ver migración 0061.
   */
  equipo_avanza_id: string | null;
};

export type FilaTablaPosiciones = {
  participante_id: string;
  posicion: number;
  nombre_completo: string;
  avatar_url: string | null;
  puntos_totales: number;
  /** Puntaje de arranque (incluido ya en puntos_totales); para mostrar desglose. */
  puntos_iniciales: number;
  aciertos: number;
  marcadores_exactos: number;
  /** Predicciones únicas acertadas (para el desempate). */
  unicas_acertadas: number;
  /** Total de bonos por fase ganados (incluido ya en puntos_totales). */
  bonos_fase: number;
  /** Diferencia de gol acertada (criterio fino de desempate 5.º). */
  dif_gol_acertada: number;
  /** Aciertos de ganador / sentido 1X2 (criterio fino de desempate 6.º). */
  ganador_acertado: number;
  /** Goles individuales acertados, 0-2 por partido (criterio fino 7.º). */
  goles_individuales: number;
  /** Instante de la última edición de predicción (UTC, ISO). El MENOR (guardó
   *  primero) gana el desempate por tiempo (criterio fino 8.º). `null` si no
   *  ha guardado ninguna predicción. */
  ultima_edicion: string | null;
  /** True si es el usuario que está consultando. */
  es_actual: boolean;
};

/** Bono por fase ganado por un participante (todo o nada). */
export type BonoFase = {
  fase: FaseTorneo;
  puntos: number;
};

/** Distribución agregada y anónima (estadísticas de partido). */
export type DistribucionGanador = {
  local_pct: number;
  empate_pct: number;
  visitante_pct: number;
};

export type MarcadorComun = {
  goles_local: number;
  goles_visitante: number;
  porcentaje: number;
  cantidad: number;
};

export const ETIQUETA_FASE: Record<FaseTorneo, string> = {
  fase_grupos: "Fase de grupos",
  dieciseisavos: "Dieciseisavos",
  octavos: "Octavos de final",
  cuartos: "Cuartos de final",
  semifinales: "Semifinales",
  tercer_lugar: "Tercer lugar",
  final: "Final",
};

export const ETIQUETA_ESTADO_PARTIDO: Record<EstadoPartido, string> = {
  programado: "Programado",
  en_vivo: "En vivo",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};
