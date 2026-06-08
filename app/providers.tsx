"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * Providers de cliente. Por ahora solo TanStack Query.
 *
 * `networkMode: "online"` + reintentos pensados para red inestable (estadio):
 * ver COMPATIBILIDAD-STACK §6. La cola de mutaciones persistida se añade en la
 * fase de PWA/offline.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            networkMode: "online",
            staleTime: 60_000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
          mutations: {
            networkMode: "online",
            retry: 2,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
