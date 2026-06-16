import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * Conjunto de `usuario_id` del grupo que tienen notificaciones push activas, para
 * marcarlos en el panel de participantes.
 *
 * Lee del RPC `notificaciones_grupo` (SECURITY DEFINER), que solo devuelve filas
 * si quien consulta es admin del grupo o superadmin → la info queda restringida
 * en el servidor (CLAUDE.md §3.4). Devuelve solo el id (señal de "tiene notis"),
 * nunca endpoints ni claves push.
 */
export function useNotificacionesGrupo(grupoId: string, habilitado: boolean) {
  return useQuery({
    queryKey: ["notificaciones-grupo", grupoId],
    enabled: habilitado,
    queryFn: async (): Promise<Set<string>> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("notificaciones_grupo", {
        p_grupo_id: grupoId,
      });
      if (error) throw error;
      return new Set((data ?? []).map((f) => f.usuario_id));
    },
    staleTime: 60_000,
  });
}
