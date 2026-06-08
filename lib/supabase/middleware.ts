import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rutas accesibles sin sesión (PLAN.md §Fase 1). */
const RUTAS_PUBLICAS = ["/", "/login", "/forgot-password", "/reset-password"];

/**
 * Refresca la sesión de Supabase en cada request y protege rutas.
 * Patrón oficial @supabase/ssr: hay que devolver el `supabaseResponse` con las
 * cookies actualizadas para que el token se renueve. No insertar lógica entre
 * `createServerClient` y `auth.getUser()`.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Las rutas /auth/* (callback OAuth, confirmación de email) gestionan sus
  // propias cookies vía `exchangeCodeForSession`. Aquí todavía NO hay sesión que
  // validar, así que llamar `getUser()` sería un round-trip a GoTrue
  // desperdiciado justo en la ruta crítica del login con Google. Salir directo.
  if (pathname.startsWith("/auth")) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // `/auth/*` ya retornó arriba; aquí solo quedan rutas normales.
  const esPublica = RUTAS_PUBLICAS.includes(pathname);

  // Sin sesión en ruta protegida → al login.
  if (!user && !esPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Con sesión entrando al login → al dashboard.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
