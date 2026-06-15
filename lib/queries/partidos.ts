import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Partido } from "@/lib/types/dominio";
import { SELECT_PARTIDOS, mapPartidoRow } from "@/lib/queries/_partido-map";

/**
 * Catálogo de partidos de un torneo, ordenado por fecha. Requiere `torneoId`
 * (la app soporta varios torneos): sin él, la query queda deshabilitada para no
 * traer partidos de torneos mezclados.
 */
export function usePartidosTorneo(torneoId: string | null | undefined) {
  return useQuery({
    queryKey: ["partidos-torneo", torneoId],
    enabled: !!torneoId,
    queryFn: async (): Promise<Partido[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tblPartidos")
        .select(SELECT_PARTIDOS)
        .eq("torneo_id", torneoId!)
        .order("fecha_hora", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapPartidoRow);
    },
    staleTime: 5 * 60_000,
  });
}
