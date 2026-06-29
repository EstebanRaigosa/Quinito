"use client";

import { useState, useTransition } from "react";
import { CalendarDays, Eye, EyeOff, FlaskConical, MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatearFechaCorta } from "@/lib/utils/fechas";
import {
  cambiarVisibilidadTorneo,
  type VisibilidadTorneo,
} from "./actions";

export type TorneoAdmin = {
  id: string;
  nombre: string;
  codigo: string;
  pais_sede: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  /** Estado derivado de (activo, es_prueba) en el servidor. */
  visibilidad: VisibilidadTorneo;
};

/** Opciones del selector, en orden de mayor a menor exposición. */
const OPCIONES: {
  valor: VisibilidadTorneo;
  etiqueta: string;
  Icono: typeof Eye;
  /** Clases del botón cuando está seleccionado. */
  activo: string;
}[] = [
  { valor: "disponible", etiqueta: "Disponible", Icono: Eye, activo: "bg-success text-success-foreground" },
  { valor: "pruebas", etiqueta: "Pruebas", Icono: FlaskConical, activo: "bg-warning text-warning-foreground" },
  { valor: "oculto", etiqueta: "Oculto", Icono: EyeOff, activo: "bg-secondary text-secondary-foreground" },
];

/** Texto de confirmación al cambiar de estado. */
const MENSAJE: Record<VisibilidadTorneo, (n: string) => string> = {
  disponible: (n) => `"${n}" ahora está disponible para todos`,
  pruebas: (n) => `"${n}" quedó en modo pruebas (solo lo ves tú)`,
  oculto: (n) => `"${n}" se ocultó del wizard`,
};

/**
 * Lista de torneos con un selector de 3 estados por torneo (Disponible /
 * Pruebas / Oculto) que controla su visibilidad en el wizard de creación de
 * pollas. El estado se mantiene en cliente para feedback inmediato y se revierte
 * si el server action falla.
 */
export function ListaTorneos({ torneos }: { torneos: TorneoAdmin[] }) {
  const [estado, setEstado] = useState<Record<string, VisibilidadTorneo>>(() =>
    Object.fromEntries(torneos.map((t) => [t.id, t.visibilidad])),
  );
  const [guardando, startTransition] = useTransition();

  function cambiar(torneo: TorneoAdmin, siguiente: VisibilidadTorneo) {
    const previo = estado[torneo.id]!;
    if (siguiente === previo) return;
    // Optimista: refleja el cambio de inmediato.
    setEstado((s) => ({ ...s, [torneo.id]: siguiente }));

    startTransition(async () => {
      const res = await cambiarVisibilidadTorneo({
        torneoId: torneo.id,
        visibilidad: siguiente,
      });
      if (!res.ok) {
        setEstado((s) => ({ ...s, [torneo.id]: previo }));
        toast.error(res.error ?? "No se pudo actualizar el torneo");
        return;
      }
      toast.success(MENSAJE[siguiente](torneo.nombre));
    });
  }

  return (
    <ul className="space-y-3">
      {torneos.map((torneo) => {
        const actual = estado[torneo.id]!;
        return (
          <li key={torneo.id} className="surface-card rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="t-h4 truncate">{torneo.nombre}</h2>
                <p className="t-caption mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-fg-muted">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {formatearFechaCorta(torneo.fecha_inicio)} –{" "}
                    {formatearFechaCorta(torneo.fecha_fin)}
                  </span>
                  {torneo.pais_sede && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden />
                      {torneo.pais_sede}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Botones de visibilidad (radiogroup accesible). */}
            <div
              role="radiogroup"
              aria-label={`Visibilidad de ${torneo.nombre}`}
              className="mt-3 grid grid-cols-3 gap-2"
            >
              {OPCIONES.map(({ valor, etiqueta, Icono, activo }) => {
                const seleccionado = actual === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={seleccionado}
                    disabled={guardando}
                    onClick={() => cambiar(torneo, valor)}
                    className={cn(
                      "flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-sm font-semibold transition-all active:scale-[0.97]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      seleccionado
                        ? cn(activo, "border-transparent shadow-sm")
                        : "border-border bg-card text-fg-muted hover:border-fg-subtle/40 hover:bg-muted/50",
                    )}
                  >
                    <Icono className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{etiqueta}</span>
                  </button>
                );
              })}
            </div>

            {actual === "pruebas" && (
              <p className="t-caption mt-2 flex items-center gap-1.5 text-warning">
                <FlaskConical className="size-3.5 shrink-0" aria-hidden />
                Solo visible para el superadmin, con etiqueta “Pruebas”.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
