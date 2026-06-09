"use client";

import { Children, useEffect, useRef, useState } from "react";

/**
 * Revela secciones (jornadas) de forma progresiva al hacer scroll. Recibe las
 * secciones ya renderizadas en el servidor como `children` y monta en el cliente
 * solo las primeras `inicial`; al acercarse al final de la lista, un centinela
 * (`IntersectionObserver`) revela la siguiente tanda automáticamente.
 *
 * Por qué: la pestaña de predicciones puede tener decenas de partidos abiertos a
 * la vez (sobre todo al arrancar el torneo). Montarlos todos de golpe en un
 * celular se siente lento. Los datos ya están cargados (cero round-trips
 * extra); aquí solo acotamos cuántas tarjetas tocan el DOM y dejamos que el
 * scroll vaya montando el resto.
 *
 * Compatibilidad iOS/Safari: `IntersectionObserver` (iOS 12.2+) + estado, sin
 * sticky ni unidades de viewport. `rootMargin` adelanta la carga para que el
 * usuario no alcance a ver el salto.
 */
export function RevelarJornadas({
  children,
  inicial = 2,
  paso = 2,
}: {
  children: React.ReactNode;
  /** Cuántas jornadas se muestran de entrada. */
  inicial?: number;
  /** Cuántas jornadas más se revelan cada vez que el centinela aparece. */
  paso?: number;
}) {
  const secciones = Children.toArray(children);
  const total = secciones.length;
  const [visibles, setVisibles] = useState(inicial);
  const centinelaRef = useRef<HTMLDivElement | null>(null);

  const faltan = visibles < total;

  useEffect(() => {
    if (!faltan) return;
    const nodo = centinelaRef.current;
    if (!nodo) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          // Funcional + acotado al total: seguro aunque dispare varias veces.
          setVisibles((v) => Math.min(total, v + paso));
        }
      },
      // Empieza a cargar ~300px antes de llegar al final.
      { rootMargin: "300px 0px" },
    );
    obs.observe(nodo);
    return () => obs.disconnect();
  }, [faltan, paso, total, visibles]);

  return (
    <>
      {secciones.slice(0, visibles)}
      {faltan && (
        <div
          ref={centinelaRef}
          aria-hidden
          className="py-4 text-center text-2xs font-semibold text-fg-subtle"
        >
          Cargando más jornadas…
        </div>
      )}
    </>
  );
}
