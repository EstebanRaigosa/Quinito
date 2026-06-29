import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/** Torneo seleccionable en el wizard de creación de grupo. */
export type TorneoOpcion = {
  id: string;
  codigo: string;
  nombre: string;
  pais_sede: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  /** true = disponible públicamente. Un torneo de prueba lo tiene en false. */
  activo: boolean;
  /** true = torneo de prueba: solo lo devuelve el RPC al superadmin (ver 0084). */
  es_prueba: boolean;
};

/**
 * Torneos disponibles para crear un grupo, del más antiguo al más nuevo.
 * Usa el RPC `torneos_disponibles` (SECURITY DEFINER): devuelve los torneos
 * activos a todos y, además, los de prueba (`es_prueba`) solo al superadmin. La
 * visibilidad se controla desde el panel admin (/admin/torneos). Lectura sin PII
 * (CLAUDE.md §5).
 */
export function useTorneosDisponibles() {
  return useQuery({
    queryKey: ["torneos-disponibles"],
    queryFn: async (): Promise<TorneoOpcion[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("torneos_disponibles");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}
