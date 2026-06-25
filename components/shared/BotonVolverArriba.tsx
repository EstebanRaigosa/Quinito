"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Botón flotante "volver arriba". Aparece cuando el usuario baja más allá de un
 * umbral y, al tocarlo, regresa al tope de la página con scroll suave. Global a
 * la app (montado en el shell), así sirve en cualquier listado largo (partidos,
 * predicciones, tabla, etc.).
 *
 * Compatibilidad iOS/Safari (regla dura §3.3):
 * - Solo `window.scrollY` + listener pasivo, sin librerías ni unidades de
 *   viewport conflictivas.
 * - Se ancla con `env(safe-area-inset-bottom)` POR ENCIMA del BottomNav móvil
 *   (~4.25rem) para no chocar con el home indicator; en desktop baja a 1.5rem.
 * - Tap target de 48px (size-12) ≥ 44px.
 * - z-[190]: sobre el contenido, debajo de modales (z-400) y la top bar/nav
 *   (z-200), con la que además no se solapa físicamente.
 */
export function BotonVolverArriba({ umbral = 400 }: { umbral?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const alScroll = () => setVisible(window.scrollY > umbral);
    // Estado inicial correcto si la página carga ya desplazada (deep-link, volver
    // atrás del navegador con scroll restaurado, etc.).
    alScroll();
    window.addEventListener("scroll", alScroll, { passive: true });
    return () => window.removeEventListener("scroll", alScroll);
  }, [umbral]);

  return (
    <button
      type="button"
      aria-label="Volver arriba"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={cn(
        "fixed right-4 z-[190] inline-flex size-12 items-center justify-center rounded-full",
        // Halo verde de marca (shadow-glow) para que despegue del fondo en claro
        // y oscuro; el borde/anillo verde refuerza el contorno. Al pasar/tocar se
        // intensifica a glow-lg.
        "border border-primary/30 bg-card text-primary ring-1 ring-inset ring-primary/15",
        "shadow-glow transition-all duration-200 hover:bg-muted hover:shadow-glow-lg active:scale-95",
        "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6 md:right-6",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="size-5" aria-hidden />
    </button>
  );
}
