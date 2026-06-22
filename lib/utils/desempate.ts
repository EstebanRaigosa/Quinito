/**
 * Lógica para EXPLICAR un desempate en la tabla de posiciones.
 *
 * La base ordena con `vwTablaPosiciones` aplicando, ante igualdad de puntos,
 * esta cadena de criterios (ver migración 0070):
 *   1. puntos_totales
 *   2-4. los 3 criterios configurables del grupo (exactos / unicas / aciertos)
 *   5. diferencia de gol acertada
 *   6. aciertos de ganador (1X2)
 *   7. goles individuales acertados
 *   8. quién guardó primero (la edición más temprana gana)
 *
 * Este módulo NO reordena nada: recibe la tabla ya ordenada y construye, para un
 * grupo de participantes empatados en puntos, una tabla comparativa con el valor
 * de cada uno en cada criterio, marcando la celda que define su posición frente
 * al jugador inmediatamente superior.
 */

import type { CriterioDesempate, FilaTablaPosiciones } from "@/lib/types/dominio";

/** Criterio de desempate fino: los 3 configurables + los 4 deportivos fijos. */
export type CriterioDesempateFino =
  | CriterioDesempate
  | "dif_gol"
  | "ganador"
  | "goles_individuales"
  | "tiempo";

/** Abreviatura para el encabezado de columna (compacta para móvil). */
export const ABREV_CRITERIO: Record<CriterioDesempateFino, string> = {
  exactos: "Exa",
  unicas: "Úni",
  aciertos: "Aci",
  dif_gol: "ΔGol",
  ganador: "1X2",
  goles_individuales: "Gol",
  tiempo: "Orden",
};

/** Descripción legible (es-CO) para la leyenda de la tabla. */
export const DESC_CRITERIO: Record<CriterioDesempateFino, string> = {
  exactos: "Marcadores exactos",
  unicas: "Predicciones únicas",
  aciertos: "Aciertos",
  dif_gol: "Diferencia de gol acertada",
  ganador: "Aciertos de ganador (1X2)",
  goles_individuales: "Goles acertados",
  tiempo: "Orden de envío (1.º = guardó primero)",
};

/** Motivo para la frase "X supera a Y por ...". `null` = salvaguarda técnica. */
export const MOTIVO_CRITERIO: Record<CriterioDesempateFino | "tecnico", string> = {
  exactos: "más marcadores exactos",
  unicas: "más predicciones únicas",
  aciertos: "más aciertos",
  dif_gol: "mejor diferencia de gol acertada",
  ganador: "más aciertos de ganador (1X2)",
  goles_individuales: "más goles acertados",
  tiempo: "haber enviado las predicciones primero",
  tecnico: "el orden de registro (criterio técnico)",
};

/** Fila de la tabla de desempate: un participante del grupo de empate. */
export type FilaDesempate = {
  participante_id: string;
  nombre: string;
  posicion: number;
  /** True si es el usuario que consulta. */
  esActual: boolean;
  /** True si es la fila desde la que se abrió el detalle. */
  esObjetivo: boolean;
  /** Valor de cada criterio (para "tiempo" es el orden 1..N entre empatados). */
  valores: Record<CriterioDesempateFino, number>;
  /** Criterio que lo separa del jugador de arriba; `null` en el 1.º del grupo o
   *  si solo los separó la salvaguarda técnica (orden de registro). */
  criterioDecisivo: CriterioDesempateFino | null;
};

/** Tabla comparativa de un grupo de participantes empatados en puntos. */
export type TablaDesempate = {
  /** Puntaje compartido por el grupo de empate. */
  puntos: number;
  /** Orden de las columnas: configurables del grupo + deportivos fijos. */
  criterios: CriterioDesempateFino[];
  /** Participantes empatados, ordenados por posición ascendente. */
  filas: FilaDesempate[];
};

/** Valor numérico de un criterio "más es mejor" para una fila. */
function valorCriterio(
  c: Exclude<CriterioDesempateFino, "tiempo">,
  f: FilaTablaPosiciones,
): number {
  switch (c) {
    case "exactos":
      return f.marcadores_exactos;
    case "unicas":
      return f.unicas_acertadas;
    case "aciertos":
      return f.aciertos;
    case "dif_gol":
      return f.dif_gol_acertada;
    case "ganador":
      return f.ganador_acertado;
    case "goles_individuales":
      return f.goles_individuales;
  }
}

/** Compara "tiempo" en ascendente: la edición más temprana primero; `null`
 *  (sin predicción) al final, igual que `ASC NULLS LAST` en la vista. */
function compararTiempoAsc(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

/** Primer criterio de la cadena donde `arriba` supera a `abajo`. */
function criterioDecisivo(
  arriba: FilaTablaPosiciones,
  abajo: FilaTablaPosiciones,
  orden: CriterioDesempateFino[],
): CriterioDesempateFino | null {
  for (const c of orden) {
    if (c === "tiempo") {
      if (compararTiempoAsc(arriba.ultima_edicion, abajo.ultima_edicion) !== 0) {
        return "tiempo";
      }
      continue;
    }
    if (valorCriterio(c, arriba) !== valorCriterio(c, abajo)) return c;
  }
  return null;
}

/**
 * Construye la tabla comparativa de desempate para el grupo de participantes que
 * comparten los puntos de `fila`. Devuelve `null` si no hay empate (nada que
 * explicar).
 *
 * @param fila      participante desde el que se abre la tabla
 * @param filas     tabla COMPLETA, ya ordenada por posición ascendente
 * @param criterios orden de los 3 criterios configurables del grupo
 */
export function construirTablaDesempate(
  fila: FilaTablaPosiciones,
  filas: FilaTablaPosiciones[],
  criterios: CriterioDesempate[],
): TablaDesempate | null {
  const empatados = filas.filter(
    (f) => f.puntos_totales === fila.puntos_totales,
  );
  if (empatados.length < 2) return null;

  const ordenados = [...empatados].sort((a, b) => a.posicion - b.posicion);

  // Cadena real de desempate: configurables del grupo + deportivos fijos.
  const orden: CriterioDesempateFino[] = [
    ...criterios,
    "dif_gol",
    "ganador",
    "goles_individuales",
    "tiempo",
  ];

  // Ranking por tiempo de envío entre los empatados (1 = guardó primero).
  const rankTiempo = new Map<string, number>();
  [...ordenados]
    .sort((a, b) => compararTiempoAsc(a.ultima_edicion, b.ultima_edicion))
    .forEach((f, i) => rankTiempo.set(f.participante_id, i + 1));

  const filasD: FilaDesempate[] = ordenados.map((f, idx) => {
    const arriba = idx > 0 ? ordenados[idx - 1]! : null;
    const valores = {} as Record<CriterioDesempateFino, number>;
    for (const c of orden) {
      valores[c] =
        c === "tiempo"
          ? (rankTiempo.get(f.participante_id) ?? 0)
          : valorCriterio(c, f);
    }
    return {
      participante_id: f.participante_id,
      nombre: f.nombre_completo,
      posicion: f.posicion,
      esActual: f.es_actual,
      esObjetivo: f.participante_id === fila.participante_id,
      valores,
      criterioDecisivo: arriba ? criterioDecisivo(arriba, f, orden) : null,
    };
  });

  return { puntos: fila.puntos_totales, criterios: orden, filas: filasD };
}
