import type { LucideIcon } from "lucide-react";
import { CalendarDays, Flame, Trophy, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { IlustracionFutbol } from "./IlustracionFutbol";

function ChipStat({
  icon: Icon,
  valor,
  etiqueta,
}: {
  icon: LucideIcon;
  valor: string;
  etiqueta: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-2 backdrop-blur-md">
      <Icon className="size-4 shrink-0 text-mustard-300" />
      <div className="leading-none">
        <span className="block text-sm font-extrabold text-white">{valor}</span>
        <span className="block text-2xs uppercase tracking-wide text-white/70">
          {etiqueta}
        </span>
      </div>
    </div>
  );
}

type Props = {
  titulo: string;
  descripcion: string;
  className?: string;
};

/**
 * Panel lateral (desktop) del flujo de auth: foto del estadio con saludo,
 * badge de fecha y chips de estadísticas tipo glass superpuestos.
 */
export function PanelEstadio({ titulo, descripcion, className }: Props) {
  return (
    <div
      className={cn(
        "relative flex min-h-[660px] flex-col justify-end overflow-hidden p-10",
        className,
      )}
    >
      <IlustracionFutbol />

      {/* Badge de fecha (arriba) */}
      <div className="absolute left-10 top-10 z-10">
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-white/20 bg-white/15 px-3 py-1 text-2xs font-extrabold uppercase tracking-[0.12em] text-white backdrop-blur-md">
          <CalendarDays className="size-3.5" />
          11 jun — 19 jul 2026
        </span>
      </div>

      {/* Texto + stats (abajo) */}
      <div className="relative z-10 space-y-5 text-white">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-mustard-400/90 px-3 py-1 text-2xs font-extrabold uppercase tracking-[0.12em] text-mustard-900 shadow-glow">
          <Trophy className="size-3.5" />
          Mundial 2026
        </span>
        <h2 className="t-display text-white drop-shadow-md">{titulo}</h2>
        <p className="t-body max-w-sm text-white/85">{descripcion}</p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <ChipStat icon={Users} valor="48" etiqueta="selecciones" />
          <ChipStat icon={Flame} valor="104" etiqueta="partidos" />
          <ChipStat icon={Trophy} valor="1" etiqueta="campeón" />
        </div>
      </div>
    </div>
  );
}
