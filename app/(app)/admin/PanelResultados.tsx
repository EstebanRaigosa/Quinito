"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CalendarDays, Check, ChevronRight, Trophy } from "lucide-react";
import { ETIQUETA_FASE, type FaseTorneo } from "@/lib/types/dominio";
import { cn } from "@/lib/utils";

/** Un partido pre-renderizado con la metadata que el filtro necesita. */
export type PartidoSeccion = {
  id: string;
  fase: FaseTorneo;
  /** True si el partido se juega hoy (zona Bogotá, calculado en el server). */
  esHoy: boolean;
  /** Fila ya renderizada en el server (FilaResultado o placeholder). */
  nodo: ReactNode;
};

export type SeccionTorneo = {
  id: string;
  nombre: string;
  /** Partidos con equipos definidos (registrables). */
  totalPartidos: number;
  /** Partidos ya finalizados (con resultado). */
  registrados: number;
  /** Lista de partidos del torneo, cada uno con su metadata de filtro. */
  partidos: PartidoSeccion[];
};

/** Orden canónico de fases para los chips del filtro. */
const ORDEN_FASES: FaseTorneo[] = [
  "fase_grupos",
  "dieciseisavos",
  "octavos",
  "cuartos",
  "semifinales",
  "tercer_lugar",
  "final",
];

/** Etiqueta corta para no saturar los chips en mobile. */
const ETIQUETA_FASE_CORTA: Record<FaseTorneo, string> = {
  fase_grupos: "Grupos",
  dieciseisavos: "Dieciseisavos",
  octavos: "Octavos",
  cuartos: "Cuartos",
  semifinales: "Semis",
  tercer_lugar: "3er lugar",
  final: "Final",
};

type FiltroFase = FaseTorneo | "todas";

function Chip({
  activo,
  onClick,
  children,
  "aria-label": ariaLabel,
}: {
  activo: boolean;
  onClick: () => void;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border-2 px-3.5 text-sm font-bold transition-colors active:scale-[0.97]",
        activo
          ? "border-primary bg-primary text-primary-foreground"
          : "border-strong bg-surface text-fg-strong hover:border-primary/50",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Selector de torneo en cards + lista de partidos a registrar. El admin escoge
 * el torneo tocando su card y solo se muestran sus partidos. El contenido de
 * cada torneo llega pre-renderizado desde el RSC (page.tsx) y el panel lo filtra
 * en cliente por "Hoy" y por fase.
 */
export function PanelResultados({ secciones }: { secciones: SeccionTorneo[] }) {
  const [activo, setActivo] = useState<string>(secciones[0]?.id ?? "");
  // Filtros (se reinician al cambiar de torneo).
  const [soloHoy, setSoloHoy] = useState(false);
  const [faseFiltro, setFaseFiltro] = useState<FiltroFase>("todas");

  function seleccionarTorneo(id: string) {
    setActivo(id);
    setSoloHoy(false);
    setFaseFiltro("todas");
  }

  const seccionActiva =
    secciones.find((s) => s.id === activo) ?? secciones[0];

  // Fases presentes en el torneo activo (en orden canónico), para los chips.
  const fasesDisponibles = useMemo(() => {
    if (!seccionActiva) return [];
    const presentes = new Set(seccionActiva.partidos.map((p) => p.fase));
    return ORDEN_FASES.filter((f) => presentes.has(f));
  }, [seccionActiva]);

  const hayPartidosHoy = useMemo(
    () => Boolean(seccionActiva?.partidos.some((p) => p.esHoy)),
    [seccionActiva],
  );

  const partidosFiltrados = useMemo(() => {
    if (!seccionActiva) return [];
    return seccionActiva.partidos.filter((p) => {
      if (soloHoy && !p.esHoy) return false;
      if (faseFiltro !== "todas" && p.fase !== faseFiltro) return false;
      return true;
    });
  }, [seccionActiva, soloHoy, faseFiltro]);

  if (secciones.length === 0) {
    return (
      <div className="surface-card rounded-2xl p-6 text-center text-fg-muted">
        <p className="t-body-sm">Aún no hay torneos con partidos para registrar.</p>
      </div>
    );
  }

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
              onClick={() => seleccionarTorneo(s.id)}
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
      <section className="space-y-3">
        <h2 className="t-h3 text-fg-strong">{seccionActiva.nombre}</h2>

        {/* Filtros: Hoy + por fase. Scroll horizontal en mobile. */}
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          <Chip
            activo={soloHoy}
            onClick={() => setSoloHoy((v) => !v)}
            aria-label="Mostrar solo los partidos de hoy"
          >
            <CalendarDays className="size-4" /> Hoy
          </Chip>

          <span aria-hidden className="h-6 w-px shrink-0 bg-border" />

          <Chip activo={faseFiltro === "todas"} onClick={() => setFaseFiltro("todas")}>
            Todas
          </Chip>
          {fasesDisponibles.map((f) => (
            <Chip
              key={f}
              activo={faseFiltro === f}
              onClick={() => setFaseFiltro(f)}
              aria-label={ETIQUETA_FASE[f]}
            >
              {ETIQUETA_FASE_CORTA[f]}
            </Chip>
          ))}
        </div>

        {partidosFiltrados.length > 0 ? (
          <div className="space-y-2.5">
            {partidosFiltrados.map((p) => p.nodo)}
          </div>
        ) : (
          <div className="surface-card rounded-2xl p-6 text-center text-fg-muted">
            <p className="t-body-sm">
              {soloHoy && !hayPartidosHoy
                ? "No hay partidos programados para hoy en este torneo."
                : "Ningún partido coincide con el filtro seleccionado."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
