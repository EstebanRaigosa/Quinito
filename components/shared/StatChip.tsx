import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Métrica destacada (tarjeta-stat bento): etiqueta en overline + número
 * protagonista (.t-stat) + sub-dato inline. El número es el héroe (vibe
 * deportivo). Se usa en la fila de stats del dashboard (scroll horizontal en
 * móvil, grid en desktop) y en el resumen del perfil.
 */
type Props = {
  label: string;
  value: string | number;
  sub?: string;
  Icono?: LucideIcon;
  /** Resalta el valor en verde-degradado (métrica estrella, p. ej. puntos). */
  gold?: boolean;
  /** Color custom del valor (CSS var). Ignorado si `gold`. */
  accent?: string;
  className?: string;
};

export function StatChip({
  label,
  value,
  sub,
  Icono,
  gold,
  accent,
  className,
}: Props) {
  return (
    <div className={cn("surface-card rounded-xl p-4 md:p-5", className)}>
      <div className="mb-2.5 flex items-center gap-2">
        {Icono && (
          <span
            className={cn(
              "grid size-6 shrink-0 place-items-center rounded-md",
              gold ? "bg-primary-soft text-primary" : "bg-muted text-fg-muted",
            )}
          >
            <Icono className="size-3.5" />
          </span>
        )}
        <span className="overline truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className={cn("t-stat", gold && "text-gradient-gold")}
          style={!gold && accent ? { color: accent } : undefined}
        >
          {value}
        </span>
        {sub && (
          <span className="t-caption min-w-0 truncate font-semibold">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
