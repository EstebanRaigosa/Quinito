import { createClient } from "@/lib/supabase/server";
import type { TorneoOpcion } from "@/lib/queries/torneos";

/**
 * Torneos disponibles, del más antiguo al más nuevo. Versión server (RSC) de
 * `useTorneosDisponibles`. Usa el RPC `torneos_disponibles`: activos para todos
 * + inactivos (de prueba) solo para el superadmin. Lectura sin PII (CLAUDE.md §5).
 */
export async function getTorneosDisponibles(): Promise<TorneoOpcion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("torneos_disponibles");
  if (error || !data) return [];
  return data;
}
