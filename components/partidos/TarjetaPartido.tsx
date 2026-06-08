import { Clock } from "lucide-react";
import type { Partido, Prediccion, ReglasGrupo } from "@/lib/types/dominio";
import { ETIQUETA_FASE } from "@/lib/types/dominio";
import { formatearFechaHoraBogota } from "@/lib/utils/fechas";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/shared/Flag";
import { Badge } from "@/components/ui/badge";
import { PuntajeDesglose } from "@/components/partidos/PuntajeDesglose";

function Lado({
  iso,
  nombre,
  placeholder,
  alineacion,
}: {
  iso?: string | null;
  nombre?: string;
  placeholder?: string | null;
  alineacion: "izq" | "der";
}) {
  if (nombre) {
    return (
      <span
        className={cn(
          "flex min-w-0 items-center gap-2 text-sm font-semibold text-fg-strong",
          alineacion === "der" && "flex-row-reverse",
        )}
      >
        <Flag code={iso} size={22} />
        <span className="truncate">{nombre}</span>
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex min-w-0 items-center text-sm italic text-fg-subtle",
        alineacion === "der" && "justify-end",
      )}
    >
      <span className="truncate">
        {placeholder ? `Por definir (${placeholder})` : "Por definir"}
      </span>
    </span>
  );
}

export function TarjetaPartido({
  partido,
  miPrediccion,
  reglas,
}: {
  partido: Partido;
  miPrediccion?: Prediccion;
  /** Reglas del grupo: habilitan el desglose de puntos al hacer clic. */
  reglas?: ReglasGrupo;
}) {
  const jugado = partido.estado === "finalizado" || partido.estado === "en_vivo";
  const finalizado = partido.estado === "finalizado";
  const etiquetaFase =
    partido.fase === "fase_grupos" && partido.grupo
      ? `Grupo ${partido.grupo}`
      : ETIQUETA_FASE[partido.fase];

  return (
    <div
      className={cn(
        "surface-card hover-lift relative overflow-hidden rounded-xl p-3.5 pl-4",
        // Acento verde a la izquierda (estilo "Spring Turf").
        "before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-primary",
        partido.estado === "en_vivo" && "before:bg-destructive before:animate-live-pulse",
        finalizado && "before:bg-border",
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="text-2xs font-bold uppercase tracking-wide text-fg-subtle">
          {etiquetaFase}
        </span>
        {partido.estado === "en_vivo" ? (
          <Badge variant="live">
            <span className="size-1.5 animate-live-pulse rounded-full bg-current" />
            En vivo
          </Badge>
        ) : finalizado ? (
          <span className="text-2xs font-semibold uppercase tracking-wide text-fg-muted">
            Final
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-2xs font-medium text-fg-muted">
            <Clock className="size-3" aria-hidden />
            {formatearFechaHoraBogota(partido.fecha_hora)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
        <Lado
          iso={partido.equipo_local?.codigo_iso}
          nombre={partido.equipo_local?.nombre}
          placeholder={partido.placeholder_local}
          alineacion="izq"
        />
        <div
          className={cn(
            "min-w-14 rounded-lg px-2.5 py-1 text-center text-base font-extrabold tabular-nums",
            jugado
              ? "bg-sunken text-fg-strong shadow-xs"
              : "text-xs font-bold uppercase tracking-widest text-fg-subtle",
          )}
        >
          {jugado
            ? `${partido.goles_local ?? 0} - ${partido.goles_visitante ?? 0}`
            : "vs"}
        </div>
        <div className="flex min-w-0 justify-end">
          <Lado
            iso={partido.equipo_visitante?.codigo_iso}
            nombre={partido.equipo_visitante?.nombre}
            placeholder={partido.placeholder_visitante}
            alineacion="der"
          />
        </div>
      </div>

      {miPrediccion && (
        <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2.5 text-2xs">
          <span className="text-fg-muted">
            Tu predicción:{" "}
            <span className="font-bold tabular-nums text-fg-strong">
              {miPrediccion.goles_local} - {miPrediccion.goles_visitante}
            </span>
          </span>
          {finalizado && (
            <PuntajeDesglose
              prediccion={miPrediccion}
              partido={partido}
              reglas={reglas}
            />
          )}
        </div>
      )}
    </div>
  );
}
