import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { crearFetchConTimeout } from "./fetch-timeout";

/**
 * Timeout del `getUser()` del middleware. Corre en cada navegación; si GoTrue
 * cuelga con red mala, sin esto la navegación entera se queda sin responder.
 * Al rechazar, entra al `catch` de red y seguimos como invitado/dejamos pasar.
 */
const TIMEOUT_MIDDLEWARE_MS = 8_000;

/** Rutas accesibles sin sesión (PLAN.md §Fase 1). */
const RUTAS_PUBLICAS = [
  "/",
  "/login",
  "/registro",
  "/forgot-password",
  "/reset-password",
  // Fallback offline del SW: debe servirse sin sesión (la precachea el SW y la
  // muestra cuando no hay red). Es estática y neutra, sin PII.
  "/offline",
];

/**
 * ¿La ruta es pública? Coincidencia exacta + prefijos dinámicos. `/unirse/[codigo]`
 * DEBE ser pública: es el deep-link de invitación que se comparte a gente sin
 * cuenta; esa página ya gestiona el flujo invitado→login→unirse preservando el
 * código (COMPATIBILIDAD-MOVIL.md §14).
 */
function esRutaPublica(pathname: string): boolean {
  return (
    RUTAS_PUBLICAS.includes(pathname) ||
    pathname.startsWith("/unirse/") ||
    // Ícono "vs" de las notificaciones push: lo pide el navegador al pintar la
    // notificación, sin sesión. Solo expone banderas (sin PII).
    pathname.startsWith("/api/notif-vs")
  );
}

/**
 * Borra las cookies de sesión de Supabase (`sb-*`) en la respuesta. Se usa cuando
 * el navegador trae un refresh token que GoTrue ya no reconoce
 * (`refresh_token_not_found`): la cookie quedó podrida (sesión vieja, reset de BD,
 * cambio de proyecto). Sin esto, el navegador reenvía la misma cookie inválida en
 * cada request y el error se repite en bucle.
 */
function limpiarCookiesAuth(response: NextResponse, request: NextRequest) {
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith("sb-")) {
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    }
  }
}

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
      global: { fetch: crearFetchConTimeout(TIMEOUT_MIDDLEWARE_MS) },
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

  // `getUser()` LANZA (no devuelve `error`) cuando el refresh token de la cookie
  // ya no existe en GoTrue (`refresh_token_not_found`). Eso NO es un fallo del
  // servidor: es una cookie podrida en el navegador del usuario. Si se propaga,
  // el middleware revienta y la request devuelve 500. Lo tratamos como "sin
  // sesión" y marcamos para borrar las cookies `sb-*` y cortar el bucle.
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] =
    null;
  let cookiesCorruptas = false;
  // Error de red/timeout hacia GoTrue (distinto de cookie inválida): la sesión
  // probablemente es buena, solo falló la conexión. NO debemos expulsar a login.
  let errorRed = false;
  try {
    const resultado = await supabase.auth.getUser();
    user = resultado.data.user;
  } catch (error) {
    const esErrorAuth =
      typeof error === "object" && error !== null && "__isAuthError" in error;
    if (esErrorAuth) {
      // Cookie de sesión inválida → limpiar y seguir como invitado.
      cookiesCorruptas = true;
    } else {
      // Error inesperado (red hacia GoTrue / timeout): no tumbamos la request ni
      // borramos la sesión; marcamos error de red para no redirigir a login.
      console.error("[middleware] Error inesperado en getUser:", error);
      errorRed = true;
    }
  }

  // `/auth/*` ya retornó arriba; aquí solo quedan rutas normales.
  const esPublica = esRutaPublica(pathname);

  // ¿El navegador trae una cookie de sesión de Supabase? Si la hay pero el
  // getUser falló por RED, asumimos que el usuario sí está logueado.
  const tieneCookieSesion = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-"));

  // Sin sesión en ruta protegida → al login, preservando el destino para volver
  // tras autenticar (no perder el contexto de un enlace compartido).
  if (!user && !esPublica) {
    // Excepción: si fue un error de RED transitorio y hay cookie de sesión, no
    // expulsamos a login (sería echar a un usuario logueado por un bache de
    // red). Dejamos pasar; el RSC/cliente reintentará cuando vuelva la conexión.
    if (errorRed && tieneCookieSesion) {
      return supabaseResponse;
    }
    const url = request.nextUrl.clone();
    const destino = pathname + url.search;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", destino);
    const respuesta = NextResponse.redirect(url);
    if (cookiesCorruptas) limpiarCookiesAuth(respuesta, request);
    return respuesta;
  }

  // Con sesión entrando al login/registro → al dashboard.
  if (user && (pathname === "/login" || pathname === "/registro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Ruta pública con cookie podrida (p.ej. estás en "/"): limpiar de todas formas
  // para que el próximo request no vuelva a disparar el mismo error.
  if (cookiesCorruptas) limpiarCookiesAuth(supabaseResponse, request);
  return supabaseResponse;
}
