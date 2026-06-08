import type { PrediccionPendiente } from "@/lib/queries/predicciones-hoy";
import { Badge } from "@/components/ui/badge";
import { PrediccionPendienteCard } from "@/components/partidos/PrediccionPendienteCard";

/**
 * Sección del dashboard: las predicciones de hoy de todas las pollas, con
 * contador de pendientes y barra de progreso (hechas / total del día).
 */
export function PrediccionesPendientes({
  items,
  ahora,
}: {
  items: PrediccionPendiente[];
  ahora: Date;
}) {
  if (items.length === 0) return null;

  const total = items.length;
  const hechas = items.filter((i) => i.miPrediccion).length;
  const pendientes = total - hechas;
  const progreso = Math.round((hechas / total) * 100);

  return (
    <section
      aria-label="Predicciones pendientes de hoy"
      className="animate-fade-up [animation-delay:150ms]"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2.5">
          <h2 className="t-h2">Predicciones pendientes</h2>
          {pendientes > 0 && (
            <Badge variant="success" dot>
              {pendientes} por hacer
            </Badge>
          )}
        </div>
        <div className="flex min-w-[180px] flex-1 items-center gap-2.5 sm:max-w-[240px] sm:flex-initial">
          <span className="t-caption shrink-0 font-bold tabular-nums text-fg-muted">
            {hechas} de {total} hoy
          </span>
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-pill bg-sunken"
            role="progressbar"
            aria-valuenow={progreso}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-pill bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
        {items.map((item) => (
          <PrediccionPendienteCard
            key={`${item.grupoId}:${item.partido.id}`}
            item={item}
            ahora={ahora}
          />
        ))}
      </div>
    </section>
  );
}
