// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Edge Function: enviar-notificacion                                        ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// La invoca la server action del centro de notificaciones tras crear una
// notificación (`crear_notificacion`). Recibe { notificacion_id } y hace el
// fan-out del push del sistema a los dispositivos de todos sus destinatarios.
//
// El estado de leído/no-leído de la bandeja in-app vive en la BD; aquí solo
// mandamos el push del sistema (que NO es HTML: título, cuerpo, ícono, y en
// Android imagen + botón). Marca total_push_enviados y borra suscripciones
// muertas (404/410).

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Suscripcion = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:soporte@pollota.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

Deno.serve(async (req) => {
  let notificacionId: string | undefined;
  try {
    const body = await req.json();
    notificacionId = body?.notificacion_id;
  } catch {
    // body inválido
  }
  if (!notificacionId) {
    return new Response(JSON.stringify({ ok: false, error: "falta notificacion_id" }), {
      status: 400,
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // 1. La notificación a enviar.
  const { data: notif, error: errNotif } = await supabase
    .from("tblNotificaciones")
    .select("id, titulo, cuerpo, url, imagen_url, accion_label")
    .eq("id", notificacionId)
    .maybeSingle();
  if (errNotif || !notif) {
    return new Response(JSON.stringify({ ok: false, error: "no existe" }), { status: 404 });
  }

  // 2. Suscripciones de TODOS los destinatarios (join en una sola consulta).
  const { data: destinatarios } = await supabase
    .from("tblNotificacionesDestinatarios")
    .select("usuario_id")
    .eq("notificacion_id", notificacionId);

  const usuarioIds = [...new Set((destinatarios ?? []).map((d) => d.usuario_id))];
  if (usuarioIds.length === 0) {
    await supabase
      .from("tblNotificaciones")
      .update({ enviada_en: new Date().toISOString(), total_push_enviados: 0 })
      .eq("id", notificacionId);
    return new Response(JSON.stringify({ ok: true, enviados: 0, limpiadas: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: subs } = await supabase
    .from("tblPushSuscripciones")
    .select("id, endpoint, p256dh, auth")
    .in("usuario_id", usuarioIds);

  const dispositivos = (subs ?? []) as Suscripcion[];

  const payload = JSON.stringify({
    titulo: notif.titulo,
    cuerpo: notif.cuerpo,
    url: notif.url ?? "/",
    imagen: notif.imagen_url ?? undefined,
    accion: notif.accion_label ?? undefined,
    tag: `notif-${notif.id}`,
  });

  let enviados = 0;
  let limpiadas = 0;

  for (const s of dispositivos) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        // `urgency: high` evita que Android (Doze) retenga el push hasta que el
        // usuario desbloquee. `TTL` en segundos = 24h: una notificación del
        // admin conserva valor un buen rato (no caduca con el cierre de un
        // partido), pero no debe quedar colgada para siempre.
        { urgency: "high", TTL: 86400 },
      );
      enviados++;
      await supabase
        .from("tblPushSuscripciones")
        .update({ usado_en: new Date().toISOString() })
        .eq("id", s.id);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await supabase.from("tblPushSuscripciones").delete().eq("id", s.id);
        limpiadas++;
      } else {
        console.error("Envío falló:", status, (err as Error).message);
      }
    }
  }

  await supabase
    .from("tblNotificaciones")
    .update({ enviada_en: new Date().toISOString(), total_push_enviados: enviados })
    .eq("id", notificacionId);

  return new Response(
    JSON.stringify({ ok: true, destinatarios: usuarioIds.length, enviados, limpiadas }),
    { headers: { "Content-Type": "application/json" } },
  );
});
