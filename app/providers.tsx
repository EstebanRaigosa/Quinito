"use client";

import { useEffect, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { IdleGuard } from "@/components/shared/IdleGuard";
import {
  instalarOnlineManager,
  instalarPersistenciaMutaciones,
  registrarDefaultsMutaciones,
} from "@/lib/queries/mutaciones-predicciones";

/**
 * Providers de cliente. Por ahora solo TanStack Query.
 *
 * `networkMode: "online"` + reintentos pensados para red inestable (estadio):
 * ver COMPATIBILIDAD-STACK §6. La cola de mutaciones persistida se añade en la
 * fase de PWA/offline.
 *
 * `refetchOnWindowFocus: true` apoyado en un `focusManager` propio que escucha
 * **`pageshow` + `visibilitychange`** (no solo `focus`): en PWA standalone iOS
 * la app se suspende en segundo plano y los datos quedan viejos al volver
 * (tabla, predicciones, stats). Estos eventos sí disparan en iOS/bfcache.
 */
function instalarFocusManager() {
  focusManager.setEventListener((handleFocus) => {
    if (typeof window === "undefined") return;
    const onFocus = () => handleFocus(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") handleFocus(true);
    };
    window.addEventListener("pageshow", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          networkMode: "online",
          staleTime: 60_000,
          retry: 2,
          // El refetch al recuperar foco usa nuestro focusManager (pageshow/
          // visibilitychange), fiable en iOS standalone.
          refetchOnWindowFocus: true,
        },
        mutations: {
          networkMode: "online",
          retry: 2,
        },
      },
    });
    // Defaults de la mutación de predicción (mutationFn + reintentos) para que la
    // cola persistida pueda reanudarla aunque su formulario ya no exista.
    registrarDefaultsMutaciones(client);
    return client;
  });

  useEffect(() => {
    // onlineManager real (eventos online/offline) antes de instalar la cola, para
    // que la reanudación al reconectar se dispare con el estado correcto.
    instalarOnlineManager();
    instalarFocusManager();
    // Hidrata, persiste y reanuda la cola de predicciones pendientes. Además,
    // reanuda también al recuperar foco (volver de segundo plano en iOS).
    const limpiarPersistencia = instalarPersistenciaMutaciones(queryClient);
    const reanudarEnFoco = () => {
      if (document.visibilityState === "visible") {
        void queryClient.resumePausedMutations();
      }
    };
    window.addEventListener("pageshow", reanudarEnFoco);
    document.addEventListener("visibilitychange", reanudarEnFoco);
    return () => {
      limpiarPersistencia();
      window.removeEventListener("pageshow", reanudarEnFoco);
      document.removeEventListener("visibilitychange", reanudarEnFoco);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <IdleGuard />
      {children}
    </QueryClientProvider>
  );
}
