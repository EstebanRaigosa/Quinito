import { createClient } from "@/lib/supabase/server";
import type { TorneoOpcion } from "@/lib/queries/torneos";

/**
 * Torneos activos, del más antiguo al más nuevo. Versión server (RSC) de
 * `useTorneosActivos`. Lectura pública para autenticados (CLAUDE.md §5).
 */
export async function getTorneosActivos(): Promise<TorneoOpcion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tblTorneos")
    .select("id, codigo, nombre, pais_sede, fecha_inicio, fecha_fin")
    .eq("activo", true)
    .order("creado_en", { ascending: true });
  if (error || !data) return [];
  return data;
}
