import { createClient } from "@/lib/supabase/server";
import type { Partido } from "@/lib/types/dominio";
import { SELECT_PARTIDOS, mapPartidoRow } from "@/lib/queries/_partido-map";

/**
 * Catálogo de partidos, ordenado cronológicamente. Versión server (RSC) del
 * hook `usePartidosTorneo`. Lectura pública para autenticados (CLAUDE.md §5):
 * no expone predicciones ni PII.
 *
 * - Con `torneoId`: solo los partidos de ese torneo (vista pública /partidos,
 *   que ahora soporta varios torneos y no debe mezclarlos).
 * - Sin `torneoId`: todos los partidos de todos los torneos (panel de
 *   super-admin, que los agrupa por torneo con su propio selector).
 */
export async function getPartidosTorneo(torneoId?: string): Promise<Partido[]> {
  const supabase = await createClient();
  let query = supabase.from("tblPartidos").select(SELECT_PARTIDOS);
  if (torneoId) query = query.eq("torneo_id", torneoId);
  const { data, error } = await query.order("fecha_hora", { ascending: true });
  if (error || !data) return [];
  return data.map(mapPartidoRow);
}
