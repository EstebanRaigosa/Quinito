import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import type { Partido } from "@/lib/types/dominio";
import { getPartidosTorneo } from "@/lib/queries/partidos-torneo";
import { TarjetaPartido } from "@/components/partidos/TarjetaPartido";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageContainer } from "@/components/shared/PageContainer";
import { claveDiaBogota, formatearFechaLarga } from "@/lib/utils/fechas";

export const metadata: Metadata = {
  title: "Partidos",
};

/** Agrupa los partidos por día (clave estable en zona Bogotá). */
function agruparPorDia(partidos: Partido[]): [string, Partido[]][] {
  const mapa = new Map<string, Partido[]>();
  for (const p of partidos) {
    const dia = claveDiaBogota(p.fecha_hora);
    const lista = mapa.get(dia);
    if (lista) lista.push(p);
    else mapa.set(dia, [p]);
  }
  return [...mapa.entries()];
}

export default async function PartidosPage() {
  const partidos = await getPartidosTorneo();
  const dias = agruparPorDia(partidos);

  return (
    <PageContainer ancho="ancho" className="space-y-6 md:space-y-8">
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
              <h2 className="sticky top-14 z-10 -mx-1 mb-3 flex items-center gap-2.5 bg-app/95 px-1 py-1.5 backdrop-blur md:top-0">
                <span
                  aria-hidden
                  className="h-4 w-1 shrink-0 rounded-full bg-primary"
                />
                <span className="overline text-fg-strong">
                  {formatearFechaLarga(lista[0]!.fecha_hora)}
                </span>
                <span
                  aria-hidden
                  className="h-px flex-1 bg-gradient-to-r from-border to-transparent"
                />
              </h2>
              <div className="grid animate-fade-up gap-3 md:grid-cols-2 lg:grid-cols-3">
                {lista.map((p) => (
                  <TarjetaPartido key={p.id} partido={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
