import type { FaseTorneo, Partido, ReglasGrupo } from "@/lib/types/dominio";

/**
 * Fecha centinela "sin cierre": un partido con `fecha_hora` anterior a 1901
 * (en la práctica `1900-01-01 00:00`) NUNCA se cierra para predicciones. Sirve
 * para dejar partidos de prueba abiertos de forma indefinida. La misma regla
 * vive en SQL (`partido_cerrado`, migración 0038) para que el RLS la respete.
 */
const SIN_CIERRE_LIMITE = Date.UTC(1901, 0, 1);

/** ¿El partido está marcado como "sin cierre" (fecha centinela de 1900)? */
export function esSinCierre(partido: Partido): boolean {
  return new Date(partido.fecha_hora).getTime() < SIN_CIERRE_LIMITE;
}

/**
 * Orden de listado: por fecha ascendente y, ante igual fecha (p. ej. los
 * partidos "sin fecha" centinela que comparten 1900), por grupo (A, B, C, D…)
 * y luego por número de partido. Así los partidos sin fecha quedan ordenados
 * por grupo en vez de en orden arbitrario.
 */
export function compararPartidos(a: Partido, b: Partido): number {
  const fa = new Date(a.fecha_hora).getTime();
  const fb = new Date(b.fecha_hora).getTime();
  if (fa !== fb) return fa - fb;
  const ga = a.grupo ?? "";
  const gb = b.grupo ?? "";
  if (ga !== gb) return ga.localeCompare(gb, "es");
  return a.numero_partido - b.numero_partido;
}

/**
 * ¿La apuesta del partido está cerrada? Se cierra `minutosCierre` antes del
 * kickoff (o si el partido ya está en vivo/finalizado/cancelado). Excepción:
 * los partidos con fecha centinela de 1900 nunca se cierran (ver `esSinCierre`).
 *
 * Esto es solo UX: la verdad la impone el RLS/`partido_cerrado` en la BD
 * (CLAUDE.md §3.4). `ahora` se pasa explícito para poder calcularlo en servidor.
 */
export function prediccionCerrada(
  partido: Partido,
  minutosCierre: number,
  ahora: Date,
): boolean {
  if (esSinCierre(partido)) return false;
  if (partido.estado !== "programado") return true;
  const cierre = new Date(partido.fecha_hora).getTime() - minutosCierre * 60_000;
  return ahora.getTime() >= cierre;
}

/**
 * ¿El partido ya estaba cerrado en el instante `creadoEn` (creación de la
 * polla)? Es decir: nadie pudo predecirlo porque su cierre ocurrió antes de que
 * la polla existiera. A diferencia de `prediccionCerrada`, NO mira el `estado`
 * actual del partido (en vivo/finalizado de HOY no dice nada sobre si estaba
 * cerrado AL CREAR): la pregunta es histórica, así que solo compara el instante
 * de cierre programado contra la creación. Los partidos "sin cierre" (centinela
 * 1900) nunca cuentan. Sirve para avisar al admin que cargue el "arranque".
 */
export function cerradoAlCrear(
  partido: Partido,
  minutosCierre: number,
  creadoEn: Date,
): boolean {
  if (esSinCierre(partido)) return false;
  const cierre = new Date(partido.fecha_hora).getTime() - minutosCierre * 60_000;
  return creadoEn.getTime() >= cierre;
}

/**
 * Firma de los datos "en vivo" de un partido (estado + marcador). Solo cambia
 * cuando cambia algo visible que justifica un destello de actualización en la
 * tarjeta. La consume `DestelloPartido`.
 */
export function firmaPartido(partido: Partido): string {
  return `${partido.estado}:${partido.goles_local ?? ""}:${partido.goles_visitante ?? ""}`;
}

/** ¿Se puede predecir? Requiere equipos definidos y apuesta abierta. */
export function puedePredecir(
  partido: Partido,
  minutosCierre: number,
  ahora: Date,
): boolean {
  const equiposDefinidos =
    !!partido.equipo_local && !!partido.equipo_visitante;
  return equiposDefinidos && !prediccionCerrada(partido, minutosCierre, ahora);
}

/**
 * Clasifica qué acertó una predicción frente al marcador real (mismo criterio
 * que la función `finalizar_partido`):
 * - `exacto`: marcador idéntico (acierto completo).
 * - `ganador`: acertó el resultado (gana local / empate / gana visitante).
 * - `gol`: acertó el número de goles de al menos un equipo.
 * Se devuelven todas las que apliquen, en orden de jerarquía. Vacío = sin acierto.
 */
export type TipoAcierto = "exacto" | "ganador" | "gol";

function signo(a: number, b: number): number {
  return a > b ? 1 : a < b ? -1 : 0;
}

export function clasificarAcierto(
  prediccion: { goles_local: number; goles_visitante: number },
  resultadoLocal: number,
  resultadoVisitante: number,
): TipoAcierto[] {
  const exacto =
    prediccion.goles_local === resultadoLocal &&
    prediccion.goles_visitante === resultadoVisitante;
  if (exacto) return ["exacto"];

  const tipos: TipoAcierto[] = [];
  if (
    signo(prediccion.goles_local, prediccion.goles_visitante) ===
    signo(resultadoLocal, resultadoVisitante)
  ) {
    tipos.push("ganador");
  }
  if (
    prediccion.goles_local === resultadoLocal ||
    prediccion.goles_visitante === resultadoVisitante
  ) {
    tipos.push("gol");
  }
  return tipos;
}

