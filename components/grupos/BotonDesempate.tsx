"use client";

import { ArrowDown, Scale } from "lucide-react";
import type { TablaDesempate } from "@/lib/utils/desempate";
import {
  ABREV_CRITERIO,
  DESC_CRITERIO,
  MOTIVO_CRITERIO,
} from "@/lib/utils/desempate";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Primer nombre, para que la columna de jugador no se desborde. */
function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/**
 * Botón sutil que solo aparece en filas EMPATADAS en puntos (y solo para
 * admin/superadmin, controlado por el componente padre). Abre un panel con una
 * tabla comparativa: cómo está cada participante empatado en cada criterio de
 * desempate, resaltando la celda que define su posición.
 */
export function BotonDesempate({
  tabla,
  esActual,
}: {
  tabla: TablaDesempate;
  esActual: boolean;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Ver tabla de desempate"
          className={cn(
            // size-6 visual; `before:-inset-2.5` extiende el área de toque a
            // ~44px (regla móvil §3.3) sin alterar el layout de la fila.
            "relative grid size-6 shrink-0 place-items-center rounded-full ring-1 transition-colors before:absolute before:-inset-2.5 before:content-[''] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            esActual
              ? "bg-primary/10 text-primary ring-primary/30"
              : "bg-sunken text-fg-subtle ring-border hover:text-fg-muted",
          )}
        >
          <Scale className="size-3.5" aria-hidden />
        </button>
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className={cn(
          "flex max-h-[85dvh] flex-col p-0",
          "sm:inset-0 sm:m-auto sm:h-fit sm:max-h-[80dvh] sm:max-w-xl sm:rounded-2xl sm:border",
        )}
      >
        <SheetHeader className="gap-1 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Scale className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            Desempate
          </SheetTitle>
          <p className="text-sm font-semibold text-fg-muted">
            Empate a{" "}
            <span className="font-bold text-fg-strong">{tabla.puntos} pts</span>{" "}
            · {tabla.filas.length} participantes
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain pb-safe">
          {/* Explicación en lenguaje claro: una frase por cada salto entre
              participantes consecutivos del empate. */}
          <p className="px-4 pt-3 text-2xs font-extrabold uppercase tracking-wide text-fg-subtle">
            Por qué este orden
          </p>
          <ol className="space-y-2 px-4 pb-3 pt-2">
            {tabla.filas.map((f, idx) => {
              if (idx === 0) return null;
              const arriba = tabla.filas[idx - 1]!;
              const c = f.criterioDecisivo;
              const motivo = MOTIVO_CRITERIO[c ?? "tecnico"];
              // Valores solo cuando el criterio es numérico (no tiempo/técnico).
              const muestraValores = c !== null && c !== "tiempo";
              return (
                <li
                  key={f.participante_id}
                  className="flex items-start gap-2 rounded-xl bg-sunken/60 px-3 py-2"
                >
                  <ArrowDown
                    className="mt-0.5 size-4 shrink-0 text-fg-subtle"
                    aria-hidden
                  />
                  <p className="min-w-0 text-sm text-fg-muted">
                    <span className="font-bold text-fg-strong">
                      {primerNombre(arriba.nombre)}
                    </span>{" "}
                    va por delante de{" "}
                    <span className="font-bold text-fg-strong">
                      {primerNombre(f.nombre)}
                    </span>{" "}
                    por <span className="font-semibold text-primary">{motivo}</span>
                    {muestraValores && (
                      <span className="text-fg-subtle">
                        {" "}
                        ({arriba.valores[c!]} vs {f.valores[c!]})
                      </span>
                    )}
                    .
                  </p>
                </li>
              );
            })}
          </ol>

          {/* Tabla comparativa con scroll horizontal en pantallas angostas. */}
          <p className="border-t border-border px-4 pt-3 text-2xs font-extrabold uppercase tracking-wide text-fg-subtle">
            Detalle por criterio
          </p>
          <div className="overflow-x-auto px-3 py-3">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-2xs font-extrabold uppercase tracking-normal text-fg-subtle">
                  <th className="sticky left-0 z-[1] bg-surface px-2 py-2 text-left">
                    Jugador
                  </th>
                  {tabla.criterios.map((c) => (
                    <th
                      key={c}
                      className="px-1.5 py-2 text-center tabular-nums"
                      title={DESC_CRITERIO[c]}
                    >
                      {ABREV_CRITERIO[c]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabla.filas.map((f) => (
                  <tr
                    key={f.participante_id}
                    className={cn(
                      "border-t border-border/60",
                      f.esObjetivo && "bg-primary-soft",
                    )}
                  >
                    {/* Jugador (columna fija a la izquierda) */}
                    <th
                      scope="row"
                      className={cn(
                        "sticky left-0 z-[1] px-2 py-2 text-left font-bold",
                        f.esObjetivo ? "bg-primary-soft" : "bg-surface",
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-sunken text-2xs font-black tabular-nums text-fg-muted">
                          {f.posicion}
                        </span>
                        <span className="truncate text-fg-strong">
                          {primerNombre(f.nombre)}
                        </span>
                        {f.esActual && (
                          <Badge variant="primary" className="shrink-0">
                            Tú
                          </Badge>
                        )}
                      </span>
                    </th>

                    {/* Una celda por criterio; se resalta la que decide su puesto */}
                    {tabla.criterios.map((c) => {
                      const decide = c === f.criterioDecisivo;
                      return (
                        <td
                          key={c}
                          className={cn(
                            "px-1.5 py-2 text-center tabular-nums",
                            decide
                              ? "rounded-md bg-primary/15 font-black text-primary ring-1 ring-inset ring-primary/30"
                              : "font-semibold text-fg-muted",
                          )}
                        >
                          {f.valores[c]}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Nota + leyenda de las abreviaturas */}
          <div className="space-y-2.5 border-t border-border px-4 py-3">
            <p className="text-2xs text-fg-subtle">
              La celda resaltada es el criterio que ubica a ese jugador por encima
              del de arriba. Las columnas van en el orden real de desempate.
            </p>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
              {tabla.criterios.map((c) => (
                <li
                  key={c}
                  className="flex items-baseline gap-1.5 text-2xs text-fg-muted"
                >
                  <span className="shrink-0 font-bold text-fg-strong">
                    {ABREV_CRITERIO[c]}
                  </span>
                  <span className="min-w-0">{DESC_CRITERIO[c]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
