import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUsuarioActual } from "@/lib/auth/usuario-actual";
import { getGrupoDetalle } from "@/lib/queries/grupo-detalle";
import { PageContainer } from "@/components/shared/PageContainer";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { FormularioReglas } from "@/components/grupos/FormularioReglas";
import { FormularioEditarGrupo } from "@/components/grupos/FormularioEditarGrupo";
import { EliminarGrupo } from "@/components/grupos/EliminarGrupo";

export default async function ConfigurarGrupoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  // getUsuarioActual() reusa la validación del layout (acierto de caché) en vez
  // de un getUser() nuevo contra GoTrue.
  const [user, { data: esSuperadmin }, detalle] = await Promise.all([
    getUsuarioActual(),
    supabase.rpc("es_superadmin"),
    getGrupoDetalle(id),
  ]);

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
  // Eliminar la polla es exclusivo del creador o del superadmin de plataforma
  // (mismo criterio que valida el RPC `eliminar_grupo`).
  const puedeEliminarGrupo =
    (!!user && user.id === grupo.creador_id) || esSuperadmin === true;

  return (
    <PageContainer ancho="ancho" className="space-y-8">
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
          Edita los datos de la polla, ajusta puntajes, bonos, pozo y premios.
          Los cambios aplican a todos los participantes.
        </p>
      </div>

      {/* Datos de la polla: nombre y descripción */}
      <section className="space-y-3 md:max-w-xl">
        <div>
          <p className="overline">Datos de la polla</p>
          <p className="t-body-sm mt-1 text-fg-muted">
            El nombre y la descripción que ven todos los participantes.
          </p>
        </div>
        <FormularioEditarGrupo
          grupoId={id}
          nombre={grupo.nombre}
          descripcion={grupo.descripcion}
        />
      </section>

      {/* Reglas: puntajes, bonos, pozo y premios */}
      <section className="space-y-3 md:max-w-xl">
        <p className="overline">Reglas y puntuación</p>
        <FormularioReglas grupoId={id} reglas={reglas} />
      </section>

      {/* Zona de peligro: eliminar la polla (solo creador / superadmin) */}
      {puedeEliminarGrupo && (
        <section className="space-y-3 md:max-w-xl">
          <p className="overline text-destructive">Zona de peligro</p>
          <EliminarGrupo
            grupoId={id}
            nombre={grupo.nombre}
            totalParticipantes={grupo.total_participantes}
          />
        </section>
      )}
    </PageContainer>
  );
}
