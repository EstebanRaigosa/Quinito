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
};

/**
 * Torneos activos disponibles para crear un grupo, del más antiguo al más
 * nuevo. Lectura pública para autenticados (CLAUDE.md §5): no expone PII.
 */
export function useTorneosActivos() {
  return useQuery({
    queryKey: ["torneos-activos"],
    queryFn: async (): Promise<TorneoOpcion[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tblTorneos")
        .select("id, codigo, nombre, pais_sede, fecha_inicio, fecha_fin")
        .eq("activo", true)
        .order("creado_en", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}
