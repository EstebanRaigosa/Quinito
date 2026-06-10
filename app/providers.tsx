"use client";

import { useEffect, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";

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
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
      }),
  );

  useEffect(() => {
    instalarFocusManager();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
