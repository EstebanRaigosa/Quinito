"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /**
   * Firma de los datos "en vivo" de la tarjeta (estado + marcador). Cuando cambia
   * entre renders —tras un refresco por Realtime, cambio de pestaña o recarga—
   * se dispara el destello. Ej. `"finalizado:2:1"`.
   */
  firma: string;
  children: React.ReactNode;
};

/**
 * Envuelve una tarjeta de partido y la hace destellar (anillo esmeralda, una
 * sola vez) cuando su marcador/estado cambia. Compara la `firma` con la del
 * render anterior: así resalta justo cuando aparece el dato nuevo, sin importar
 * cómo llegó (Realtime, cambio de pestaña, recarga). En el primer render no
 * destella (solo memoriza la firma inicial).
 *
 * Compatibilidad iOS/§3.3: la animación es un `box-shadow` de un disparo (sin
 * desplazar layout) y respeta `prefers-reduced-motion` vía la utilidad de
 * Tailwind `motion-reduce`. El wrapper no altera la grilla (mismo radio que la
 * tarjeta, sin margen ni padding).
 */
export function DestelloPartido({ firma, children }: Props) {
  const previo = useRef<string | null>(null);
  const [destellar, setDestellar] = useState(false);

  useEffect(() => {
    const cambio = previo.current !== null && previo.current !== firma;
    previo.current = firma;
    if (!cambio) return;
    // setState diferido (no en el cuerpo del efecto) para no encadenar renders
    // y para reiniciar la animación aunque cambie dos veces seguidas.
    const inicio = setTimeout(() => setDestellar(true), 0);
    const fin = setTimeout(() => setDestellar(false), 1600);
    return () => {
      clearTimeout(inicio);
      clearTimeout(fin);
    };
  }, [firma]);

  return (
    <div className={destellar ? "rounded-xl motion-safe:animate-destello" : undefined}>
      {children}
    </div>
  );
}
