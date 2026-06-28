import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import { getTodasLasPollas } from "@/lib/queries/superadmin";
import { getAuditoriaGrupo } from "@/lib/queries/auditoria";
import { PageContainer } from "@/components/shared/PageContainer";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { AuditoriaPolla } from "@/components/admin/AuditoriaPolla";

export const metadata: Metadata = {
  title: "Admin · Auditoría de polla",
};

/** Línea de tiempo de auditoría de marcadores de una polla. */
export default async function AdminAuditoriaPollaPage({
  params,
  searchParams,
}: {
  params: Promise<{ grupoId: string }>;
  searchParams: Promise<{ nombre?: string }>;
}) {
  const { grupoId } = await params;
  // El selector pasa el nombre por la URL para NO re-listar todas las pollas
  // (eso gateaba la carga). Fallback más abajo si se entra directo al enlace.
  const { nombre } = await searchParams;

  const user = await getUsuarioActual();
  if (!user) redirect("/login");
  if (!esSuperAdmin(user.email)) redirect("/dashboard");

  const movimientos = await getAuditoriaGrupo(grupoId);

  // Nombre desde la URL (camino normal). Solo si falta, caemos al fetch pesado.
  let nombrePolla = nombre?.trim() || null;
  if (!nombrePolla) {
    const pollas = await getTodasLasPollas();
    nombrePolla = pollas.find((p) => p.id === grupoId)?.nombre ?? null;
  }

  return (
    <PageContainer ancho="ancho" className="space-y-5">
      <Link
        href="/admin/auditoria"
        className="t-caption inline-flex items-center gap-1 text-fg-muted hover:text-fg-strong"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Todas las pollas
      </Link>

      <SectionHeader
        titulo={nombrePolla ?? "Auditoría"}
        sub="Historial de marcadores guardados, por usuario y partido."
        meta={`${movimientos.length} ${movimientos.length === 1 ? "movimiento" : "movimientos"}`}
      />

      <AuditoriaPolla movimientos={movimientos} />
    </PageContainer>
  );
}
