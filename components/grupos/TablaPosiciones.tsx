"use client";

import { useMemo, useState } from "react";
import { BarChart3, Info } from "lucide-react";
import type {
  CriterioDesempate,
  FilaTablaPosiciones,
  Partido,
  ReglasGrupo,
} from "@/lib/types/dominio";
import type { TablaDesempate } from "@/lib/utils/desempate";
import { construirTablaDesempate } from "@/lib/utils/desempate";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BotonDesempate } from "@/components/grupos/BotonDesempate";
import { DetalleParticipante } from "@/components/grupos/DetalleParticipante";

/** Etiqueta corta para la leyenda del orden de desempate. */
const LABEL_CORTO: Record<CriterioDesempate, string> = {
  exactos: "exactos",
  unicas: "únicas",
  aciertos: "aciertos",
};

const MEDALLA: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/** Chip con el color de la medalla en la columna de puesto de la tabla.
 *  Oro · plata · bronce. */
const MEDALLA_CHIP: Record<1 | 2 | 3, string> = {
  1: "bg-gradient-to-b from-[#FCD34D] to-[#F59E0B] text-[#5A3E00] ring-1 ring-[#F59E0B]/60 shadow-sm",
  2: "bg-gradient-to-b from-clay-200 to-clay-400 text-clay-900 ring-1 ring-clay-400/60 shadow-sm",
  3: "bg-gradient-to-b from-[#E8B27D] to-[#B26B2E] text-white ring-1 ring-[#B26B2E]/60 shadow-sm",
};

/** Medallón del podio: moneda clara con brillo superior, filo hairline y sombra
 *  suave que despega el emoji del escalón. Contrasta sobre cualquier color de
 *  medalla sin el aspecto tosco de un círculo blanco plano. */
const MEDALLON =
  "grid place-items-center rounded-full bg-gradient-to-b from-white via-white to-clay-100 shadow-[0_6px_16px_-5px_rgba(31,20,0,0.55)] ring-1 ring-black/[0.06]";

/** Tonos del podio acordes a la medalla: oro · plata · bronce. */
const PODIO = {
  1: {
    card: "bg-gradient-to-b from-[#FCD34D] to-[#F59E0B] shadow-[0_10px_28px_-8px_rgba(245,158,11,0.55)]",
    texto: "text-[#5A3E00]",
  },
  2: {
    card: "bg-gradient-to-b from-clay-200 to-clay-400 shadow-md",
    texto: "text-clay-900",
  },
  3: {
    card: "bg-gradient-to-b from-[#E8B27D] to-[#B26B2E] shadow-md",
    texto: "text-white",
  },
} as const;

/** Placa del nombre dentro del escalón: banda oscura translúcida con texto
 *  blanco → alto contraste sobre cualquier color de medalla. */
const PLACA =
  "max-w-full truncate rounded-full bg-clay-900/85 px-2.5 py-0.5 text-2xs font-bold text-white shadow-sm ring-1 ring-white/15 backdrop-blur-sm sm:text-xs";

/** Alturas escalonadas: el 1.º domina, plata y bronce más bajos. En móvil son
 *  más bajas para que el podio respire y no se vea apeñuscado. */
const ALTURA: Record<number, string> = {
  1: "h-32 -mt-3 sm:h-40 sm:-mt-4",
  2: "h-28 sm:h-36",
  3: "h-24 sm:h-32",
};

function Pedestal({
  fila,
  posicion,
  orden,
  onSeleccionar,
}: {
  fila: FilaTablaPosiciones | null;
  posicion: number;
  orden: number;
  onSeleccionar: (fila: FilaTablaPosiciones) => void;
}) {
  const esOro = posicion === 1;
  const tono = PODIO[posicion as 1 | 2 | 3] ?? PODIO[3];

  // Slot vacío: aún no hay jugador en esta posición.
  if (!fila) {
    return (
      <div
        style={{ animationDelay: `${orden * 90}ms` }}
        className={cn(
          "flex animate-fade-up w-full flex-col items-center justify-center gap-1.5 rounded-t-xl border border-dashed border-border bg-sunken/60 px-1.5 pb-2.5 pt-3",
          ALTURA[posicion],
        )}
      >
        <div className="animate-pop" aria-hidden>
          <span
            className={cn(
              MEDALLON,
              "size-12 text-2xl leading-none opacity-50 grayscale sm:size-16 sm:text-4xl",
            )}
          >
            {MEDALLA[posicion]}
          </span>
        </div>
        <div className="max-w-full truncate rounded-full border border-dashed border-border bg-surface/70 px-2.5 py-0.5 text-2xs font-bold text-fg-subtle sm:text-xs">
          Libre
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSeleccionar(fila)}
      aria-label={`Ver detalle de ${fila.nombre_completo}`}
      style={{ animationDelay: `${orden * 90}ms` }}
      className={cn(
        "relative flex animate-fade-up w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-t-xl px-1.5 pb-2.5 pt-3 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        ALTURA[posicion],
        tono.card,
      )}
    >
      {esOro && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-gradient-to-r from-transparent via-white/40 to-transparent"
        />
      )}
      <div
        style={{ animationDelay: `${orden * 90 + 250}ms` }}
        className="animate-pop"
        aria-hidden
      >
        <span
          className={cn(
            MEDALLON,
            "size-12 text-2xl leading-none drop-shadow-sm sm:size-16 sm:text-4xl",
          )}
        >
          {MEDALLA[posicion]}
        </span>
      </div>
      {/* Nombre dentro del escalón, en placa de alto contraste. */}
      <div className={PLACA}>{fila.nombre_completo}</div>
    </button>
  );
}

