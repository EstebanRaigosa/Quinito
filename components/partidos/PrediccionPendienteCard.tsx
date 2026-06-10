import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import type { PrediccionPendiente } from "@/lib/queries/predicciones-hoy";
import { Flag } from "@/components/shared/Flag";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { CuentaRegresiva } from "@/components/shared/CuentaRegresiva";
import { cn } from "@/lib/utils";

/**
 * Tarjeta de una predicción de hoy (cross-polla). Pendiente: borde primario +
 * CTA "Predecir ahora". Hecha: superficie hundida + CTA "Editar predicción".
 * Lleva al detalle de la polla, donde vive el formulario de predicción.
 */
export function PrediccionPendienteCard({
  item,
  ahora,
}: {
  item: PrediccionPendiente;
  ahora: Date;
}) {
  const { partido, grupoNombre, grupoId, miPrediccion, cierre } = item;
  const pendiente = !miPrediccion;

  return (
    <Link
      href={`/grupos/${grupoId}`}
      className={cn(
        "hover-lift group block rounded-xl border border-l-[3px] p-3 transition-colors",
        pendiente
          ? "border-l-primary bg-surface"
          : "border-l-[var(--border-strong)] bg-sunken",
      )}
    >
      {/* Cabecera: polla + cierre */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5 text-2xs font-bold text-fg-muted">
          <AvatarNotion nombre={grupoNombre} size="xs" className="size-4 text-[9px]" />
          <span className="truncate">{grupoNombre}</span>
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 text-2xs font-extrabold tabular-nums",
            pendiente ? "text-primary" : "text-fg-subtle",
          )}
        >
          <Clock className="size-3" aria-hidden />
          <CuentaRegresiva iso={cierre} ahoraInicial={ahora} etiquetaCerrada="cerrada" />
        </span>
      </div>

      {/* Enfrentamiento */}
      <div className="flex items-center gap-2">
        <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          <span className="t-body-sm truncate font-semibold text-fg-strong">
            {partido.equipo_local?.nombre}
          </span>
          <Flag code={partido.equipo_local?.codigo_iso} size={22} round />
        </span>

        {miPrediccion ? (
          <span className="shrink-0 rounded-md bg-card px-2 py-0.5 text-sm font-black tabular-nums text-fg-strong shadow-xs ring-1 ring-border">
            {miPrediccion.goles_local}&nbsp;-&nbsp;{miPrediccion.goles_visitante}
          </span>
        ) : (
          <span className="shrink-0 text-2xs font-extrabold uppercase tracking-wider text-fg-subtle">
            vs
          </span>
        )}

        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <Flag code={partido.equipo_visitante?.codigo_iso} size={22} round />
          <span className="t-body-sm truncate font-semibold text-fg-strong">
            {partido.equipo_visitante?.nombre}
          </span>
        </span>
      </div>

      {/* CTA */}
      <span
        className={cn(
          "mt-2.5 flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-bold transition-transform group-active:scale-[0.99]",
          pendiente
            ? "bg-primary text-primary-foreground shadow-glow group-hover:bg-primary-hover"
            : "border border-border bg-card text-fg-strong",
        )}
      >
        {pendiente ? (
          <>
            Predecir ahora
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </>
        ) : (
          <>
            <Check className="size-3.5" strokeWidth={2.5} />
            Editar predicción
          </>
        )}
      </span>
    </Link>
  );
}
