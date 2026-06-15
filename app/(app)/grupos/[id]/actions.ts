"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Resultado = { ok: true } | { ok: false; error: string };

/**
 * Elimina (o elimina + banea) a un participante de la polla. Solo el admin del
 * grupo puede hacerlo: la validación dura vive en el RPC `gestionar_participante`
 * (SECURITY DEFINER), que además impide eliminarse a sí mismo o a otro admin.
 *
 * Es un BORRADO SUAVE (papelera): marca `eliminado_en` en vez de borrar. El
 * usuario deja de ver la polla y no sale en la tabla, pero sus predicciones y
 * puntos se conservan; si vuelve a unirse con el código se reactiva y los
 * recupera. Si `banear` es true, no podrá volver a unirse (queda bloqueado).
 */
export async function gestionarParticipante(
  grupoId: string,
  participanteId: string,
  banear: boolean,
): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  const { error } = await supabase.rpc("gestionar_participante", {
    p_participante_id: participanteId,
    p_banear: banear,
  });
  if (error) {
    return { ok: false, error: "No se pudo completar la acción." };
  }

  revalidatePath(`/grupos/${grupoId}`);
  return { ok: true };
}

/**
 * Revierte el baneo de un usuario en un grupo. Tras desbanear, el usuario podrá
 * volver a unirse con el código. Solo el admin del grupo puede hacerlo.
 */
export async function desbanearParticipante(
  grupoId: string,
  usuarioId: string,
): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  const { error } = await supabase.rpc("desbanear_participante", {
    p_grupo_id: grupoId,
    p_usuario_id: usuarioId,
  });
  if (error) {
    return { ok: false, error: "No se pudo desbanear al usuario." };
  }

  revalidatePath(`/grupos/${grupoId}`);
  return { ok: true };
}

/**
 * Elimina una polla completa. Acción IRREVERSIBLE: borra reglas, participantes,
 * predicciones, puntos, baneados y abonos del grupo (cascade). Solo el CREADOR
 * puede hacerlo: la validación dura vive en el RPC `eliminar_grupo`.
 *
 * Tras eliminar, el grupo deja de existir, así que se revalida el dashboard
 * (no la ruta del grupo) y el llamador debe navegar fuera de `/grupos/${id}`.
 */
export async function eliminarGrupo(grupoId: string): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  const { error } = await supabase.rpc("eliminar_grupo", {
    p_grupo_id: grupoId,
  });
  if (error) {
    return { ok: false, error: "No se pudo eliminar la polla." };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Registra un abono (pago parcial) de un participante. Solo el admin del grupo
 * (o superadmin) puede hacerlo: la validación dura — permiso, monto > 0, y que
 * el total no supere el valor de la apuesta — vive en el RPC `registrar_abono`.
 */
export async function registrarAbono(
  grupoId: string,
  participanteId: string,
  monto: number,
  nota: string,
): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  const { error } = await supabase.rpc("registrar_abono", {
    p_participante_id: participanteId,
    p_monto: monto,
    p_nota: nota,
  });
  if (error) {
    const msg = /excede/i.test(error.message)
      ? "El abono supera el saldo pendiente."
      : "No se pudo registrar el pago.";
    return { ok: false, error: msg };
  }

  revalidatePath(`/grupos/${grupoId}`);
  return { ok: true };
}

/**
 * Ajusta el puntaje de arranque de un participante: lo que ya traía cuando la
 * polla se manejaba por fuera (Excel u otra app) antes de migrar a mitad de
 * torneo. Se suma a los puntos ganados dentro de la app (ver `vwTablaPosiciones`).
 *
 * Solo el admin del grupo puede hacerlo: el permiso y el rechazo de puntajes
 * negativos viven en el RPC `actualizar_puntos_iniciales` (SECURITY DEFINER).
 */
export async function actualizarPuntajeInicial(
  grupoId: string,
  participanteId: string,
  puntos: number,
): Promise<Resultado> {
  if (!Number.isInteger(puntos) || puntos < 0) {
    return { ok: false, error: "El puntaje inicial debe ser un entero ≥ 0." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  const { error } = await supabase.rpc("actualizar_puntos_iniciales", {
    p_participante_id: participanteId,
    p_puntos: puntos,
  });
  if (error) {
    return { ok: false, error: "No se pudo guardar el puntaje inicial." };
  }

  revalidatePath(`/grupos/${grupoId}`);
  return { ok: true };
}

/**
 * Elimina un abono registrado por error. Recalcula el saldo y el estado de pago.
 * Solo el admin del grupo (o superadmin), validado en el RPC `eliminar_abono`.
 */
export async function eliminarAbono(
  grupoId: string,
  abonoId: string,
): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  const { error } = await supabase.rpc("eliminar_abono", {
    p_abono_id: abonoId,
  });
  if (error) {
    return { ok: false, error: "No se pudo eliminar el abono." };
  }

  revalidatePath(`/grupos/${grupoId}`);
  return { ok: true };
}
