"use client";

import { useSyncExternalStore } from "react";
import { onlineManager, useMutationState } from "@tanstack/react-query";
import { Loader2, WifiOff } from "lucide-react";
import { KEY_GUARDAR_PREDICCION } from "@/lib/queries/mutaciones-predicciones";
import { cn } from "@/lib/utils";

/**
 * Banner global de estado de conexión + cola de predicciones pendientes.
 *
 * Cierra el bucle de la resiliencia de red: hasta ahora el único feedback de red
 * vivía dentro del formulario de predicción. Aquí, en cualquier pantalla, el
 * usuario sabe si está sin conexión y si tiene predicciones esperando a enviarse
 * (la cola persistida de `mutaciones-predicciones.ts`). Sin esto, con red mala
 * solo veía spinners y pantallas viejas → percepción de "app rota".
 *
 * Posición `fixed` + safe-area (NO `sticky`, problemático en iOS Safari). Se
 * ubica por encima del BottomNav en móvil. `role="status"` + `aria-live` para
 * lectores de pantalla.
 */
export function BannerConexion() {
  // Estado de red real (onlineManager, alimentado por eventos online/offline).
  const online = useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true, // SSR: asumir online para no parpadear en la hidratación.
  );

  // Mutaciones de predicción en vuelo; `isPaused` = esperando red.
  const enVuelo = useMutationState({
    filters: { mutationKey: KEY_GUARDAR_PREDICCION, status: "pending" },
    select: (m) => m.state.isPaused,
  });
  const pausadas = enVuelo.filter(Boolean).length;
  const enviando = enVuelo.length - pausadas;

  // Sin novedad que comunicar → no renderizar nada.
  if (online && pausadas === 0 && enviando === 0) return null;

  const sinConexion = !online;
  let texto: string;
  if (sinConexion) {
    texto =
      pausadas > 0
        ? `Sin conexión · ${pausadas} predicción${pausadas === 1 ? "" : "es"} sin enviar`
        : "Sin conexión";
  } else {
    const n = pausadas + enviando;
    texto = `Enviando ${n} predicción${n === 1 ? "" : "es"}…`;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[150] flex justify-center bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-4"
    >
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-bold shadow-lg ring-1",
          sinConexion
            ? "bg-fg-strong text-surface ring-black/10"
            : "bg-info-soft text-info ring-info/25",
        )}
      >
        {sinConexion ? (
          <WifiOff className="size-4 shrink-0" aria-hidden />
        ) : (
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
        )}
        {texto}
      </span>
    </div>
  );
}
