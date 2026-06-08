import { cn } from "@/lib/utils";

/** Barra de estadística agregada (DS): etiqueta + % arriba, barra abajo. */
export function StatBar({
  label,
  pct,
  color = "var(--primary)",
  sublabel,
  accent = false,
}: {
  label: string;
  pct: number;
  color?: string;
  sublabel?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 truncate">
          {sublabel}
          <span
            className={cn(
              "truncate text-sm font-semibold",
              accent ? "text-fg-strong" : "text-fg",
            )}
          >
            {label}
          </span>
        </span>
        <span className="shrink-0 text-sm font-extrabold tabular-nums text-fg-strong">
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-pill bg-sunken">
        <div
          className="h-full origin-left animate-grow-x rounded-pill"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

/** Fila de marcador en "Resultados más comunes": caja + barra + conteo + %. */
export function ScoreRow({
  golesLocal,
  golesVisitante,
  pct,
  max,
  cantidad,
  destacado = false,
}: {
  golesLocal: number;
  golesVisitante: number;
  pct: number;
  max: number;
  cantidad?: number;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "grid h-9 w-14 shrink-0 place-items-center rounded-lg text-sm font-extrabold tabular-nums text-fg-strong",
          destacado
            ? "border-2 border-primary bg-primary-soft"
            : "border border-border bg-sunken",
        )}
      >
        {golesLocal}-{golesVisitante}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-pill bg-sunken">
        <div
          className={cn(
            "h-full origin-left animate-grow-x rounded-pill",
            destacado ? "bg-primary" : "bg-clay-300",
          )}
          style={{ width: `${max > 0 ? (pct / max) * 100 : 0}%` }}
        />
      </div>
      <span className="flex w-20 shrink-0 flex-col items-end leading-tight">
        <span className="text-sm font-bold tabular-nums text-fg-strong">
          {pct.toFixed(1)}%
        </span>
        {cantidad != null && (
          <span className="text-2xs font-medium tabular-nums text-fg-subtle">
            {cantidad} {cantidad === 1 ? "persona" : "personas"}
          </span>
        )}
      </span>
    </div>
  );
}
