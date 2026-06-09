import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Trophy, Users, Mail } from "lucide-react";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { getTodasLasPollas } from "@/lib/queries/superadmin";
import { formatearMonto } from "@/lib/utils/texto";
import { PageContainer } from "@/components/shared/PageContainer";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { AvatarGrupo } from "@/components/grupos/AvatarGrupo";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Admin · Pollas",
};

/** Panel de superadmin: todas las pollas de la plataforma. */
export default async function AdminPollasPage() {
  const user = await getUsuarioActual();
  if (!user) redirect("/login");
  // Solo super-admin de plataforma.
  if (!esSuperAdmin(user.email)) redirect("/dashboard");

  const pollas = await getTodasLasPollas();

  return (
    <PageContainer ancho="ancho" className="space-y-5">
      <SectionHeader
        titulo="Todas las pollas"
        meta={`${pollas.length} ${pollas.length === 1 ? "polla" : "pollas"} en la plataforma`}
      />

      {pollas.length === 0 ? (
        <EmptyState
          icono={Trophy}
          titulo="Aún no hay pollas"
          descripcion="Cuando alguien cree una polla aparecerá aquí."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {pollas.map((p) => (
            <Link
              key={p.id}
              href={`/grupos/${p.id}`}
              className="surface-card hover-lift flex items-start gap-3 rounded-2xl p-4"
            >
              <AvatarGrupo nombre={p.nombre} size="lg" className="ring-2 ring-app" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="t-h4 truncate">{p.nombre}</p>
                  <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-muted">
                  <span className="t-caption inline-flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden />
                    {p.total_participantes}
                  </span>
                  {p.torneo_nombre && (
                    <span className="t-caption truncate">{p.torneo_nombre}</span>
                  )}
                  <Badge variant="secondary">{p.codigo_invitacion}</Badge>
                  {p.valor_apuesta > 0 && (
                    <span className="t-caption font-semibold text-fg-strong">
                      {formatearMonto(p.valor_apuesta)}
                    </span>
                  )}
                </div>

                {/* Creador + su correo (visible solo para superadmin). */}
                <div className="mt-2 border-t border-border pt-2">
                  <p className="t-caption truncate text-fg-muted">
                    Creador:{" "}
                    <span className="font-semibold text-fg-strong">
                      {p.creador_nombre ?? "—"}
                    </span>
                  </p>
                  {p.creador_email && (
                    <p className="t-caption inline-flex items-center gap-1 truncate text-fg-muted">
                      <Mail className="size-3" aria-hidden />
                      {p.creador_email}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
