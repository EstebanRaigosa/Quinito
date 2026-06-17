"use client";

import { createContext, useContext } from "react";

/**
 * Contexto del detalle de grupo: deja a los hijos abrir la pestaña
 * "Participantes" e iniciar/cerrar el recorrido guiado que señala el botón
 * "Arranque". Vive en su propio módulo (no en `TabsConRefresh`) para que el
 * componente del recorrido pueda consumirlo sin crear un import circular con el
 * componente que lo renderiza.
 */
export type GrupoTabsCtx = {
  /** Abre "Participantes" e inicia el recorrido guiado hacia "Arranque". */
  irAParticipantes: () => void;
  /** ¿Está activo el recorrido guiado del botón "Arranque"? */
  tourArranque: boolean;
  /** Cierra el recorrido guiado. */
  finalizarTour: () => void;
};

export const GrupoTabsContext = createContext<GrupoTabsCtx>({
  irAParticipantes: () => {},
  tourArranque: false,
  finalizarTour: () => {},
});

/** Acceso al contexto de pestañas del detalle de grupo. */
export function useGrupoTabs(): GrupoTabsCtx {
  return useContext(GrupoTabsContext);
}
