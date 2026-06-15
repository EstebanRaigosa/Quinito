"use server";

import { createClient } from "@/lib/supabase/server";

type Resultado = { ok: true } | { ok: false; error: string };

/** Datos de una suscripción Web Push tal como los entrega el navegador. */
export type DatosSuscripcion = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
};

/**
 * Guarda (o actualiza) la suscripción push del navegador actual para el usuario
 * autenticado. Idempotente por `endpoint`: si el mismo navegador re-suscribe,
 * se actualizan las claves en vez de duplicar.
 *
 * La RLS de `tblPushSuscripciones` garantiza que un usuario solo puede escribir
 * filas con su propio `usuario_id`; aquí lo fijamos explícitamente.
 */
export async function guardarSuscripcion(
  datos: DatosSuscripcion,
): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  const { error } = await supabase
    .from("tblPushSuscripciones")
    .upsert(
      {
        usuario_id: user.id,
        endpoint: datos.endpoint,
        p256dh: datos.p256dh,
        auth: datos.auth,
        user_agent: datos.userAgent ?? null,
      },
      { onConflict: "endpoint" },
    );

  if (error) {
    return { ok: false, error: "No se pudo activar las notificaciones." };
  }
  return { ok: true };
}

/**
 * Elimina la suscripción de ESTE navegador (por endpoint). Se llama tras hacer
 * `unsubscribe()` en el cliente para no dejar suscripciones muertas en la BD.
 */
export async function eliminarSuscripcion(endpoint: string): Promise<Resultado> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Inicia de nuevo." };

  const { error } = await supabase
    .from("tblPushSuscripciones")
    .delete()
    .eq("endpoint", endpoint);

  if (error) {
    return { ok: false, error: "No se pudo desactivar las notificaciones." };
  }
  return { ok: true };
}
