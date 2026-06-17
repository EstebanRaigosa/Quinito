"use client";

import { useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGrupoTabs } from "@/components/grupos/grupo-tabs-context";

/** Selector del botón objetivo: el primer "Arranque" del listado. */
const SELECTOR_OBJETIVO = '[data-tour="arranque"]';

/** Rectángulo del objetivo en coordenadas de viewport (para `position: fixed`). */
type Rect = { top: number; left: number; width: number; height: number };

/** Padding del halo alrededor del botón resaltado. */
const HALO = 6;

/**
 * Recorrido guiado de un solo paso que señala el botón "Arranque": oscurece el
 * resto de la pantalla con un "spotlight" recortado sobre el botón y muestra un
 * globo explicativo. Se activa cuando el aviso de partidos cerrados al crear
 * pide "Ir a participantes" (`useGrupoTabs().irAParticipantes`).
 *
 * No usa librerías de tour: el oscurecido es un `box-shadow` gigante sobre una
 * caja transparente (sin capturar punteros), así el botón real sigue siendo
 * clicable. Sigue al objetivo al hacer scroll/resize y termina al pulsar
 * "Entendido", al abrir el modal de arranque o si el objetivo desaparece.
 */
export function RecorridoArranque() {
  const { tourArranque, finalizarTour } = useGrupoTabs();
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!tourArranque) return;

    let cancelado = false;
    let intentos = 0;

    const objetivo = () =>
      document.querySelector<HTMLElement>(SELECTOR_OBJETIVO);

    /** Reposiciona el spotlight sobre el objetivo; lo cierra si ya no existe. */
    const medir = () => {
      if (cancelado) return;
      const el = objetivo();
      if (!el) {
        finalizarTour();
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    /**
     * Espera a que monte el contenido de "Participantes" (Radix monta la
     * pestaña al activarla), centra el botón en pantalla y mide. Reintenta unas
     * veces; si nunca aparece, no hay recorrido.
     */
    const buscar = () => {
      if (cancelado) return;
      const el = objetivo();
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Mide ya y otra vez cuando el scroll suave haya terminado.
        medir();
        window.setTimeout(medir, 380);
        return;
      }
      if (intentos++ < 20) window.setTimeout(buscar, 100);
      else finalizarTour();
    };
    buscar();

    // Mantener el spotlight pegado al botón mientras se hace scroll/resize. El
    // `true` (captura) atrapa también scrolls de contenedores internos.
    const onMover = () => medir();
    window.addEventListener("scroll", onMover, true);
    window.addEventListener("resize", onMover);

    return () => {
      cancelado = true;
      window.removeEventListener("scroll", onMover, true);
      window.removeEventListener("resize", onMover);
      // Limpia el rect en el teardown (no en el cuerpo del effect) para que al
      // reactivar el recorrido no parpadee la posición anterior.
      setRect(null);
    };
  }, [tourArranque, finalizarTour]);

  if (!tourArranque || !rect) return null;

  // Globo bajo el botón (queda centrado en pantalla, así que hay espacio).
  // Ancho acotado al viewport y posición horizontal sujeta a los bordes.
  const anchoGlobo = Math.min(320, window.innerWidth - 24);
  const globoTop = rect.top + rect.height + HALO + 14;
  const globoLeft = Math.min(
    Math.max(rect.left, 12),
    window.innerWidth - anchoGlobo - 12,
  );

  return (
    // Contenedor sin captura de punteros: el oscurecido no bloquea, así el
    // botón "Arranque" real sigue siendo clicable bajo el recorte.
    <div className="pointer-events-none fixed inset-0 z-[60]" role="presentation">
      {/* Spotlight: caja transparente con sombra gigante = oscurece el resto. */}
      <div
        aria-hidden
        className="absolute rounded-xl ring-2 ring-warning ring-offset-0 transition-all duration-200"
        style={{
          top: rect.top - HALO,
          left: rect.left - HALO,
          width: rect.width + HALO * 2,
          height: rect.height + HALO * 2,
          boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
        }}
      />

      {/* Globo explicativo. */}
      <div
        className="animate-fade-up pointer-events-auto absolute rounded-2xl border border-warning/40 bg-card p-4 shadow-xl"
        style={{ top: globoTop, left: globoLeft, width: anchoGlobo }}
      >
        {/* Flecha apuntando al botón. */}
        <span
          aria-hidden
          className="absolute -top-1.5 size-3 rotate-45 border-l border-t border-warning/40 bg-card"
          style={{
            left: Math.min(
              Math.max(rect.left + rect.width / 2 - globoLeft - 6, 14),
              anchoGlobo - 20,
            ),
          }}
        />
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-warning/20 text-warning">
            <Flag className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="t-body-sm font-bold text-fg-strong">
              Carga el arranque aquí
            </p>
            <p className="t-caption mt-1 leading-snug text-fg-muted">
              Toca <b className="font-bold text-fg-strong">Arranque</b> en cada
              jugador para registrar los puntos que ya traía de los partidos
              cerrados.
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={finalizarTour}>
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
}
