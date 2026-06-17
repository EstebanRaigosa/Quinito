import { Clock, Trophy } from "lucide-react";
import type { Partido } from "@/lib/types/dominio";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/shared/Flag";

/**
 * Cómo se resolvió un cruce eliminatorio que quedó EMPATADO a los 90':
 * - `penales`: bloque dorado con el marcador de la tanda y quién avanza.
 * - `prorroga`: bloque azul (tiempo extra) indicando quién avanzó.
 * El equipo que avanza sale de `equipo_avanza_id` (no del marcador, que está
 * empatado). Devuelve `null` para partidos regulares o no finalizados (0064).
 */
export function DefinicionPartido({
  partido,
  className,
}: {
  partido: Partido;
  className?: string;
}) {
  if (partido.estado !== "finalizado") return null;
  if (partido.tipo_definicion === "regular") return null;

  // El equipo que avanza es el guardado en equipo_avanza_id (el marcador de los
  // 90' quedó empatado, así que no se puede derivar del marcador).
  const ganador =
    partido.equipo_avanza_id === partido.equipo_local?.id
      ? partido.equipo_local
      : partido.equipo_avanza_id === partido.equipo_visitante?.id
        ? partido.equipo_visitante
        : null;

  // ── Penales: marcador de la tanda + ganador (dorado) ──────────────────────
  if (
    partido.tipo_definicion === "penales" &&
    partido.penales_local != null &&
    partido.penales_visitante != null
  ) {
    const ganaLocal = partido.equipo_avanza_id === partido.equipo_local?.id;
    return (
      <div
        className={cn(
          "overflow-hidden rounded-lg ring-1 ring-[#F59E0B]/35",
          className,
        )}
      >
        <div className="flex items-center justify-center gap-2 bg-[#FCD34D]/15 px-3 py-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#92600A] dark:text-[#FCD34D]">
            Penales
          </span>
          <span className="flex items-center gap-1.5 text-sm font-black tabular-nums">
            <Flag code={partido.equipo_local?.codigo_iso} size={16} />
            <span className={cn(ganaLocal ? "text-fg-strong" : "text-fg-subtle")}>
              {partido.penales_local}
            </span>
            <span className="text-fg-subtle">-</span>
            <span className={cn(!ganaLocal ? "text-fg-strong" : "text-fg-subtle")}>
              {partido.penales_visitante}
            </span>
            <Flag code={partido.equipo_visitante?.codigo_iso} size={16} />
          </span>
        </div>
        <div className="flex items-center justify-center gap-1.5 bg-[#FCD34D]/30 px-3 py-1 text-2xs font-extrabold text-[#92600A] dark:text-[#FCD34D]">
          <Trophy className="size-3.5 shrink-0" aria-hidden />
          <Flag code={ganador?.codigo_iso} size={14} />
          <span className="truncate">{ganador?.nombre} gana por penales</span>
        </div>
      </div>
    );
  }

  // ── Prórroga: marcador del tiempo extra + ganador (azul) ──────────────────
  if (
    partido.tipo_definicion === "prorroga" &&
    partido.prorroga_local != null &&
    partido.prorroga_visitante != null
  ) {
    const ganaLocal = partido.equipo_avanza_id === partido.equipo_local?.id;
    return (
      <div
        className={cn(
          "overflow-hidden rounded-lg ring-1 ring-info/30",
          className,
        )}
      >
        <div className="flex items-center justify-center gap-2 bg-info-soft px-3 py-1.5">
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-info">
            <Clock className="size-3 shrink-0" aria-hidden />
            Tiempo extra
          </span>
          <span className="flex items-center gap-1.5 text-sm font-black tabular-nums">
            <Flag code={partido.equipo_local?.codigo_iso} size={16} />
            <span className={cn(ganaLocal ? "text-fg-strong" : "text-fg-subtle")}>
              {partido.prorroga_local}
            </span>
            <span className="text-fg-subtle">-</span>
            <span className={cn(!ganaLocal ? "text-fg-strong" : "text-fg-subtle")}>
              {partido.prorroga_visitante}
            </span>
            <Flag code={partido.equipo_visitante?.codigo_iso} size={16} />
          </span>
        </div>
        <div className="flex items-center justify-center gap-1.5 bg-info-soft/70 px-3 py-1 text-2xs font-extrabold text-info">
          <Trophy className="size-3.5 shrink-0" aria-hidden />
          <Flag code={ganador?.codigo_iso} size={14} />
          <span className="truncate">{ganador?.nombre} ganó en la prórroga</span>
        </div>
      </div>
    );
  }

  return null;
}
