import { createClient } from "@/lib/supabase/client";

export type GrupoPreview = {
  id: string;
  nombre: string;
  descripcion: string | null;
  total_participantes: number;
  valor_apuesta: number;
  ya_es_miembro: boolean;
};

/** Busca un grupo por código de invitación (vía RPC `buscar_grupo`). */
export async function buscarGrupo(codigo: string): Promise<GrupoPreview | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("buscar_grupo", {
    p_codigo: codigo,
  });
  if (error || !data || data.length === 0) return null;
  const g = data[0];
  return {
    id: g.id,
    nombre: g.nombre,
    descripcion: g.descripcion,
    total_participantes: Number(g.total_participantes ?? 0),
    valor_apuesta: Number(g.valor_apuesta ?? 0),
    ya_es_miembro: g.ya_es_miembro,
  };
}

/**
 * Inscribe al usuario actual en el grupo como jugador. Vía RPC `unirse_grupo`
 * (security definer), que ADEMÁS reactiva al usuario si había sido eliminado
 * con borrado suave: recupera su historial (predicciones y puntos) en vez de
 * crear una fila nueva. Un usuario baneado es rechazado por el RPC.
 */
export async function unirseAGrupo(
  grupoId: string,
): Promise<{ ok: boolean; yaEra?: boolean }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.rpc("unirse_grupo", { p_grupo_id: grupoId });
  if (error) return { ok: false };
  return { ok: true };
}
