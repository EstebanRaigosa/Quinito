import type { Equipo, FaseTorneo } from "@/lib/types/dominio";
import { Flag } from "@/components/shared/Flag";
import { cn } from "@/lib/utils";

/**
 * Etiqueta "Pasa {equipo}" (o "Campeón {equipo}" en la final) con su bandera.
 * Se usa cuando una predicción de empate en fase eliminatoria marcó qué equipo
 * avanza. El equipo ya viene resuelto por `equipoQueAvanza`.
 */
export function MarcaAvance({
  equipo,
  fase,
  size = 16,
  className,
}: {
  equipo: Equipo;
  fase: FaseTorneo;
  /** Tamaño de la bandera en px. */
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 align-middle", className)}>
      <span className="font-semibold text-fg-muted">
        {fase === "final" ? "Campeón" : "Pasa"}
      </span>
      <Flag code={equipo.codigo_iso} size={size} />
      <span className="font-bold text-fg-strong">{equipo.nombre}</span>
    </span>
  );
}
