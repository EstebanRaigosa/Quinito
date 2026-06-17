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
  /** false = torneo de prueba, solo visible para el superadmin (ver 0057). */
  activo: boolean;
};

/**
 * Torneos disponibles para crear un grupo, del más antiguo al más nuevo.
 * Usa el RPC `torneos_disponibles` (SECURITY DEFINER): devuelve los activos a
 * todos y, además, los inactivos (de prueba) solo al superadmin. Lectura sin
 * PII (CLAUDE.md §5).
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
