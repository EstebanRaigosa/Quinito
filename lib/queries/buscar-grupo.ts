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

/** Inscribe al usuario actual en el grupo como jugador. */
export async function unirseAGrupo(
  grupoId: string,
): Promise<{ ok: boolean; yaEra?: boolean }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase.from("tblParticipantes").insert({
    grupo_id: grupoId,
    usuario_id: user.id,
    rol: "jugador",
  });
  if (error) {
    // 23505 = unique_violation → ya era miembro, lo tratamos como éxito.
    if (error.code === "23505") return { ok: true, yaEra: true };
    return { ok: false };
  }
  return { ok: true };
}
