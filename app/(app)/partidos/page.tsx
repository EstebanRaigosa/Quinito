import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getPartidosTorneo } from "@/lib/queries/partidos-torneo";
import { getTorneosDisponibles } from "@/lib/queries/torneos-server";
import { TarjetaPartido } from "@/components/partidos/TarjetaPartido";
import { DestelloPartido } from "@/components/partidos/DestelloPartido";
import { RealtimePartidos } from "@/components/shared/RealtimePartidos";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageContainer } from "@/components/shared/PageContainer";
import { agruparPorDia, etiquetaDiaListado } from "@/lib/utils/fechas";
import { compararPartidos, firmaPartido } from "@/lib/utils/prediccion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Partidos",
};

export default async function PartidosPage({
  searchParams,
}: {
  searchParams: Promise<{ torneo?: string }>;
}) {
  const { torneo } = await searchParams;
  const torneos = await getTorneosDisponibles();

  // Torneo seleccionado: el del query param (si es válido) o el primero activo.
  const torneoActivo =
    torneos.find((t) => t.id === torneo) ?? torneos[0] ?? null;
  const partidos = torneoActivo
    ? await getPartidosTorneo(torneoActivo.id)
    : [];
  const dias = agruparPorDia([...partidos].sort(compararPartidos));

  return (
    <PageContainer ancho="ancho" className="space-y-6 md:space-y-8">
      {/* "En vivo": refresca el calendario cuando cambia marcador/estado. */}
      {torneoActivo && <RealtimePartidos torneoIds={[torneoActivo.id]} />}

      <header className="animate-fade-up">
        <p className="overline flex items-center gap-2 text-primary">
          <span aria-hidden className="h-3 w-1 rounded-full bg-primary" />
          Calendario
        </p>
        <h1 className="t-display mt-1.5">Partidos</h1>
        <p className="t-body-sm mt-1.5 text-fg-muted">
          Todos los partidos del torneo, en hora de Colombia.
        </p>
      </header>

      {/* Selector de torneo (solo si hay más de uno activo). */}
      {torneos.length > 1 && (
        <nav
          aria-label="Seleccionar torneo"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {torneos.map((t) => {
            const seleccionado = t.id === torneoActivo?.id;
            return (
              <Link
                key={t.id}
                href={`/partidos?torneo=${t.id}`}
                scroll={false}
                aria-current={seleccionado ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-pill px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  seleccionado
                    ? "bg-primary text-primary-foreground"
                    : "surface-card text-fg-muted hover:text-fg-strong",
                )}
              >
                {t.nombre}
              </Link>
            );
          })}
        </nav>
      )}

      {dias.length === 0 ? (
        <EmptyState
          icono={CalendarDays}
          titulo="Aún no hay partidos"
          descripcion="El calendario del torneo aparecerá aquí cuando esté disponible."
        />
      ) : (
        <div className="space-y-7">
          {dias.map(([dia, lista]) => (
            // Sin transform en la <section>: un ancestro transformado rompe
            // `position: sticky` del <h2> en iOS (§12). La animación va en la
            // grilla interna, no aquí.
            <section key={dia}>
              <h2 className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-1 mb-3 flex items-center gap-2.5 bg-app/95 px-1 py-1.5 backdrop-blur md:top-0">
                <span
                  aria-hidden
                  className="h-4 w-1 shrink-0 rounded-full bg-primary"
                />
                <span className="overline text-fg-strong">
                  {etiquetaDiaListado(lista[0]!.fecha_hora)}
                </span>
                <span
                  aria-hidden
                  className="h-px flex-1 bg-gradient-to-r from-border to-transparent"
                />
              </h2>
              <div className="grid animate-fade-up gap-3 md:grid-cols-2 lg:grid-cols-3">
                {lista.map((p) => (
                  <DestelloPartido key={p.id} firma={firmaPartido(p)}>
                    <TarjetaPartido partido={p} />
                  </DestelloPartido>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