/**
 * Fases eliminatorias en las que un equipo "avanza" (y que otorgan bono): si el
 * usuario predice un empate en una de ellas debe indicar quién pasa. Excluye
 * `fase_grupos` (no hay avance directo) y `tercer_lugar` (no avanza a ninguna
 * ronda ni tiene bono). Para `final`, "avanzar" = ser campeón.
 */
const FASES_CON_AVANCE: readonly FaseTorneo[] = [
  "dieciseisavos",
  "octavos",
  "cuartos",
  "semifinales",
  "final",
];

/** ¿Esta fase define un equipo que avanza (y por tanto requiere desempate al predecir empate)? */
export function faseTieneAvance(fase: FaseTorneo): boolean {
  return FASES_CON_AVANCE.includes(fase);
}

/**
 * Monto del bono configurado para una fase eliminatoria (según las reglas del
 * grupo). Es el bono TODO-O-NADA que se gana al acertar el equipo que avanza en
 * TODOS los partidos de esa fase (ver tblBonosFase / recalcular_bonos_fase_grupo).
 * 0 para fase de grupos y tercer lugar (no tienen bono).
 */
export function bonoDeFase(reglas: ReglasGrupo, fase: FaseTorneo): number {
  switch (fase) {
    case "dieciseisavos":
      return reglas.bono_dieciseisavos;
    case "octavos":
      return reglas.bono_octavos;
    case "cuartos":
      return reglas.bono_cuartos;
    case "semifinales":
      return reglas.bono_semifinales;
    case "final":
      return reglas.bono_final;
    default:
      return 0;
  }
}

/**
 * Tipo de acierto de una predicción finalizada, para distinguirla con un ICONO
 * en el badge de puntaje (el color del badge es siempre esmeralda):
 * - `unico`: marcador exacto + bono de predicción única.
 * - `exacto`: clavó el marcador completo (sin bono único).
 * - `parcial`: acierto parcial (ganador y/o goles, sin marcador exacto).
 * - `ninguno`: no sumó puntos.
 */
export type NivelAcierto = "unico" | "exacto" | "parcial" | "ninguno";

export function nivelAcierto(
  prediccion: {
    goles_local: number;
    goles_visitante: number;
    puntos_obtenidos: number;
    prediccion_unica: boolean;
  },
  partido: Partido,
): NivelAcierto {
  if (prediccion.puntos_obtenidos <= 0) return "ninguno";
  const exacto =
    partido.estado === "finalizado" &&
    prediccion.goles_local === partido.goles_local &&
    prediccion.goles_visitante === partido.goles_visitante;
  if (!exacto) return "parcial";
  return prediccion.prediccion_unica ? "unico" : "exacto";
}

/** Una línea del desglose de puntos de una predicción. */
export type LineaPuntaje = { label: string; motivo: string; puntos: number };

/**
 * Desglose de cómo se obtuvieron los puntos de una predicción ya finalizada,
 * con el mismo criterio que `finalizar_partido`. Cada línea explica qué puntuó,
 * por qué y cuánto. La suma equivale a `puntos_obtenidos`.
 */
export function desglosePuntaje(
  prediccion: {
    goles_local: number;
    goles_visitante: number;
    prediccion_unica: boolean;
  },
  partido: Partido,
  reglas: ReglasGrupo,
): LineaPuntaje[] {
  const rl = partido.goles_local ?? 0;
  const rv = partido.goles_visitante ?? 0;
  const pl = prediccion.goles_local;
  const pv = prediccion.goles_visitante;
  const items: LineaPuntaje[] = [];

  if (pl === rl && pv === rv) {
    items.push({
      label: "Marcador exacto",
      motivo: `Clavaste el ${rl}-${rv}`,
      puntos: reglas.pts_marcador_exacto,
    });
    // El bono por fase ya NO es por-partido: se otorga aparte (todo-o-nada por
    // acertar los equipos que avanzan en toda la fase). Ver tblBonosFase.
    if (prediccion.prediccion_unica && reglas.pts_prediccion_unica > 0) {
      items.push({
        label: "Predicción única",
        motivo: "Fuiste el único en clavar el marcador",
        puntos: reglas.pts_prediccion_unica,
      });
    }
  } else {
    if (signo(pl, pv) === signo(rl, rv)) {
      items.push({
        label: "Ganador acertado",
        motivo: "Acertaste quién ganó (o el empate)",
        puntos: reglas.pts_ganador,
      });
    }
    if (pl === rl) {
      items.push({
        label: "Gol del local",
        motivo: `Acertaste los goles del local (${rl})`,
        puntos: reglas.pts_gol_acertado,
      });
    }
    if (pv === rv) {
      items.push({
        label: "Gol del visitante",
        motivo: `Acertaste los goles del visitante (${rv})`,
        puntos: reglas.pts_gol_acertado,
      });
    }
  }
  return items;
}
