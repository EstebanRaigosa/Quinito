"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronRight, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type SeccionTorneo = {
  id: string;
  nombre: string;
  /** Partidos con equipos definidos (registrables). */
  totalPartidos: number;
  /** Partidos ya finalizados (con resultado). */
  registrados: number;
  /** Lista de partidos del torneo ya renderizada en el server. */
  contenido: ReactNode;
};

/**
 * Selector de torneo en cards + lista de partidos a registrar. El admin escoge
 * el torneo tocando su card y solo se muestran sus partidos. El contenido de
 * cada torneo llega pre-renderizado desde el RSC (page.tsx).
 */
export function PanelResultados({ secciones }: { secciones: SeccionTorneo[] }) {
  const [activo, setActivo] = useState<string>(secciones[0]?.id ?? "");

  if (secciones.length === 0) {
    return (
      <div className="surface-card rounded-2xl p-6 text-center text-fg-muted">
        <p className="t-body-sm">Aún no hay torneos con partidos para registrar.</p>
      </div>
    );
  }

  const seccionActiva = secciones.find((s) => s.id === activo) ?? secciones[0];

  return (
    <div className="space-y-6">
      {/* Cards selectoras de torneo */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {secciones.map((s) => {
          const seleccionado = s.id === seccionActiva.id;
          const completo = s.totalPartidos > 0 && s.registrados === s.totalPartidos;
          const pct = s.totalPartidos
            ? Math.round((s.registrados / s.totalPartidos) * 100)
            : 0;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActivo(s.id)}
              aria-pressed={seleccionado}
              className={cn(
                "group surface-card relative overflow-hidden rounded-2xl p-4 text-left transition-all duration-200 active:scale-[0.98]",
                seleccionado
                  ? "ring-2 ring-primary"
                  : "hover:-translate-y-0.5 hover:shadow-md",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                    seleccionado
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-fg-muted group-hover:text-primary",
                  )}
                >
                  <Trophy className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="t-body-sm truncate font-bold text-fg-strong">
                    {s.nombre}
                  </p>
                  <p className="t-caption mt-0.5 flex items-center gap-1 text-fg-muted">
                    {completo ? (
                      <>
                        <Check className="size-3.5 text-success" /> Todos
                        registrados
                      </>
                    ) : (
                      <>
                        {s.registrados} de {s.totalPartidos} registrados
                      </>
                    )}
                  </p>
                </div>
                <ChevronRight
                  className={cn(
                    "size-4 shrink-0 transition-colors",
                    seleccionado ? "text-primary" : "text-fg-subtle",
                  )}
                />
              </div>

              {/* Barra de progreso */}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    completo ? "bg-success" : "bg-primary",
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Partidos del torneo seleccionado */}
      <section className="space-y-2.5">
        <h2 className="t-h3 text-fg-strong">{seccionActiva.nombre}</h2>
        {seccionActiva.contenido}
      </section>
    </div>
  );
}
