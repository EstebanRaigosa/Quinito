import type { Partido } from "@/lib/types/dominio";

/**
 * Un partido predecible de hoy, ligado a la polla donde el usuario participa.
 *
 * La recolección de estos datos vive en `getInicioDashboard`
 * (`lib/queries/inicio.ts`), que trae todo el dashboard en una sola llamada.
 */
export type PrediccionPendiente = {
  grupoId: string;
  grupoNombre: string;
  partido: Partido;
  /** Marcador ya predicho por el usuario, o `null` si está pendiente. */
  miPrediccion: { goles_local: number; goles_visitante: number } | null;
  /** Cierre de la apuesta en UTC ISO (kickoff − minutos_cierre). */
  cierre: string;
};
