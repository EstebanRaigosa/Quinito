import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ScrollText, Users } from "lucide-react";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { getTodasLasPollas } from "@/lib/queries/superadmin";
import { PageContainer } from "@/components/shared/PageContainer";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { AvatarGrupo } from "@/components/grupos/AvatarGrupo";

export const metadata: Metadata = {
  title: "Admin · Auditoría",
};

/**
 * Panel de superadmin: selector de polla para revisar la auditoría de marcadores.
 * Elegir una polla lleva a su línea de tiempo de movimientos.
 */
export default async function AdminAuditoriaPage() {
  const user = await getUsuarioActual();
  if (!user) redirect("/login");
  if (!esSuperAdmin(user.email)) redirect("/dashboard");

  const pollas = await getTodasLasPollas();

  return (
    <PageContainer ancho="ancho" className="space-y-5">
      <SectionHeader
        titulo="Auditoría de marcadores"
        sub="Elige una polla para ver el historial de predicciones por usuario y partido."
        meta={`${pollas.length} ${pollas.length === 1 ? "polla" : "pollas"}`}
      />

      {pollas.length === 0 ? (
        <EmptyState
          icono={ScrollText}
          titulo="Aún no hay pollas"
          descripcion="Cuando exista una polla con predicciones podrás auditarla aquí."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {pollas.map((p) => (
            <Link
              key={p.id}
              href={`/admin/auditoria/${p.id}?nombre=${encodeURIComponent(p.nombre)}`}
              className="surface-card hover-lift flex items-center gap-3 rounded-2xl p-4"
            >
              <AvatarGrupo nombre={p.nombre} size="lg" className="ring-2 ring-app" />
              <div className="min-w-0 flex-1">
                <p className="t-h4 truncate">{p.nombre}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-muted">
                  <span className="t-caption inline-flex items-center gap-1">
                    <Users className="size-3.5" aria-hidden />
                    {p.total_participantes}
                  </span>
                  {p.torneo_nombre && (
                    <span className="t-caption truncate">{p.torneo_nombre}</span>
                  )}
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
