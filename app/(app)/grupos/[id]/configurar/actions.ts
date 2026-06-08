"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reglasSchema, type ReglasInput } from "@/lib/schemas/reglas";

type Resultado = { ok: true } | { ok: false; error: string };

/**
 * Actualiza las reglas (puntajes, bonos, pozo, premios y cierre) de una polla.
 * Solo el admin del grupo puede hacerlo: se valida en el servidor además de la
 * RLS (`reglas_update` usa `es_admin_grupo`). La validación de negocio (premios
 * = 100%, enteros no negativos) reusa `reglasSchema`.
 */
export async function actualizarReglas(
  grupoId: string,
  input: ReglasInput,
): Promise<Resultado> {
  const parsed = reglasSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Hay valores inválidos en la configuración." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  // Verificación explícita de admin (defensa en profundidad sobre la RLS).
  const { data: part } = await supabase
    .from("tblParticipantes")
    .select("rol")
    .eq("grupo_id", grupoId)
    .eq("usuario_id", user.id)
    .maybeSingle();
  if (part?.rol !== "admin") {
    return { ok: false, error: "Solo el administrador puede editar las reglas." };
  }

  const { error } = await supabase
    .from("tblReglasGrupo")
    .update(parsed.data)
    .eq("grupo_id", grupoId);
  if (error) {
    return { ok: false, error: "No se pudieron guardar los cambios." };
  }

  revalidatePath(`/grupos/${grupoId}`);
  return { ok: true };
}
