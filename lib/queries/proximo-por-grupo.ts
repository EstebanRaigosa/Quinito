import type { Partido } from "@/lib/types/dominio";

/**
 * Próximo partido predecible de un grupo + tu predicción (si existe).
 *
 * La recolección de estos datos vive en `getInicioDashboard`
 * (`lib/queries/inicio.ts`), que trae todo el dashboard en una sola llamada.
 */
export type ProximoPartidoGrupo = {
  partido: Partido;
  /** Marcador ya predicho por el usuario, o `null` si está pendiente. */
  miPrediccion: { goles_local: number; goles_visitante: number } | null;
  /** Cierre de la apuesta en UTC ISO (kickoff − minutos_cierre). */
  cierre: string;
};
