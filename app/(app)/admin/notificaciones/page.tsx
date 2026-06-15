import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell, Globe, ShieldCheck, User, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { getTodasLasPollas } from "@/lib/queries/superadmin";
import { formatearFechaHoraBogota } from "@/lib/utils/fechas";
import { PageContainer } from "@/components/shared/PageContainer";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!esSuperAdmin(user.email)) redirect("/dashboard");

  const [pollas, { data: historial }] = await Promise.all([
    getTodasLasPollas(),
    supabase
      .from("tblNotificaciones")
      .select(
        "id, titulo, cuerpo, audiencia_tipo, total_destinatarios, total_push_enviados, creada_en",
      )
      .order("creada_en", { ascending: false })
      .limit(20),
  ]);

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