// Rejilla compartida por el encabezado y las filas (alinea las columnas).
// Columnas: # · Jugador · Exactos · Únicas · Aciertos · Puntos.
// En móvil las 3 métricas van en columnas angostas (2rem) y los puntos sin barra
// (2.75rem); en sm se ensanchan y la última columna (12rem) aloja número + barra.
const GRID =
  "grid grid-cols-[1.5rem_1fr_2rem_2rem_2rem_2.75rem] items-center gap-1.5 sm:grid-cols-[2.25rem_1fr_4.5rem_4.5rem_4.5rem_12rem] sm:gap-4";

function FilaTabla({
  fila,
  max,
  indice,
  tablaDesempate,
  onSeleccionar,
}: {
  fila: FilaTablaPosiciones;
  max: number;
  indice: number;
  /** Tabla comparativa de desempate; `null` si la fila no empata en puntos. */
  tablaDesempate: TablaDesempate | null;
  onSeleccionar: (fila: FilaTablaPosiciones) => void;
}) {
  // Patrón "stretched button": un botón en capa de fondo cubre toda la fila y
  // abre el detalle; el contenido va encima sin interceptar clics. Así el botón
  // de desempate (que SÍ intercepta) puede vivir dentro de la fila sin anidar
  // dos <button> (HTML inválido).
  return (
    <li
      style={{ animationDelay: `${indice * 35}ms` }}
      className="relative animate-fade-up"
    >
      {/* Capa de fondo clicable: abre el detalle del participante. */}
      <button
        type="button"
        onClick={() => onSeleccionar(fila)}
        aria-label={`Ver detalle de ${fila.nombre_completo}`}
        className={cn(
          "absolute inset-0 z-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          fila.es_actual ? "bg-primary-soft" : "hover:bg-sunken",
        )}
      />

      {/* Contenido visual: no intercepta clics (pasan al botón de fondo), salvo
          el botón de desempate que reactiva sus propios eventos. */}
      <div
        className={cn(
          GRID,
          "pointer-events-none relative z-[1] min-h-11 px-3 py-2.5",
        )}
      >
        {/* # — top 3 con el color de su medalla; el resto en texto simple. */}
        {fila.posicion <= 3 ? (
          <span
            aria-label={`Puesto ${fila.posicion}`}
            className={cn(
              "grid size-6 place-items-center rounded-full text-xs font-black tabular-nums sm:size-7 sm:text-sm",
              MEDALLA_CHIP[fila.posicion as 1 | 2 | 3],
            )}
          >
            {fila.posicion}
          </span>
        ) : (
          <span
            className={cn(
              "text-sm font-extrabold tabular-nums",
              fila.es_actual ? "text-primary" : "text-fg-subtle",
            )}
          >
            #{fila.posicion}
          </span>
        )}

        {/* Jugador (sin avatar: solo nombre) + botón de desempate si aplica */}
        <div className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-bold text-fg-strong">
              {fila.nombre_completo}
            </span>
            {fila.es_actual && (
              <Badge variant="primary" className="shrink-0">
                Tú
              </Badge>
            )}
            {tablaDesempate && (
              <span className="pointer-events-auto">
                <BotonDesempate
                  tabla={tablaDesempate}
                  esActual={fila.es_actual}
                />
              </span>
            )}
          </span>
        </div>

        {/* Marcadores exactos */}
        <span
          aria-label={`${fila.marcadores_exactos} marcadores exactos`}
          className="text-right text-sm font-bold tabular-nums text-fg-muted"
        >
          {fila.marcadores_exactos}
        </span>

        {/* Predicciones únicas acertadas */}
        <span
          aria-label={`${fila.unicas_acertadas} predicciones únicas`}
          className="text-right text-sm font-bold tabular-nums text-fg-muted"
        >
          {fila.unicas_acertadas}
        </span>

        {/* Aciertos */}
        <span
          aria-label={`${fila.aciertos} aciertos`}
          className="text-right text-sm font-bold tabular-nums text-fg-muted"
        >
          {fila.aciertos}
        </span>

        {/* Puntos + barra */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="w-8 shrink-0 text-right text-base font-black tabular-nums text-fg-strong sm:w-9">
            {fila.puntos_totales}
          </span>
          <div className="hidden h-2 flex-1 overflow-hidden rounded-pill bg-sunken sm:block">
            <div
              className={cn(
                "h-full origin-left animate-grow-x rounded-pill",
                fila.es_actual ? "bg-primary" : "bg-clay-400",
              )}
              style={{ width: `${(fila.puntos_totales / max) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

export function TablaPosiciones({
  filas,
  criterios = ["exactos", "unicas", "aciertos"],
  grupoId,
  partidos,
  reglas,
  esAdmin = false,
}: {
  filas: FilaTablaPosiciones[];
  /** Orden de criterios de desempate del grupo (para explicar el motivo). */
  criterios?: CriterioDesempate[];
  grupoId: string;
  partidos: Partido[];
  reglas: ReglasGrupo;
  /** Admin del grupo o superadmin: solo ellos ven el botón de desempate. */
  esAdmin?: boolean;
}) {
  const [seleccionada, setSeleccionada] = useState<FilaTablaPosiciones | null>(
    null,
  );

  // Tabla de desempate por participante (solo para quienes empatan en puntos).
  // Se calcula una vez sobre la tabla completa, ya ordenada.
  // Debe ir ANTES de cualquier early return (regla de hooks).
  // Solo el admin del grupo / superadmin ve el botón → si no, mapa vacío.
  const desempates = useMemo(() => {
    const m = new Map<string, TablaDesempate>();
    if (!esAdmin) return m;
    for (const f of filas) {
      const t = construirTablaDesempate(f, filas, criterios);
      if (t) m.set(f.participante_id, t);
    }
    return m;
  }, [filas, criterios, esAdmin]);

  if (filas.length === 0) {
    return (
      <EmptyState
        icono={BarChart3}
        titulo="Aún no hay puntos"
        descripcion="La tabla se llena cuando empiecen los partidos y se calculen los puntajes."
      />
    );
  }

  const max = Math.max(...filas.map((f) => f.puntos_totales), 1);
  // Orden visual del podio: 2.º · 1.º · 3.º (el campeón al centro y elevado).
  // Se muestra siempre (con al menos 1 jugador); los lugares faltantes van vacíos.
  const ordenPodio = [
    { posicion: 2, fila: filas[1] ?? null },
    { posicion: 1, fila: filas[0] ?? null },
    { posicion: 3, fila: filas[2] ?? null },
  ];

  return (
    <div className="space-y-5">
      {/* Encabezado de la sección con estado "En vivo" */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="t-h3">Tabla de posiciones</h2>
          <p className="t-body-sm text-fg-muted">Actualizada en tiempo real</p>
          {/* Leyenda visible para todos: cómo se rompen los empates de puntos. */}
          {criterios.length > 0 && (
            <p className="t-caption mt-1.5 flex items-center gap-1 text-fg-subtle">
              <Info className="size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="font-semibold">Desempate:</span>{" "}
                {criterios.map((c) => LABEL_CORTO[c]).join(" › ")}
              </span>
            </p>
          )}
        </div>
        <Badge variant="success" dot className="mt-1 shrink-0">
          En vivo
        </Badge>
      </div>

      {/* Podio: siempre visible; los lugares sin jugador van vacíos. */}
      <div className="grid grid-cols-3 items-end gap-2.5 pt-2 sm:gap-3">
        {ordenPodio.map((s, i) => (
          <Pedestal
            key={s.posicion}
            posicion={s.posicion}
            fila={s.fila}
            orden={i}
            onSeleccionar={setSeleccionada}
          />
        ))}
      </div>

      {/* Tabla completa con encabezado de columnas */}
      <div className="overflow-hidden rounded-2xl border border-border">
        <div
          className={cn(
            GRID,
            "border-b border-border bg-sunken px-3 py-2.5 text-2xs font-extrabold uppercase tracking-normal text-fg-subtle sm:tracking-wide",
          )}
        >
          <span>#</span>
          <span>Jugador</span>
          <span className="text-right">
            <span className="sm:hidden">Exa</span>
            <span className="hidden sm:inline">Exactos</span>
          </span>
          <span className="text-right">
            <span className="sm:hidden">Úni</span>
            <span className="hidden sm:inline">Únicas</span>
          </span>
          <span className="text-right">
            <span className="sm:hidden">Aci</span>
            <span className="hidden sm:inline">Aciertos</span>
          </span>
          <span>Puntos</span>
        </div>

        <ul className="divide-y divide-border">
          {filas.map((f, i) => (
            <FilaTabla
              key={f.participante_id}
              fila={f}
              max={max}
              indice={i}
              tablaDesempate={desempates.get(f.participante_id) ?? null}
              onSeleccionar={setSeleccionada}
            />
          ))}
        </ul>
      </div>

      {/* Detalle del participante seleccionado (bottom sheet). */}
      <DetalleParticipante
        abierto={!!seleccionada}
        onOpenChange={(v) => !v && setSeleccionada(null)}
        fila={seleccionada}
        grupoId={grupoId}
        partidos={partidos}
        reglas={reglas}
      />
    </div>
  );
}
