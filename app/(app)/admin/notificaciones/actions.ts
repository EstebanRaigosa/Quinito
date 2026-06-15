"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { notificacionSchema, type NotificacionInput } from "@/lib/schemas/notificacion";

type Resultado =
  | { ok: true; destinatarios: number; pushEnviados: number }
  | { ok: false; error: string };

/**
 * Crea una notificación y la envía. Dos capas:
 *   1. `crear_notificacion` (RPC SECURITY DEFINER) valida superadmin, inserta y
 *      hace el fan-out a la bandeja in-app de cada destinatario.
 *   2. La Edge Function `enviar-notificacion` manda el push del sistema.
 *
 * La bandeja in-app queda lista aunque el push falle (no todos tienen push).
 */
export async function enviarNotificacion(input: NotificacionInput): Promise<Resultado> {
  const parsed = notificacionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esSuperAdmin(user.email)) {
    return { ok: false, error: "No autorizado" };
  }

  const { data: notifId, error } = await supabase.rpc("crear_notificacion", {
    p_titulo: d.titulo,
    p_cuerpo: d.cuerpo,
    p_url: d.url || "",
    p_imagen_url: d.imagen_url || "",
    p_accion_label: d.accion_label || "",
    p_audiencia_tipo: d.audiencia_tipo,
    // El generador de tipos marca estos uuid como `string` no-nullable, pero la
    // función SQL los acepta `null` cuando la audiencia no los usa.
    p_grupo_id: (d.audiencia_tipo === "polla"
      ? d.grupo_id
      : null) as unknown as string,
    p_usuario_id: (d.audiencia_tipo === "usuario"
      ? d.usuario_id
      : null) as unknown as string,
  });
  if (error || !notifId) {
    return { ok: false, error: "No se pudo crear la notificación." };
  }

  // Contar destinatarios (la bandeja ya quedó poblada por el RPC).
  const { data: notif } = await supabase
    .from("tblNotificaciones")
    .select("total_destinatarios")
    .eq("id", notifId)
    .maybeSingle();
  const destinatarios = notif?.total_destinatarios ?? 0;

  // Disparar el push (best-effort: no bloquea el éxito de la bandeja).
  let pushEnviados = 0;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const res = await fetch(`${url}/functions/v1/enviar-notificacion`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ notificacion_id: notifId }),
    });
    if (res.ok) {
      const j = (await res.json()) as { enviados?: number };
      pushEnviados = j.enviados ?? 0;
    }
  } catch {
    // El push falló pero la notificación ya está en la bandeja de todos.
  }

  revalidatePath("/admin/notificaciones");
  return { ok: true, destinatarios, pushEnviados };
}

/** Busca usuarios por nombre o email para el selector de audiencia. */
export async function buscarUsuarios(
  q: string,
): Promise<{ id: string; nombre: string | null; email: string }[]> {
  const termino = q.trim();
  if (termino.length < 2) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !esSuperAdmin(user.email)) return [];

  const { data, error } = await supabase.rpc("superadmin_buscar_usuarios", {
    p_q: termino,
  });
  if (error || !data) return [];
  return data.map((u) => ({ id: u.id, nombre: u.nombre, email: u.email }));
}
