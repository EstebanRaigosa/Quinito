import { BarChart3 } from "lucide-react";
import type { FilaTablaPosiciones } from "@/lib/types/dominio";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const MEDALLA: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

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
}: {
  fila: FilaTablaPosiciones | null;
  posicion: number;
  orden: number;
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
        <div
          className="text-xl leading-none opacity-40 grayscale sm:text-2xl"
          aria-hidden
        >
          {MEDALLA[posicion]}
        </div>
        <div className="text-xl font-black leading-none tabular-nums text-fg-subtle sm:text-2xl">
          —
        </div>
        <div className="max-w-full truncate rounded-full border border-dashed border-border bg-surface/70 px-2.5 py-0.5 text-2xs font-bold text-fg-subtle sm:text-xs">
          Libre
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ animationDelay: `${orden * 90}ms` }}
      className={cn(
        "relative flex animate-fade-up w-full flex-col items-center justify-center gap-1.5 overflow-hidden rounded-t-xl px-1.5 pb-2.5 pt-3",
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
        className="animate-pop text-xl leading-none sm:text-2xl"
        aria-hidden
      >
        {MEDALLA[posicion]}
      </div>
      <div
        className={cn(
          "text-2xl font-black leading-none tracking-tight tabular-nums sm:text-3xl",
          tono.texto,
        )}
      >
        {fila.puntos_totales}
      </div>
      {/* Nombre dentro del escalón, en placa de alto contraste. */}
      <div className={PLACA}>{fila.nombre_completo}</div>
    </div>
  );
}

// Rejilla compartida por el encabezado y las filas (alinea las columnas).
// En móvil la barra se oculta, así que la última columna es angosta (solo nº).
const GRID =
  "grid grid-cols-[1.5rem_1fr_2.75rem_2.75rem] items-center gap-2 sm:grid-cols-[2.25rem_1fr_4.5rem_12rem] sm:gap-4";

function FilaTabla({
  fila,
  max,
  indice,
}: {
  fila: FilaTablaPosiciones;
  max: number;
  indice: number;
}) {
  return (
    <li
      style={{ animationDelay: `${indice * 35}ms` }}
      className={cn(
        GRID,
        "animate-fade-up px-3 py-2.5 transition-colors",
        fila.es_actual ? "bg-primary-soft" : "hover:bg-sunken",
      )}
    >
      {/* # */}
      <span
        className={cn(
          "text-sm font-extrabold tabular-nums",
          fila.es_actual ? "text-primary" : "text-fg-subtle",
        )}
      >
        #{fila.posicion}
      </span>

      {/* Jugador */}
      <div className="flex min-w-0 items-center gap-2.5">
        <AvatarNotion
          nombre={fila.nombre_completo}
          size="sm"
          className="ring-2 ring-app"
        />
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-bold text-fg-strong">
            {fila.nombre_completo}
          </span>
          {fila.es_actual && (
            <Badge variant="primary" className="shrink-0">
              Tú
            </Badge>
          )}
        </span>
      </div>

      {/* Aciertos */}
      <span className="text-right text-sm font-bold tabular-nums text-fg-muted">
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
    </li>
  );
}

export function TablaPosiciones({ filas }: { filas: FilaTablaPosiciones[] }) {
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
        <div>
          <h2 className="t-h3">Tabla de posiciones</h2>
          <p className="t-body-sm text-fg-muted">Actualizada en tiempo real</p>
        </div>
        <Badge variant="success" dot className="mt-1 shrink-0">
          En vivo
        </Badge>
      </div>

      {/* Podio: siempre visible; los lugares sin jugador van vacíos. */}
      <div className="grid grid-cols-3 items-end gap-2.5 pt-2 sm:gap-3">
        {ordenPodio.map((s, i) => (
          <Pedestal key={s.posicion} posicion={s.posicion} fila={s.fila} orden={i} />
        ))}
      </div>

      {/* Tabla completa con encabezado de columnas */}
      <div className="overflow-hidden rounded-2xl border border-border">
        <div
          className={cn(
            GRID,
            "border-b border-border bg-sunken px-3 py-2.5 text-2xs font-extrabold uppercase tracking-wide text-fg-subtle",
          )}
        >
          <span>#</span>
          <span>Jugador</span>
          <span className="text-right">Aciertos</span>
          <span>Puntos</span>
        </div>

        <ul className="divide-y divide-border">
          {filas.map((f, i) => (
            <FilaTabla key={f.participante_id} fila={f} max={max} indice={i} />
          ))}
        </ul>
      </div>
    </div>
  );
}
