"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { mensajeErrorAuth } from "@/lib/supabase/auth-errores";
import { SITE_URL } from "@/lib/constants";
import { Button } from "@/components/ui/button";

/** Logo de Google en SVG (sin dependencias de imagen externas). */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

export function BotonGoogle({
  texto = "Continuar con Google",
  next = "/dashboard",
}: {
  texto?: string;
  /** Destino interno tras autenticar (deep-link de invitación, etc.). */
  next?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  async function handleClick() {
    setEnviando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    // Si no hubo error, el navegador ya redirige a Google (no se llega aquí).
    if (error) {
      toast.error(mensajeErrorAuth(error));
      setEnviando(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="w-full"
      onClick={handleClick}
      disabled={enviando}
    >
      {enviando ? <Loader2 className="size-5 animate-spin" /> : <GoogleIcon />}
      {texto}
    </Button>
  );
}
