import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { Plus, Search, Users, Bell } from "lucide-react";
import { getPerfilActual, getUsuarioActual } from "@/lib/auth/usuario-actual";
import { getMisGrupos } from "@/lib/queries/grupos";
import { getInicioDashboard } from "@/lib/queries/inicio";
import { TarjetaGrupo } from "@/components/grupos/TarjetaGrupo";
import { PrediccionesPendientes } from "@/components/partidos/PrediccionesPendientes";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageContainer } from "@/components/shared/PageContainer";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { ZONA_BOGOTA } from "@/lib/utils/fechas";

export const metadata: Metadata = {
  title: "Inicio",
};

/** Saludo según la hora local (America/Bogota). */
function saludoPorHora(ahora: Date): string {
  const hora = Number(formatInTimeZone(ahora, ZONA_BOGOTA, "H"));
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function DashboardPage() {
  const user = await getUsuarioActual();
  if (!user) redirect("/login");

  const ahora = new Date();

  // Todo cacheado/compartido con el layout o resuelto en una sola llamada:
  // `getPerfilActual` y `getMisGrupos` se comparten con el shell, y
  // `getInicioDashboard` trae las predicciones de hoy y el próximo partido por
  // polla en UNA sola consulta a la base.
  const [perfil, grupos, inicio] = await Promise.all([
    getPerfilActual(),
    getMisGrupos(),
    getInicioDashboard(ahora),
  ]);
  const { pendientesHoy, proximoPorGrupo } = inicio;

  const primerNombre = (perfil?.nombre_completo ?? user.email ?? "").split(
    " ",
  )[0];
  const grupoFoco = grupos[0];

  const totalHoy = pendientesHoy.length;
  const pendientes = pendientesHoy.filter((i) => !i.miPrediccion).length;
  const gruposActivos = grupos.filter((g) => g.estado === "activo").length;

  const fechaHoy = formatInTimeZone(ahora, ZONA_BOGOTA, "EEEE d 'de' MMMM", {
    locale: es,
  });

  return (
    <PageContainer ancho="ancho" className="space-y-6 md:space-y-8">
      {/* 1 · Saludo + acción */}
      <header className="flex animate-fade-up items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="overline">{fechaHoy}</p>
          <h1 className="t-display mt-1 text-balance">
            {saludoPorHora(ahora)}, {primerNombre}
          </h1>
          {grupoFoco && (
            <p className="t-body-sm mt-1.5 text-fg-muted">
              {totalHoy > 0 ? (
                <>
                  Tienes{" "}
                  <strong className="font-bold text-fg-strong">
                    {totalHoy} {totalHoy === 1 ? "partido" : "partidos"} hoy
                  </strong>
                  {pendientes > 0 ? (
                    <>
                      {" "}
                      y{" "}
                      {pendientes === 1
                        ? "1 predicción pendiente"
                        : `${pendientes} predicciones pendientes`}
                      .
                    </>
                  ) : (
                    <>
                      {" "}
                      <span className="font-bold text-success">— al día ✓</span>
                    </>
                  )}
                </>
              ) : (
                <>
                  Vas al día con tus predicciones{" "}
                  <span className="font-bold text-success">✓</span>
                </>
              )}
            </p>
          )}
        </div>

        {/* Notificaciones es una feature futura; por ahora la campana lleva a
            Perfil (hub de ajustes donde vivirá la config de notificaciones). */}
        <Link
          href="/perfil"
          aria-label="Notificaciones y ajustes"
          className="relative grid size-11 shrink-0 place-items-center rounded-xl text-fg-muted transition-colors hover:bg-sunken md:hidden"
        >
          <Bell className="size-5" />
        </Link>
      </header>

      {/* 2 · Acciones rápidas: tiles grandes Crear/Unirme, arriba en todos los tamaños */}
      {grupos.length > 0 && (
        <section
          aria-label="Acciones rápidas"
          className="grid animate-fade-up grid-cols-2 gap-3 [animation-delay:40ms]"
        >
          <Link
            href="/grupos/crear"
            className="hover-lift flex min-h-[5.5rem] flex-col justify-between rounded-2xl bg-gradient-to-br from-primary to-primary-hover p-4 text-primary-foreground shadow-glow"
          >
            <Plus className="size-6" aria-hidden />
            <span>
              <span className="block font-bold leading-tight">Crear polla</span>
              <span className="block text-xs text-primary-foreground/80">
                Arma tu polla
              </span>
            </span>
          </Link>
          <Link
            href="/grupos/buscar"
            className="surface-card hover-lift flex min-h-[5.5rem] flex-col justify-between rounded-2xl p-4"
          >
            <Search className="size-6 text-fg-strong" aria-hidden />
            <span>
              <span className="block font-bold leading-tight text-fg-strong">
                Unirme
              </span>
              <span className="block text-xs text-fg-muted">Con un código</span>
            </span>
          </Link>
        </section>
      )}

      {/* 3 · Predicciones pendientes (cross-polla) */}
      <PrediccionesPendientes items={pendientesHoy} ahora={ahora} />

      {/* 5 · Mis pollas */}
      <section className="animate-fade-up [animation-delay:200ms]">
        <SectionHeader
          titulo="Mis pollas"
          meta={
            grupos.length
              ? `${gruposActivos} ${gruposActivos === 1 ? "polla activa" : "pollas activas"}`
              : undefined
          }
        />
        {grupos.length === 0 ? (
          <EmptyState
            icono={Users}
            titulo="Aún no tienes pollas"
            descripcion="Crea una nueva o únete con el código que te compartieron."
          >
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline">
                <Link href="/grupos/buscar">Unirme con código</Link>
              </Button>
              <Button asChild>
                <Link href="/grupos/crear">Crear polla</Link>
              </Button>
            </div>
          </EmptyState>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
            {grupos.map((g, i) => (
              <TarjetaGrupo
                key={g.id}
                grupo={g}
                index={i}
                proximo={proximoPorGrupo.get(g.id) ?? null}
                ahora={ahora}
              />
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
