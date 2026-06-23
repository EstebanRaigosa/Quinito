import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Abono } from "@/lib/types/dominio";

/**
 * Total abonado por cada participante del grupo, indexado por participante_id.
 *
 * Lee del RPC `pagos_grupo` (SECURITY DEFINER), que solo devuelve filas si quien
 * consulta es admin del grupo o superadmin → la privacidad de los montos queda
 * garantizada en el servidor (CLAUDE.md §3.4). No tocar grupo_detalle.
 */
export function usePagosGrupo(grupoId: string, habilitado: boolean) {
  return useQuery({
    queryKey: ["pagos-grupo", grupoId],
    enabled: habilitado,
    queryFn: async (): Promise<Map<string, number>> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("pagos_grupo", {
        p_grupo_id: grupoId,
      });
      if (error) throw error;
      const mapa = new Map<string, number>();
      for (const fila of data ?? []) {
        mapa.set(fila.participante_id, Number(fila.total_abonado ?? 0));
      }
      return mapa;
    },
    staleTime: 60_000,
  });
}

/**
 * Historial de abonos de un participante (lazy: solo al abrir el diálogo).
 * Lee del RPC `listar_abonos`, con el mismo guard de admin/superadmin.
 */
export function useAbonosParticipante(
  participanteId: string | null,
  habilitado: boolean,
) {
  return useQuery({
    queryKey: ["abonos-participante", participanteId],
    enabled: habilitado && !!participanteId,
    queryFn: async (): Promise<Abono[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("listar_abonos", {
        p_participante_id: participanteId!,
      });
      if (error) throw error;
      return (data ?? []).map((a) => ({
        id: a.id,
        monto: Number(a.monto ?? 0),
        nota: a.nota,
        creado_en: a.creado_en,
        registrado_por_nombre: a.registrado_por_nombre,
        codigo: a.codigo,
      }));
    },
    staleTime: 60_000,
  });
}
