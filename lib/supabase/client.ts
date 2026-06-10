import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Cliente Supabase para el navegador. Usar en componentes `"use client"`.
 * Tipado con `Database` (generado de la BD — regenerar tras cada migración).
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
