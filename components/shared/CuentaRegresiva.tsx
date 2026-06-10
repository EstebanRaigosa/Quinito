"use client";

import { useEffect, useState } from "react";
import { cuentaRegresivaCorta } from "@/lib/utils/fechas";

type Props = {
  /** Fecha objetivo (ISO o Date). */
  iso: string | Date;
  /**
   * Hora "ahora" del primer render (la calcula el server y la pasa). Garantiza
   * que el primer render del cliente coincida con el SSR (sin mismatch de
   * hidratación); tras montar, el contador pasa a la hora real y late.
   */
  ahoraInicial: string | Date;
  /** Texto antepuesto mientras corre. Ej. "Cierra en ", "Empieza en ". */
  prefijo?: string;
  /** Texto cuando ya pasó. Ej. "cerrada", "ya empezó". */
  etiquetaCerrada?: string;
};

/**
 * Cuenta regresiva VIVA. Late cada segundo y **re-sincroniza al volver de
 * background** (`pageshow` + `visibilitychange`). Es clave en PWA iOS, donde
 * los timers se congelan en segundo plano y un contador estático mostraría
 * "faltan minutos" sobre una apuesta ya cerrada (COMPATIBILIDAD-MOVIL.md §12 /
 * COMPATIBILIDAD-STACK.md §1,§6).
 */
export function CuentaRegresiva({
  iso,
  ahoraInicial,
  prefijo = "",
  etiquetaCerrada = "cerrada",
}: Props) {
  const [ahora, setAhora] = useState(() => new Date(ahoraInicial));

  useEffect(() => {
    const tick = () => setAhora(new Date());
    tick(); // primer ajuste a la hora real del cliente
    const id = setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    window.addEventListener("pageshow", tick);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      window.removeEventListener("pageshow", tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const ms = new Date(iso).getTime() - ahora.getTime();
  const texto = ms <= 0 ? etiquetaCerrada : `${prefijo}${cuentaRegresivaCorta(iso, ahora)}`;
  return <>{texto}</>;
}
