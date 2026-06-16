"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { reglasSchema, type ReglasInput } from "@/lib/schemas/reglas";
import { datosGrupoSchema, type DatosGrupoInput } from "@/lib/schemas/grupo";

type Resultado = { ok: true } | { ok: false; error: string };

/**
 * Actualiza el nombre y la descripción de una polla. Solo el creador puede
 * hacerlo: se valida en el servidor además de la RLS (`grupos_update` exige
 * `creador_id = auth.uid()`). La validación de formato reusa `datosGrupoSchema`.
 */
export async function actualizarGrupo(
  grupoId: string,
  input: DatosGrupoInput,
): Promise<Resultado> {
  const parsed = datosGrupoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa el nombre y la descripción." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  // Defensa en profundidad sobre la RLS: solo el creador edita la metadata.
  const { data: grupo } = await supabase
    .from("tblGrupos")
    .select("creador_id")
    .eq("id", grupoId)
    .maybeSingle();
  if (grupo?.creador_id !== user.id) {
    return { ok: false, error: "Solo quien creó la polla puede editar sus datos." };
  }

  // Descripción vacía se guarda como NULL (no como cadena en blanco).
  const descripcion = parsed.data.descripcion?.trim() || null;

  const { error } = await supabase
    .from("tblGrupos")
    .update({ nombre: parsed.data.nombre, descripcion })
    .eq("id", grupoId);
  if (error) {
    return { ok: false, error: "No se pudieron guardar los cambios." };
  }

  revalidatePath(`/grupos/${grupoId}`);
  revalidatePath(`/grupos/${grupoId}/configurar`);
  return { ok: true };
}

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

  // Verificación explícita (defensa en profundidad sobre la RLS): puede editar
  // el admin del grupo O el superadmin de plataforma (que puede no ser miembro,
  // así que no tendría fila en tblParticipantes). La RLS `reglas_update` ya es
  // superadmin-aware vía `es_admin_grupo` (migración 0020).
  const [{ data: part }, { data: esSuperadmin }] = await Promise.all([
    supabase
      .from("tblParticipantes")
      .select("rol")
      .eq("grupo_id", grupoId)
      .eq("usuario_id", user.id)
      .maybeSingle(),
    supabase.rpc("es_superadmin"),
  ]);
  if (part?.rol !== "admin" && esSuperadmin !== true) {
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
