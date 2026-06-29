"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esSuperAdmin } from "@/lib/auth/superadmin";

/** Visibilidad de un torneo en el wizard de creación de pollas. */
export type VisibilidadTorneo = "disponible" | "pruebas" | "oculto";

/** Mapa visibilidad → par de flags de la tabla. Invariante: nunca ambos true. */
const FLAGS: Record<VisibilidadTorneo, { activo: boolean; es_prueba: boolean }> = {
  disponible: { activo: true, es_prueba: false }, // lo ven todos
  pruebas: { activo: false, es_prueba: true }, // solo el superadmin
  oculto: { activo: false, es_prueba: false }, // nadie
};

const schema = z.object({
  torneoId: z.string().uuid(),
  visibilidad: z.enum(["disponible", "pruebas", "oculto"]),
});

export type VisibilidadInput = z.infer<typeof schema>;

/**
 * Cambia la visibilidad de un torneo en el wizard de creación de pollas:
 *   • "disponible" → lo ven todos los usuarios.
 *   • "pruebas"    → solo el superadmin, con etiqueta "Pruebas".
 *   • "oculto"     → no lo ve nadie.
 * Traduce el estado al par (activo, es_prueba) que consulta `torneos_disponibles`
 * (ver 0084). La escritura sobre el catálogo es `service_role` (CLAUDE.md §5), por
 * eso se usa el admin client. Defensa en profundidad: la sesión debe ser
 * super-admin.
 */
export async function cambiarVisibilidadTorneo(
  input: VisibilidadInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esSuperAdmin(user.email)) {
    return { ok: false, error: "No autorizado" };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("tblTorneos")
    .update(FLAGS[parsed.data.visibilidad])
    .eq("id", parsed.data.torneoId);
  if (error) return { ok: false, error: error.message };

  // Refresca el panel admin. El wizard (cliente, TanStack) se actualiza al
  // expirar su staleTime o al recargar; aquí no hay cache de RSC que invalidar.
  revalidatePath("/admin/torneos");
  return { ok: true };
}
