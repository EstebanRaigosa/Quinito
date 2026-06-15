// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Edge Function: enviar-recordatorios                                       ║
// ╚══════════════════════════════════════════════════════════════════════════╝
// La dispara pg_cron cada pocos minutos. Pasos:
//   1. Pregunta a la BD (RPC `recordatorios_pendientes`) a quién avisar.
//   2. Por cada usuario, lee sus suscripciones push y envía el aviso (web-push).
//   3. Marca el recordatorio como enviado (idempotencia) y borra suscripciones
//      muertas (el push service responde 404/410).
//
// PRIVACIDAD (CLAUDE.md §3.4): el payload solo nombra el partido, nunca
// predicciones. Usa la service_role (server-side) — jamás se expone al cliente.

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Pendiente = {
  usuario_id: string;
  partido_id: string;
  equipo_local: string;
  equipo_visitante: string;
  local_iso: string | null;
  visitante_iso: string | null;
  cierre: string;
};

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

/** Texto del aviso. Genérico por privacidad: solo el partido. */
function construirPayload(p: Pendiente): string {
  // Ícono "vs" con las dos banderas (lo genera la ruta /api/notif-vs). Solo si
  // hay ambos ISO; si falta alguno, el SW cae al ícono de la app. Path relativo:
  // el Service Worker lo resuelve contra el origen del sitio.
  const icono =
    p.local_iso && p.visitante_iso
      ? `/api/notif-vs?l=${encodeURIComponent(p.local_iso)}&v=${encodeURIComponent(p.visitante_iso)}`
      : undefined;

  return JSON.stringify({
    titulo: "⏰ ¡No olvides tu predicción!",
    cuerpo: `Está por cerrar ${p.equipo_local} vs ${p.equipo_visitante}. Predice antes de que sea tarde.`,
    url: "/partidos",
    icono,
    tag: `cierre-${p.partido_id}`,
  });
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  });

  // 1. ¿A quién avisar ahora?
  const { data: pendientes, error } = await supabase.rpc(
    "recordatorios_pendientes",
  );
  if (error) {
    console.error("recordatorios_pendientes falló:", error.message);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }

  const lista = (pendientes ?? []) as Pendiente[];
  let enviados = 0;
  let limpiadas = 0;

  for (const p of lista) {
    // Suscripciones (dispositivos) de este usuario.
    const { data: subs } = await supabase
      .from("tblPushSuscripciones")
      .select("id, endpoint, p256dh, auth")
      .eq("usuario_id", p.usuario_id);

    const dispositivos = (subs ?? []) as Suscripcion[];
    if (dispositivos.length === 0) continue;

    const payload = construirPayload(p);
    let entregadoEnAlgunDispositivo = false;

    for (const s of dispositivos) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        entregadoEnAlgunDispositivo = true;
        await supabase
          .from("tblPushSuscripciones")
          .update({ usado_en: new Date().toISOString() })
          .eq("id", s.id);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        // 404/410 → la suscripción ya no existe en el push service: borrarla.
        if (status === 404 || status === 410) {
          await supabase.from("tblPushSuscripciones").delete().eq("id", s.id);
          limpiadas++;
        } else {
          console.error("Envío falló:", status, (err as Error).message);
        }
      }
    }

    // Marcar como enviado aunque solo entrara en un dispositivo: no repetir.
    if (entregadoEnAlgunDispositivo) {
      await supabase
        .from("tblPushRecordatorios")
        .upsert(
          { usuario_id: p.usuario_id, partido_id: p.partido_id },
          { onConflict: "usuario_id,partido_id" },
        );
      enviados++;
    }
  }

  return new Response(
    JSON.stringify({ ok: true, candidatos: lista.length, enviados, limpiadas }),
    { headers: { "Content-Type": "application/json" } },
  );
});
