"use client";

import { ChevronDown } from "lucide-react";
import type { Partido, Prediccion, ReglasGrupo } from "@/lib/types/dominio";
import { desglosePuntaje, nivelAcierto } from "@/lib/utils/prediccion";
import { IconoAcierto } from "@/components/partidos/IconoAcierto";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Badge de puntaje (+N pts). Al hacer clic abre el desglose: cada concepto que
 * puntuó, por qué y cuánto. Si no hay reglas (no se puede calcular), muestra el
 * badge sin interacción.
 */
export function PuntajeDesglose({
  prediccion,
  partido,
  reglas,
}: {
  prediccion: Prediccion;
  partido: Partido;
  reglas?: ReglasGrupo;
}) {
  // Badge siempre esmeralda cuando suma puntos; el TIPO de acierto se distingue
  // con un icono (diana = exacto, corona = único, check = parcial).
  const nivel = nivelAcierto(prediccion, partido);
  const variante = nivel === "ninguno" ? "neutral" : "gold";

  if (!reglas) {
    return (
      <Badge variant={variante}>
        <IconoAcierto nivel={nivel} />+{prediccion.puntos_obtenidos} pts
      </Badge>
    );
  }

  const items = desglosePuntaje(prediccion, partido, reglas);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Ver desglose de puntos"
          className="rounded-pill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Badge
            variant={variante}
            className="cursor-pointer transition-transform active:scale-95"
          >
            <IconoAcierto nivel={nivel} />+{prediccion.puntos_obtenidos} pts
            <ChevronDown className="size-3 opacity-80" />
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-0">
        <div className="border-b border-border px-3.5 py-2.5">
          <p className="t-caption font-bold uppercase tracking-wide text-fg-subtle">
            Desglose de puntos
          </p>
        </div>

        {items.length === 0 ? (
          <p className="px-3.5 py-3 text-sm text-fg-muted">
            No sumaste puntos en este partido.
          </p>
        ) : (
          <ul className="px-3.5 py-2.5">
            {items.map((it, i) => (
              <li
                key={i}
                className="flex items-start justify-between gap-3 py-1.5"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-fg-strong">
                    {it.label}
                  </span>
                  <span className="block text-2xs text-fg-muted">
                    {it.motivo}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-extrabold tabular-nums text-primary">
                  +{it.puntos}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between border-t border-border px-3.5 py-2.5">
          <span className="text-sm font-bold text-fg-strong">Total</span>
          <span className="text-base font-extrabold tabular-nums text-fg-strong">
            +{prediccion.puntos_obtenidos}
          </span>
        </div>
      </PopoverContent>
    </Popover>
  );
}
