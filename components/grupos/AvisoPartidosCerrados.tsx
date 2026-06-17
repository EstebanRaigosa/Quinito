"use client";

import { useSyncExternalStore } from "react";
import { AlertTriangle, ArrowRight, Flag, X } from "lucide-react";
import { formatearFechaCorta } from "@/lib/utils/fechas";
import { Button } from "@/components/ui/button";
import { Flag as Bandera } from "@/components/shared/Flag";
import { useGrupoTabs } from "@/components/grupos/grupo-tabs-context";

/** Datos mínimos de un partido cerrado al crear, para listarlo en el aviso. */
export type PartidoCerradoAviso = {
  id: string;
  local: string;
  /** ISO-3 del local (null si aún es un placeholder "por definir"). */
  localIso: string | null;
  visitante: string;
  visitanteIso: string | null;
  fecha_hora: string;
};

/** Cuántos partidos se listan antes de resumir el resto en "+N más". */
const MAX_LISTA = 6;

/** Prefijo de la clave de localStorage que recuerda el descarte por grupo. */
const CLAVE_DESCARTE = "polla:aviso-arranque-descartado:";

// Suscriptores locales del descarte: localStorage NO emite el evento "storage"
// en la misma pestaña al hacer setItem, así que llevamos nuestro propio registro
// para re-renderizar el aviso cuando ESTA pestaña lo descarta. El evento
// "storage" del navegador cubre además el caso multipestaña.
const suscriptores = new Set<() => void>();

function suscribir(cb: () => void): () => void {
  suscriptores.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    suscriptores.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function leerDescartado(clave: string): boolean {
  try {
    return window.localStorage.getItem(clave) === "1";
  } catch {
    // Safari iOS en modo privado puede bloquear localStorage: ante el fallo
    // mostramos el aviso (no es crítico recordar el descarte).
    return false;
  }
}

function descartarEnStorage(clave: string): void {
  try {
    window.localStorage.setItem(clave, "1");
  } catch {
    // Si no se puede persistir, el aviso volverá a aparecer; aceptable.
  }
  suscriptores.forEach((cb) => cb());
}

/** Una fila de partido: banderas a los lados, nombres al centro, fecha en chip. */
function FilaPartido({ partido }: { partido: PartidoCerradoAviso }) {
  return (
    <li className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-2.5 py-2 shadow-sm">
      {/* Local: nombre + bandera (alineado a la derecha, hacia el centro). */}
      <span className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
        <span className="truncate t-caption font-bold text-fg-strong">
          {partido.local}
        </span>
        <Bandera code={partido.localIso} size={20} />
      </span>

      <span className="shrink-0 rounded-md bg-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fg-subtle">
        vs
      </span>

      {/* Visitante: bandera + nombre (alineado a la izquierda, hacia el centro). */}
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        <Bandera code={partido.visitanteIso} size={20} />
        <span className="truncate t-caption font-bold text-fg-strong">
          {partido.visitante}
        </span>
      </span>

      <span className="ml-1 shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold tabular-nums text-warning">
        {formatearFechaCorta(partido.fecha_hora)}
      </span>
    </li>
  );
}

/**
 * Aviso (solo admin) que aparece cuando la polla se creó con partidos que YA
 * estaban cerrados: nadie pudo predecirlos dentro de la app, así que el admin
 * debe cargar manualmente los "puntos de arranque" de cada participante en la
 * sección Participantes. Lista esos partidos (con banderas) y un botón que abre
 * dicha sección e inicia un recorrido guiado hasta el botón "Arranque".
 *
 * Es descartable y el descarte se recuerda por grupo en el navegador. Lee ese
 * estado con `useSyncExternalStore` para ser seguro en SSR (snapshot de
 * servidor = no descartado) sin desfase de hidratación.
 */
export function AvisoPartidosCerrados({
  grupoId,
  partidos,
}: {
  grupoId: string;
  partidos: PartidoCerradoAviso[];
}) {
  const { irAParticipantes } = useGrupoTabs();
  const clave = CLAVE_DESCARTE + grupoId;
  const descartado = useSyncExternalStore(
    suscribir,
    () => leerDescartado(clave),
    () => false, // En servidor no hay localStorage: el aviso se muestra.
  );

  if (descartado || partidos.length === 0) return null;

  const visibles = partidos.slice(0, MAX_LISTA);
  const restantes = partidos.length - visibles.length;
  const n = partidos.length;

  return (
    <div
      role="status"
      className="animate-fade-up relative mb-5 overflow-hidden rounded-2xl border border-warning/30 bg-gradient-to-b from-warning-soft to-card shadow-md ring-1 ring-inset ring-warning/10"
    >
      {/* Barra de acento superior. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-warning via-warning/70 to-warning/30"
      />
      {/* Glow decorativo. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full bg-warning/15 blur-3xl"
      />

      <div className="relative p-4 pt-5">
        {/* Encabezado. */}
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-warning text-warning-foreground shadow-sm">
            <AlertTriangle className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="t-h3 leading-tight text-fg-strong">
                Partidos cerrados al crear
              </h3>
              <span className="shrink-0 rounded-full bg-warning px-2 py-0.5 text-2xs font-bold text-warning-foreground shadow-sm">
                {n}
              </span>
            </div>
            <p className="t-caption mt-1 leading-snug text-fg-muted">
              Nadie pudo predecir{" "}
              {n === 1 ? "este partido" : "estos partidos"} en la app. Si la
              polla venía de antes (Excel u otra app), carga los{" "}
              <b className="font-bold text-fg-strong">puntos de arranque</b> de
              cada jugador con el botón{" "}
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-card px-1.5 py-0.5 align-middle font-semibold text-fg-strong ring-1 ring-inset ring-border">
                <Flag className="size-3" aria-hidden /> Arranque
              </span>
              .
            </p>
          </div>

          {/* Cierre rápido (equivale a "Entendido"). */}
          <button
            type="button"
            onClick={() => descartarEnStorage(clave)}
            aria-label="Descartar aviso"
            className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-full text-fg-subtle transition-colors hover:bg-card hover:text-fg-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {/* Lista de partidos con banderas. */}
        <ul className="mt-3.5 space-y-1.5">
          {visibles.map((p) => (
            <FilaPartido key={p.id} partido={p} />
          ))}
          {restantes > 0 && (
            <li className="t-caption pl-1 pt-0.5 font-medium text-fg-subtle">
              y {restantes} {restantes === 1 ? "partido más" : "partidos más"}…
            </li>
          )}
        </ul>

        {/* Acciones. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={irAParticipantes}>
            Ir a participantes
            <ArrowRight className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => descartarEnStorage(clave)}
          >
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
}
