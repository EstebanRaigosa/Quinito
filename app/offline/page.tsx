"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Página de fallback offline. La precachea el service worker (additionalPrecache
 * en next.config) y se sirve cuando una NAVEGACIÓN falla por falta de red, en
 * lugar del error del navegador (el "dinosaurio" de Chrome) dentro de la PWA.
 *
 * PRIVACIDAD (CLAUDE.md §3.4): es 100% estática y NEUTRA — no carga sesión,
 * grupos ni predicciones. Cero PII en disco. Por eso es seguro precachearla,
 * mientras que las navegaciones reales siguen yendo SIEMPRE a la red sin caché.
 */
export default function OfflinePage() {
  return (
    <main className="grid min-h-[100dvh] place-items-center px-6 py-[max(2rem,env(safe-area-inset-top))]">
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-muted text-fg-muted">
          <WifiOff className="size-8" aria-hidden />
        </span>
        <h1 className="t-h1 mt-5">Sin conexión</h1>
        <p className="t-body-sm mt-2 text-fg-muted">
          No pudimos conectar con internet. Revisa tu señal y vuelve a intentar.
          Tus predicciones guardadas se enviarán solas cuando recuperes la
          conexión.
        </p>
        <Button
          className="mt-6"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="size-4" /> Reintentar
        </Button>
      </div>
    </main>
  );
}
