import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./types";
import { crearFetchConTimeout } from "./fetch-timeout";

/**
 * Timeout de las requests del servidor a Supabase. Más corto que el del
 * navegador porque una request colgada aquí (p. ej. `auth.getUser()` en el
 * middleware o un RSC) bloquea el render de la página entera. Al rechazar, el
 * `catch` de red del middleware sigue como invitado en vez de colgar. 10 s.
 */
const TIMEOUT_SERVER_MS = 10_000;

/**
 * Cliente Supabase para el servidor. Usar en Server Components, route handlers
 * y server actions. En Next 16 `cookies()` es asíncrono, por eso esta función
 * es `async` y debe llamarse con `await createClient()`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: crearFetchConTimeout(TIMEOUT_SERVER_MS) },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` se llamó desde un Server Component (no puede escribir
            // cookies). Es seguro ignorarlo si el middleware refresca la sesión.
          }
        },
      },
    },
  );
}
