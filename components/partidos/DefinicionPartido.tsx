import { Clock, Trophy } from "lucide-react";
import type { Partido } from "@/lib/types/dominio";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/shared/Flag";

/**
 * Cómo se definió un cruce eliminatorio, cuando NO fue en los 90':
 * - `penales`: bloque dorado con el marcador de la tanda y quién avanza.
 * - `prorroga`: bloque azul (tiempo extra) indicando que el ganador se definió
 *   en la prórroga (el ganador sale del marcador, que ya incluye esos goles).
 * Devuelve `null` para partidos regulares o no finalizados (ver migración 0062).
 */
export function DefinicionPartido({
  partido,
  className,
}: {
  partido: Partido;
  className?: string;
}) {
  if (partido.estado !== "finalizado") return null;

  // ── Penales: marcador de la tanda + ganador (dorado) ──────────────────────
  if (
    partido.tipo_definicion === "penales" &&
    partido.penales_local != null &&
    partido.penales_visitante != null
  ) {
    const ganaLocal = partido.penales_local > partido.penales_visitante;
    const ganador = ganaLocal ? partido.equipo_local : partido.equipo_visitante;
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

  // ── Prórroga: ganador definido en tiempo extra (azul) ─────────────────────
  if (
    partido.tipo_definicion === "prorroga" &&
    partido.goles_local != null &&
    partido.goles_visitante != null
  ) {
    const ganaLocal = partido.goles_local > partido.goles_visitante;
    const ganador = ganaLocal ? partido.equipo_local : partido.equipo_visitante;
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 rounded-lg bg-info-soft px-3 py-1.5 text-2xs font-extrabold text-info ring-1 ring-info/30",
          className,
        )}
      >
        <span className="inline-flex items-center gap-1 uppercase tracking-wide">
          <Clock className="size-3.5 shrink-0" aria-hidden />
          Tiempo extra
        </span>
        <span className="inline-flex min-w-0 items-center gap-1.5">
          <Flag code={ganador?.codigo_iso} size={14} />
          <span className="truncate">{ganador?.nombre} ganó en la prórroga</span>
        </span>
      </div>
    );
  }

  return null;
}
