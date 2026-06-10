import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/constants";

/**
 * Callback de autenticación. Cubre los DOS formatos de enlace que emite Supabase:
 * - **PKCE `?code=`** → OAuth (Google), confirmación de registro, recuperación.
 * - **`?token_hash=&type=`** → magic link / OTP por email (según la plantilla de
 *   correo del proyecto). Sin este caso, el login por enlace mágico se rompería
 *   (COMPATIBILIDAD-MOVIL.md §14, fallback de iOS standalone).
 *
 * `next` define el destino: /dashboard (login/registro), /reset-password (recuperación).
 *
 * **Redirecciones con `SITE_URL`, NO con `origin` de `request.url`:** detrás de un
 * proxy (Netlify) `request.url` resuelve al host interno del deploy
 * (`*.netlify.app`), no al dominio canónico. Redirigir a ese origin saca al
 * usuario del dominio público y la cookie de sesión —fijada en el dominio
 * canónico— queda inaccesible, devolviéndolo al login. Es el mismo motivo por el
 * que el cliente usa `SITE_URL` y no `window.location.origin`
 * (COMPATIBILIDAD-MOVIL.md §14).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${SITE_URL}${next}`);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${SITE_URL}${next}`);
    }
  }

  return NextResponse.redirect(`${SITE_URL}/login?error=auth`);
}
