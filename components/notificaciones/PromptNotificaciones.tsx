"use client";

import { useState } from "react";
import { BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePushNotificaciones } from "@/lib/hooks/usePushNotificaciones";

/** Clave en localStorage para recordar que el usuario pospuso el prompt. */
const CLAVE_POSPUESTO = "polla:notif-prompt-pospuesto";
/** No volver a preguntar hasta pasadas 12 horas tras un "Ahora no". */
const COOLDOWN_MS = 12 * 60 * 60 * 1000;

/** ¿El usuario pospuso el prompt hace menos del cooldown? */
function pospuestoReciente(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const guardado = window.localStorage.getItem(CLAVE_POSPUESTO);
    if (!guardado) return false;
    const cuando = Number(guardado);
    if (!Number.isFinite(cuando)) return false;
    return Date.now() - cuando < COOLDOWN_MS;
  } catch {
    return false;
  }
}

/** Marca el prompt como pospuesto ahora (arranca el cooldown). */
function marcarPospuesto(): void {
  try {
    window.localStorage.setItem(CLAVE_POSPUESTO, String(Date.now()));
  } catch {
    // localStorage puede fallar (modo privado iOS): ignorar, reaparecerá luego.
  }
}

/**
 * Prompt de bienvenida que invita a activar las notificaciones push al abrir la
 * PWA. Patrón "pre-permiso": nuestro diálogo aparece primero; el botón
 * "Activar" dispara el permiso nativo desde el gesto del usuario (requisito de
 * iOS/Safari, CLAUDE.md §3.3).
 *
 * Solo aparece cuando la suscripción es realmente posible y aún no se hizo:
 * - El navegador soporta push.
 * - No está ya suscrito ni bloqueado (`denied`).
 * - La app corre instalada como PWA (standalone): en el navegador normal no
 *   molestamos —el botón de instalar del header y la nota del Perfil guían ese
 *   paso—. (En iPhone, además, standalone es requisito técnico de push.)
 * - El usuario no lo pospuso en los últimos 7 días.
 *
 * Se monta en el shell `(app)` (ver `app/(app)/layout.tsx`).
 */
export function PromptNotificaciones() {
  const { soporta, standalone, suscrito, cargando, denegado, activar } =
    usePushNotificaciones();
  // El cierre se deriva del estado, no de un effect con setState (regla
  // react-hooks/set-state-in-effect): solo guardamos si el usuario lo cerró en
  // esta sesión. En SSR/primer render `suscrito` es null ⇒ `elegible` es false.
  const [cerradoEnSesion, setCerradoEnSesion] = useState(false);

  const elegible =
    suscrito === false && // determinado y aún no suscrito (null = sin determinar)
    soporta &&
    !denegado &&
    standalone && // solo dentro de la PWA instalada, nunca en el navegador
    !pospuestoReciente();

  const abierto = elegible && !cerradoEnSesion;

  function posponer() {
    marcarPospuesto();
    setCerradoEnSesion(true);
  }

  async function aceptar() {
    const ok = await activar();
    // Si se concedió, `suscrito` pasa a true y `elegible` cierra solo. Si se
    // denegó/bloqueó, el hook ya mostró el toast: lo posponemos para no insistir.
    if (!ok) posponer();
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && posponer()}>
      <DialogContent className="[&>button]:hidden">
        <DialogHeader>
          <span className="mb-1 grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
            <BellRing className="size-6" aria-hidden />
          </span>
          <DialogTitle>Activa las notificaciones</DialogTitle>
          <DialogDescription>
            Te avisamos justo antes de que cierre un partido para que no se te
            pase tu predicción. Puedes desactivarlas cuando quieras desde tu
            Perfil.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={posponer}
            disabled={cargando}
            className="w-full sm:w-auto"
          >
            Ahora no
          </Button>
          <Button
            onClick={aceptar}
            disabled={cargando}
            className="w-full sm:w-auto"
          >
            {cargando ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Activando…
              </>
            ) : (
              <>
                <BellRing className="size-4" aria-hidden />
                Activar notificaciones
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
