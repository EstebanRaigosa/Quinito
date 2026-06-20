import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BellRing, Bell, Globe, ShieldCheck, Smartphone, User, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { getTodasLasPollas, getUsuariosSuscritos } from "@/lib/queries/superadmin";
import { formatearFechaHoraBogota } from "@/lib/utils/fechas";
import { PageContainer } from "@/components/shared/PageContainer";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { Card } from "@/components/ui/card";
import { FormularioNotificacion } from "./FormularioNotificacion";

export const metadata: Metadata = {
  title: "Admin · Notificaciones",
};

const AUDIENCIA_META: Record<string, { etiqueta: string; icono: typeof Globe }> = {
  plataforma: { etiqueta: "Toda la plataforma", icono: Globe },
  polla: { etiqueta: "Una polla", icono: Users },
  usuario: { etiqueta: "Un usuario", icono: User },
};

export default async function AdminNotificacionesPage() {
  const supabase = await createClient();
  // Reusa la sesión ya validada por el layout (acierto de caché, sin round-trip).
  const user = await getUsuarioActual();
  if (!user) redirect("/login");
  if (!esSuperAdmin(user.email)) redirect("/dashboard");

  const [pollas, suscritos, { data: historial }] = await Promise.all([
    getTodasLasPollas(),
    getUsuariosSuscritos(),
    supabase
      .from("tblNotificaciones")
      .select(
        "id, titulo, cuerpo, audiencia_tipo, total_destinatarios, total_push_enviados, creada_en",
      )
      .order("creada_en", { ascending: false })
      .limit(20),
  ]);

  const totalDispositivos = suscritos.reduce((n, u) => n + u.dispositivos, 0);

  return (
    <PageContainer ancho="ancho" className="space-y-7">
      <header className="animate-fade-up">
        <p className="overline flex items-center gap-2 text-primary">
          <ShieldCheck className="size-4" /> Admin de plataforma
        </p>
        <h1 className="t-display mt-1.5">Centro de notificaciones</h1>
        <p className="t-body-sm mt-1.5 text-fg-muted">
          Redacta y envía una notificación push a toda la plataforma, a una polla o
          a una persona. También queda en su bandeja dentro de la app.
        </p>
      </header>

      <FormularioNotificacion
        pollas={pollas.map((p) => ({ id: p.id, nombre: p.nombre }))}
      />

      {/* ── Suscritos a notificaciones ──────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="t-h4 flex items-center gap-2">
            <BellRing className="size-4 text-primary" /> Con notificaciones activas
          </h2>
          <span className="t-caption shrink-0 font-bold text-fg-muted">
            {suscritos.length} {suscritos.length === 1 ? "persona" : "personas"} ·{" "}
            {totalDispositivos}{" "}
            {totalDispositivos === 1 ? "dispositivo" : "dispositivos"}
          </span>
        </div>
        <p className="t-caption text-fg-subtle">
          Quienes aceptaron las notificaciones push y aún no las revocaron. Es la
          mejor señal disponible: una suscripción puede seguir aquí hasta que un
          envío falle y se depure.
        </p>
        {suscritos.length > 0 ? (
          <div className="space-y-2">
            {suscritos.map((u) => (
              <Card key={u.usuario_id} className="flex items-center gap-3 p-3.5">
                <AvatarNotion nombre={u.nombre_completo ?? u.email ?? "?"} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="t-body-sm truncate font-bold text-fg-strong">
                    {u.nombre_completo ?? "Sin nombre"}
                  </p>
                  <p className="t-caption truncate text-fg-muted">{u.email}</p>
                  <p className="overline mt-1 text-fg-subtle">
                    Suscrito {formatearFechaHoraBogota(u.ultima_suscripcion)}
                    {u.ultimo_envio
                      ? ` · último push ${formatearFechaHoraBogota(u.ultimo_envio)}`
                      : " · sin envíos aún"}
                  </p>
                </div>
                {u.dispositivos > 1 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-pill bg-primary-soft px-2.5 py-1 text-2xs font-bold text-primary">
                    <Smartphone className="size-3" aria-hidden /> {u.dispositivos}
                  </span>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <p className="t-body-sm text-fg-muted">
            Nadie tiene notificaciones activas todavía.
          </p>
        )}
      </section>

      {/* ── Historial ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="t-h4 flex items-center gap-2">
          <Bell className="size-4 text-primary" /> Enviadas
        </h2>
        {historial && historial.length > 0 ? (
          <div className="space-y-2">
            {historial.map((n) => {
              const meta = AUDIENCIA_META[n.audiencia_tipo] ?? AUDIENCIA_META.plataforma;
              const Icono = meta.icono;
              return (
                <Card key={n.id} className="flex items-start gap-3 p-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <Icono className="size-4.5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="t-body-sm font-bold text-fg-strong">{n.titulo}</p>
                    <p className="t-caption truncate text-fg-muted">{n.cuerpo}</p>
                    <p className="overline mt-1 text-fg-subtle">
                      {meta.etiqueta} · {n.total_destinatarios} dest. ·{" "}
                      {n.total_push_enviados} push · {formatearFechaHoraBogota(n.creada_en)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="t-body-sm text-fg-muted">Aún no has enviado notificaciones.</p>
        )}
      </section>
    </PageContainer>
  );
}
