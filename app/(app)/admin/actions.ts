"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esSuperAdmin } from "@/lib/auth/superadmin";

const schema = z.object({
  partidoId: z.string().uuid(),
  golesLocal: z.coerce.number().int().min(0).max(99),
  golesVisitante: z.coerce.number().int().min(0).max(99),
});

export type ResultadoInput = z.input<typeof schema>;

/**
 * Registra el marcador real de un partido y dispara el recálculo de puntos
 * (RPC `finalizar_partido`). Doble verificación: la sesión debe ser un
 * super-admin de plataforma. La RPC se ejecuta con `service_role`.
 */
export async function registrarResultado(
  input: ResultadoInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  // Autorización (defensa en profundidad): sesión real + super-admin.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esSuperAdmin(user.email)) {
    return { ok: false, error: "No autorizado" };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("finalizar_partido", {
    p_partido_id: parsed.data.partidoId,
    p_goles_local: parsed.data.golesLocal,
    p_goles_visitante: parsed.data.golesVisitante,
  });
  if (error) return { ok: false, error: error.message };

  // Refresca vistas afectadas (catálogo de partidos y panel).
  revalidatePath("/admin");
  revalidatePath("/partidos");
  return { ok: true };
}

const schemaLimpiar = z.object({ partidoId: z.string().uuid() });

export type LimpiarInput = z.infer<typeof schemaLimpiar>;

/**
 * Elimina el marcador real registrado de un partido y dispara el recálculo
 * inverso (RPC `revertir_partido`): el partido vuelve a "programado" y todas
 * las predicciones que lo apostaban regresan a 0 puntos. Misma defensa en
 * profundidad que `registrarResultado`: la sesión debe ser super-admin.
 */
export async function limpiarResultado(
  input: LimpiarInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schemaLimpiar.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esSuperAdmin(user.email)) {
    return { ok: false, error: "No autorizado" };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("revertir_partido", {
    p_partido_id: parsed.data.partidoId,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  revalidatePath("/partidos");
  return { ok: true };
}

const schemaClasificacion = z.object({
  torneoId: z.string().uuid(),
  grupo: z.string().min(1).max(4),
  primeroId: z.string().uuid(),
  segundoId: z.string().uuid(),
});

export type ClasificacionInput = z.infer<typeof schemaClasificacion>;

/**
 * Selección manual de los clasificados (1° y 2°) de un grupo. Tiene prioridad
 * sobre el cálculo automático; se usa cuando el desempate no se resuelve solo
 * (empate total) o para corregir. Tras guardar, se recalculan los cruces.
 * Defensa en profundidad: la sesión debe ser super-admin.
 */
export async function guardarClasificacion(
  input: ClasificacionInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schemaClasificacion.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const { torneoId, grupo, primeroId, segundoId } = parsed.data;
  if (primeroId === segundoId) {
    return { ok: false, error: "El 1° y el 2° deben ser equipos distintos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esSuperAdmin(user.email)) {
    return { ok: false, error: "No autorizado" };
  }

  const admin = createAdminClient();
  // Reemplazo total de la clasificación manual del grupo.
  const { error: errDel } = await admin
    .from("tblClasificacionGrupo")
    .delete()
    .eq("torneo_id", torneoId)
    .eq("grupo", grupo);
  if (errDel) return { ok: false, error: errDel.message };

  const { error: errIns } = await admin.from("tblClasificacionGrupo").insert([
    { torneo_id: torneoId, grupo, posicion: 1, equipo_id: primeroId, asignado_por: user.id },
    { torneo_id: torneoId, grupo, posicion: 2, equipo_id: segundoId, asignado_por: user.id },
  ]);
  if (errIns) return { ok: false, error: errIns.message };

  const { error: errRes } = await admin.rpc("resolver_cruces", {
    p_torneo_id: torneoId,
  });
  if (errRes) return { ok: false, error: errRes.message };

  revalidatePath("/admin/clasificacion");
  revalidatePath("/admin");
  revalidatePath("/partidos");
  return { ok: true };
}

const schemaLimpiarClas = z.object({
  torneoId: z.string().uuid(),
  grupo: z.string().min(1).max(4),
});

export type LimpiarClasificacionInput = z.infer<typeof schemaLimpiarClas>;

/**
 * Quita la selección manual de un grupo: vuelve al cálculo automático de
 * posiciones. Tras quitarla, se recalculan los cruces.
 */
export async function limpiarClasificacion(
  input: LimpiarClasificacionInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schemaLimpiarClas.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const { torneoId, grupo } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esSuperAdmin(user.email)) {
    return { ok: false, error: "No autorizado" };
  }

  const admin = createAdminClient();
  const { error: errDel } = await admin
    .from("tblClasificacionGrupo")
    .delete()
    .eq("torneo_id", torneoId)
    .eq("grupo", grupo);
  if (errDel) return { ok: false, error: errDel.message };

  const { error: errRes } = await admin.rpc("resolver_cruces", {
    p_torneo_id: torneoId,
  });
  if (errRes) return { ok: false, error: errRes.message };

  revalidatePath("/admin/clasificacion");
  revalidatePath("/admin");
  revalidatePath("/partidos");
  return { ok: true };
}
