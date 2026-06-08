import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Callback de autenticación. Cubre los DOS formatos de enlace que emite Supabase:
 * - **PKCE `?code=`** → OAuth (Google), confirmación de registro, recuperación.
 * - **`?token_hash=&type=`** → magic link / OTP por email (según la plantilla de
 *   correo del proyecto). Sin este caso, el login por enlace mágico se rompería
 *   (COMPATIBILIDAD-MOVIL.md §14, fallback de iOS standalone).
 *
 * `next` define el destino: /dashboard (login/registro), /reset-password (recuperación).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
