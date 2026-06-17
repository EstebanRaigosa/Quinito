"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esSuperAdmin } from "@/lib/auth/superadmin";

const schema = z
  .object({
    partidoId: z.string().uuid(),
    golesLocal: z.coerce.number().int().min(0).max(99),
    golesVisitante: z.coerce.number().int().min(0).max(99),
    // Desempate de un cruce empatado a los 90' (no cambia la puntuación). Se
    // envía la tanda de penales O el marcador del tiempo extra, según el caso.
    penalesLocal: z.coerce.number().int().min(0).max(99).optional(),
    penalesVisitante: z.coerce.number().int().min(0).max(99).optional(),
    prorrogaLocal: z.coerce.number().int().min(0).max(99).optional(),
    prorrogaVisitante: z.coerce.number().int().min(0).max(99).optional(),
  })
  .refine(
    (d) =>
      (d.penalesLocal === undefined) === (d.penalesVisitante === undefined),
    { message: "Penales incompletos" },
  )
  .refine(
    (d) =>
      d.penalesLocal === undefined ||
      (d.golesLocal === d.golesVisitante &&
        d.penalesLocal !== d.penalesVisitante),
    { message: "Los penales solo aplican a un empate y no pueden quedar iguales" },
  );

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
    p_penales_local: parsed.data.penalesLocal ?? undefined,
    p_penales_visitante: parsed.data.penalesVisitante ?? undefined,
    p_prorroga_local: parsed.data.prorrogaLocal ?? undefined,
    p_prorroga_visitante: parsed.data.prorrogaVisitante ?? undefined,
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
  // 3° opcional: necesario para los "mejores terceros". Si se envía, se fija
  // también la posición 3 del grupo (override del 3° cuando hay empate interno).
  terceroId: z.string().uuid().optional(),
});

export type ClasificacionInput = z.infer<typeof schemaClasificacion>;

/**
 * Selección manual de los clasificados (1°, 2° y opcionalmente 3°) de un grupo.
 * Tiene prioridad sobre el cálculo automático; se usa cuando el desempate no se
 * resuelve solo (empate total) o para corregir. Tras guardar, se recalculan los
 * cruces. Defensa en profundidad: la sesión debe ser super-admin.
 */
export async function guardarClasificacion(
  input: ClasificacionInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schemaClasificacion.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const { torneoId, grupo, primeroId, segundoId, terceroId } = parsed.data;

  // Los puestos elegidos deben ser equipos distintos entre sí.
  const elegidos = [primeroId, segundoId, ...(terceroId ? [terceroId] : [])];
  if (new Set(elegidos).size !== elegidos.length) {
    return { ok: false, error: "El 1°, 2° y 3° deben ser equipos distintos" };
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

  const filas = [
    { torneo_id: torneoId, grupo, posicion: 1, equipo_id: primeroId, asignado_por: user.id },
    { torneo_id: torneoId, grupo, posicion: 2, equipo_id: segundoId, asignado_por: user.id },
    ...(terceroId
      ? [{ torneo_id: torneoId, grupo, posicion: 3, equipo_id: terceroId, asignado_por: user.id }]
      : []),
  ];
  const { error: errIns } = await admin
    .from("tblClasificacionGrupo")
    .insert(filas);
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

const schemaMejoresTerceros = z.object({
  torneoId: z.string().uuid(),
  // Hasta 8 grupos (letras A–L) cuyos terceros clasifican al bracket. Se permite
  // una selección parcial (cupos en "Ninguno"): con menos de 8 grupos el bracket
  // deja los cruces con tercero por definir (lo decide `mejores_terceros` en SQL).
  grupos: z
    .array(z.string().regex(/^[A-L]$/))
    .max(8)
    .refine((g) => new Set(g).size === g.length, "Grupos repetidos"),
});

export type MejoresTercerosInput = z.infer<typeof schemaMejoresTerceros>;

/**
 * Selección manual de los 8 mejores terceros (qué grupos clasifican al bracket).
 * Tiene prioridad sobre el cálculo automático; se usa cuando el corte entre el
 * 8° y 9° tercero queda en empate que no se resuelve por puntos/dg/gf. El
 * bracket solo depende del CONJUNTO de 8 grupos. Tras guardar, recalcula cruces.
 */
export async function guardarMejoresTerceros(
  input: MejoresTercerosInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schemaMejoresTerceros.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const { torneoId, grupos } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esSuperAdmin(user.email)) {
    return { ok: false, error: "No autorizado" };
  }

  const admin = createAdminClient();
  // Reemplazo total de la selección manual de terceros del torneo.
  const { error: errDel } = await admin
    .from("tblTercerosClasificados")
    .delete()
    .eq("torneo_id", torneoId);
  if (errDel) return { ok: false, error: errDel.message };

  const { error: errIns } = await admin
    .from("tblTercerosClasificados")
    .insert(
      grupos.map((grupo) => ({
        torneo_id: torneoId,
        grupo,
        asignado_por: user.id,
      })),
    );
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

const schemaLimpiarTerceros = z.object({ torneoId: z.string().uuid() });

export type LimpiarTercerosInput = z.infer<typeof schemaLimpiarTerceros>;

/**
 * Quita la selección manual de mejores terceros: vuelve al cálculo automático.
 * Tras quitarla, se recalculan los cruces.
 */
export async function limpiarMejoresTerceros(
  input: LimpiarTercerosInput,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = schemaLimpiarTerceros.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos inválidos" };
  const { torneoId } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esSuperAdmin(user.email)) {
    return { ok: false, error: "No autorizado" };
  }

  const admin = createAdminClient();
  const { error: errDel } = await admin
    .from("tblTercerosClasificados")
    .delete()
    .eq("torneo_id", torneoId);
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
