import { createClient } from "@/lib/supabase/server";
import type { Partido } from "@/lib/types/dominio";
import { SELECT_PARTIDOS, mapPartidoRow } from "@/lib/queries/_partido-map";

/**
 * Catálogo completo de partidos del torneo activo, ordenado cronológicamente.
 * Versión server (RSC) del hook `usePartidosTorneo`. Lectura pública para
 * autenticados (CLAUDE.md §5): no expone predicciones ni PII.
 */
export async function getPartidosTorneo(): Promise<Partido[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tblPartidos")
    .select(SELECT_PARTIDOS)
    .order("fecha_hora", { ascending: true });
  if (error || !data) return [];
  return data.map(mapPartidoRow);
}
