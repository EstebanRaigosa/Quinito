"use client";

import { useEffect, useState, type CSSProperties } from "react";

/**
 * Mantiene un modal centrado sobre el área REALMENTE visible cuando el teclado
 * virtual está abierto.
 *
 * Problema (iOS Safari sobre todo): un modal centrado con `top:50%` +
 * `translateY(-50%)` se ancla al *layout viewport* (la pantalla completa). El
 * teclado virtual no encoge ese layout viewport —ni `100dvh`—, así que al
 * aparecer tapa la mitad inferior del modal.
 *
 * `window.visualViewport` sí reporta el área visible por encima del teclado
 * (`height` + `offsetTop`). Con eso reposicionamos el modal al centro de esa
 * zona y limitamos su alto, de modo que quede siempre sobre el teclado y su
 * contenido pueda scrollearse.
 *
 * Degrada limpio: sin teclado (`offsetTop=0`, `height=innerHeight`) el cálculo
 * coincide con el centrado original; en SSR / sin soporte de `visualViewport`
 * devuelve `{}` y el modal usa sus clases de Tailwind tal cual.
 *
 * Solo lo usa el contenido de un modal abierto, así que se sincroniza al montar.
 * Ver COMPATIBILIDAD-MOVIL.md §4.1 (teclado virtual que tapa inputs).
 */
export function useViewportModal(): CSSProperties {
  const [estilo, setEstilo] = useState<CSSProperties>({});

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const actualizar = () => {
      // Centro del área visible (en coordenadas del layout viewport, que es
      // contra el que se resuelve `position: fixed`).
      const centro = vv.offsetTop + vv.height / 2;
      // Margen de respiro arriba/abajo (1rem ≈ 16px por lado).
      const altoMax = Math.round(vv.height - 32);
      setEstilo({ top: `${Math.round(centro)}px`, maxHeight: `${altoMax}px` });
    };

    // Medición inicial fuera del cuerpo síncrono del efecto (evita el cascading
    // render que marca react-hooks/set-state-in-effect). Sin teclado el valor
    // coincide con el centrado de Tailwind, así que no hay salto visible.
    const raf = requestAnimationFrame(actualizar);
    vv.addEventListener("resize", actualizar);
    vv.addEventListener("scroll", actualizar);
    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", actualizar);
      vv.removeEventListener("scroll", actualizar);
    };
  }, []);

  return estilo;
}
