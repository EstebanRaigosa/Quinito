import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { getGrupoDetalle } from "@/lib/queries/grupo-detalle";
import { PageContainer } from "@/components/shared/PageContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { FormularioReglas } from "@/components/grupos/FormularioReglas";

export default async function ConfigurarGrupoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detalle = await getGrupoDetalle(id);

  // Si no existe o no es miembro, mandamos al inicio.
  if (!detalle) redirect("/dashboard");

  // Solo el admin puede configurar la polla.
  if (!detalle.esAdmin) {
    return (
      <PageContainer>
        <EmptyState
          icono={ShieldAlert}
          titulo="Acceso restringido"
          descripcion="Solo el administrador de la polla puede editar las reglas."
        >
          <Button asChild className="mt-2">
            <Link href={`/grupos/${id}`}>Volver a la polla</Link>
          </Button>
        </EmptyState>
      </PageContainer>
    );
  }

  const { grupo, reglas } = detalle;

  return (
    <PageContainer ancho="ancho" className="space-y-5">
      <div className="animate-fade-up">
        <Link
          href={`/grupos/${id}`}
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-fg-muted transition-colors hover:text-fg-strong"
        >
          {grupo.nombre} <ChevronRight className="size-3" />{" "}
          <span className="text-fg-strong">Configurar</span>
        </Link>
        <h1 className="t-h1">Configurar polla</h1>
        <p className="t-body-sm mt-1 text-fg-muted">
          Ajusta los puntajes, bonos, el pozo y los premios. Los cambios aplican
          a todos los participantes.
        </p>
      </div>

      <div className="md:max-w-xl">
        <FormularioReglas grupoId={id} reglas={reglas} />
      </div>
    </PageContainer>
  );
}
