import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { crearFetchConTimeout } from "./fetch-timeout";

/**
 * Timeout de las requests del navegador a Supabase. Con red intermitente, sin
 * esto una request cuelga para siempre (spinner eterno). 15 s da margen a un
 * guardado lento real antes de rechazar; el retry de TanStack + la cola
 * persistida cubren el resto. Ver `fetch-timeout.ts`.
 */
const TIMEOUT_BROWSER_MS = 15_000;

/**
 * Cliente Supabase para el navegador. Usar en componentes `"use client"`.
 * Tipado con `Database` (generado de la BD — regenerar tras cada migración).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Inyecta el timeout en TODAS las requests (REST + auth). Imprescindible
      // para que con red mala las queries/mutaciones rechacen en vez de colgarse.
      global: { fetch: crearFetchConTimeout(TIMEOUT_BROWSER_MS) },
      // PKCE explícito: imprescindible para OAuth/recuperación en Safari y para
      // sobrevivir ITP en PWA standalone (COMPATIBILIDAD-STACK §8, MÓVIL §14).
      auth: {
        flowType: "pkce",
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      // Heartbeat de Realtime en Web Worker: sobrevive a los timers congelados
      // de iOS en segundo plano (cuando se agregue el "en vivo").
      realtime: { worker: true },
    },
  );
}
