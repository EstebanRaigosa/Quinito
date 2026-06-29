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
  // Fecha del pago (ISO). Si se omite, el RPC usa `now()` (ver 0074). El cliente
  // solo la envía cuando el admin elige una fecha distinta a hoy.
  fechaISO?: string,
): Promise<{ ok: true; codigo: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  // El RPC devuelve el código del comprobante recién creado (ver 0072).
  const { data: codigo, error } = await supabase.rpc("registrar_abono", {
    p_participante_id: participanteId,
    p_monto: monto,
    p_nota: nota,
    ...(fechaISO ? { p_fecha: fechaISO } : {}),
  });
  if (error) {
    const msg = /excede/i.test(error.message)
      ? "El abono supera el saldo pendiente."
      : "No se pudo registrar el pago.";
    return { ok: false, error: msg };
  }

  revalidatePath(`/grupos/${grupoId}`);
  return { ok: true, codigo: codigo ?? "" };
}

/**
 * Arranque de un participante al migrar la polla a mitad de torneo: el puntaje y
 * los contadores de desempate que ya traía por fuera (Excel u otra app). Todo se
 * suma a lo jugado dentro de la app (ver `vwTablaPosiciones`).
 */
export type Arranque = {
  /** Puntaje acumulado de arranque. */
  puntos: number;
  /** Marcadores exactos acertados antes de migrar. */
  exactos: number;
  /** Predicciones únicas acertadas antes de migrar. */
  unicas: number;
  /** Otros aciertos (ganador/goles) antes de migrar. */
  aciertos: number;
};

/**
 * Ajusta el arranque de un participante: lo que ya traía cuando la polla se
 * manejaba por fuera (Excel u otra app) antes de migrar a mitad de torneo. Se
 * suma a lo ganado dentro de la app (ver `vwTablaPosiciones`).
 *
 * Solo el admin del grupo puede hacerlo: el permiso y el rechazo de valores
 * negativos viven en el RPC `actualizar_puntos_iniciales` (SECURITY DEFINER).
 */
export async function actualizarPuntajeInicial(
  grupoId: string,
  participanteId: string,
  arranque: Arranque,
): Promise<Resultado> {
  const { puntos, exactos, unicas, aciertos } = arranque;
  const valores = [puntos, exactos, unicas, aciertos];
  if (valores.some((v) => !Number.isInteger(v) || v < 0)) {
    return { ok: false, error: "Los valores de arranque deben ser enteros ≥ 0." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  const { error } = await supabase.rpc("actualizar_puntos_iniciales", {
    p_participante_id: participanteId,
    p_puntos: puntos,
    p_exactos: exactos,
    p_unicas: unicas,
    p_aciertos: aciertos,
  });
  if (error) {
    return { ok: false, error: "No se pudo guardar el arranque." };
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

/**
 * Marca como celebrados los bonos de fase pendientes del usuario en esta polla
 * (tras mostrarle la modal de celebración). Persiste en BD para que sea 1 vez
 * por usuario en todos sus dispositivos. Idempotente: si no hay pendientes, no
 * hace nada. La validación de membresía vive en el RPC `marcar_bonos_celebrados`.
 */
export async function marcarBonosCelebrados(
  grupoId: string,
): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  const { error } = await supabase.rpc("marcar_bonos_celebrados", {
    p_grupo_id: grupoId,
  });
  if (error) {
    return { ok: false, error: "No se pudo registrar la celebración." };
  }
  return { ok: true };
}
