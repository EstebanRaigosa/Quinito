"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SITE_URL } from "@/lib/constants";

const noop = () => () => {};

/**
 * Código de invitación copiable + botón de compartir.
 * `compacto`: solo el chip de código (sin botón de compartir aparte) — útil en
 * cabeceras móviles donde el espacio es limitado.
 */
export function BotonCompartirCodigo({
  codigo,
  nombreGrupo,
  compacto = false,
  className,
}: {
  codigo: string;
  nombreGrupo: string;
  compacto?: boolean;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  // `navigator` no existe en el servidor; useSyncExternalStore rinde `false` en
  // SSR y el valor real en cliente (evita hydration mismatch sin setState-en-effect).
  const puedeCompartir = useSyncExternalStore(
    noop,
    () => typeof navigator !== "undefined" && "share" in navigator,
    () => false,
  );

  // Link de invitación: abre la landing pública con preview del estadio (OG).
  const enlace = `${SITE_URL}/unirse/${codigo}`;
  // Mensaje con estilo (es-CO) que acompaña al link al compartir.
  const mensaje =
    `⚽️ ¡Te invito a mi polla *${nombreGrupo}* del Mundial 2026!\n\n` +
    `🔑 Código: ${codigo}\n` +
    `👉 Únete aquí: ${enlace}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      toast.success("Código copiado");
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  async function copiarInvitacion() {
    try {
      await navigator.clipboard.writeText(mensaje);
      toast.success("Invitación copiada");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  async function compartir() {
    if (puedeCompartir) {
      try {
        // El link va dentro de `mensaje` (no como `url` aparte) para que no
        // aparezca duplicado: varias apps (WhatsApp) anexan `url` al `text`.
        await navigator.share({
          title: `Únete a ${nombreGrupo} · Polla Mundial 2026`,
          text: mensaje,
        });
        return;
      } catch {
        /* usuario canceló — cae al copy */
      }
    }
    await copiarInvitacion();
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {/* Chip de código copiable */}
      <button
        type="button"
        onClick={copiar}
        aria-label={`Copiar código de invitación ${codigo}`}
        className="inline-flex h-11 items-center gap-2 rounded-lg border border-input bg-surface/60 px-3.5 text-sm font-bold tracking-wide text-fg-strong transition-colors hover:border-strong hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {copiado ? (
          <Check className="size-4 text-success" />
        ) : (
          <Copy className="size-4 text-fg-muted" />
        )}
        <span className="tabular-nums">{codigo}</span>
      </button>

      {/* Botón de compartir (oculto en modo compacto) */}
      {!compacto && (
        <button
          type="button"
          onClick={compartir}
          aria-label="Compartir invitación al grupo"
          className="grid size-11 shrink-0 place-items-center rounded-lg border border-input bg-surface/60 text-fg-muted transition-colors hover:border-strong hover:bg-muted hover:text-fg-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Share2 className="size-4" />
        </button>
      )}
    </div>
  );
}
