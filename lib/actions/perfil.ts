"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { nombrePerfilSchema } from "@/lib/schemas/perfil";

export type ResultadoNombre =
  | { ok: true; nombre: string }
  | { ok: false; error: string };

/**
 * Guarda el nombre visible del usuario y marca `nombre_confirmado = true` (con
 * lo que deja de aparecer el modal de onboarding). La RLS de `tblProfiles`
 * (`profiles_update`: id = auth.uid()) garantiza que solo edita su propio
 * registro. Se valida con Zod en servidor además de en el cliente (UX).
 */
export async function guardarNombrePerfil(
  input: { nombre_completo: string },
): Promise<ResultadoNombre> {
  const parsed = nombrePerfilSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Nombre no válido",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Vuelve a entrar." };

  const { error } = await supabase
    .from("tblProfiles")
    .update({
      nombre_completo: parsed.data.nombre_completo,
      nombre_confirmado: true,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: "No se pudo guardar. Intenta de nuevo." };
  }

  // Refresca el shell (sidebar/top bar) y las vistas que muestran el nombre.
  revalidatePath("/", "layout");
  return { ok: true, nombre: parsed.data.nombre_completo };
}
