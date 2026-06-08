import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Partido } from "@/lib/types/dominio";
import { SELECT_PARTIDOS, mapPartidoRow } from "@/lib/queries/_partido-map";

/** Catálogo de partidos del torneo (real, ordenado por fecha). */
export function usePartidosTorneo() {
  return useQuery({
    queryKey: ["partidos-torneo"],
    queryFn: async (): Promise<Partido[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tblPartidos")
        .select(SELECT_PARTIDOS)
        .order("fecha_hora", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapPartidoRow);
    },
    staleTime: 5 * 60_000,
  });
}
