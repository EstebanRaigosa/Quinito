import type { FaseTorneo, Partido, ReglasGrupo } from "@/lib/types/dominio";
import { ETIQUETA_FASE } from "@/lib/types/dominio";

/**
 * ¿La apuesta del partido está cerrada? Se cierra `minutosCierre` antes del
 * kickoff (o si el partido ya está en vivo/finalizado/cancelado).
 *
 * Esto es solo UX: la verdad la impone el RLS/`partido_cerrado` en la BD
 * (CLAUDE.md §3.4). `ahora` se pasa explícito para poder calcularlo en servidor.
 */
export function prediccionCerrada(
  partido: Partido,
  minutosCierre: number,
  ahora: Date,
): boolean {
  if (partido.estado !== "programado") return true;
  const cierre = new Date(partido.fecha_hora).getTime() - minutosCierre * 60_000;
  return ahora.getTime() >= cierre;
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
 * Bono de ronda que otorga la fase al acertar marcador exacto (según las reglas
 * del grupo). 0 para fase de grupos y tercer lugar (no tienen bono).
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
    const bono = bonoDeFase(reglas, partido.fase);
    if (bono > 0) {
      items.push({
        label: `Bono ${ETIQUETA_FASE[partido.fase]}`,
        motivo: "Marcador exacto en fase eliminatoria",
        puntos: bono,
      });
    }
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
