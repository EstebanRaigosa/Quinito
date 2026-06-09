"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Check, Download, Plus, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Evento propietario de Chromium (no está en los tipos DOM estándar). */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** ¿La app ya corre como PWA instalada (standalone)? */
function estaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  // iOS expone `navigator.standalone` (no estándar).
  const iosStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || iosStandalone;
}

/** Detecta iOS (iPhone/iPad/iPod), incluido el iPad que se reporta como Mac. */
function esIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iPhone = /iPad|iPhone|iPod/.test(ua);
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iPhone || iPadOS;
}

const noop = () => () => {};

/**
 * Lee un valor solo-cliente sin provocar hydration mismatch ni setState en
 * effect: en SSR rinde `false` y en cliente el valor real (mismo patrón que
 * `BotonCompartirCodigo`).
 */
function useFlagCliente(leer: () => boolean): boolean {
  return useSyncExternalStore(noop, leer, () => false);
}

/**
 * Botón para instalar la PWA.
 * - Android / Chrome / Edge: usa el evento `beforeinstallprompt` para abrir el
 *   diálogo nativo de instalación.
 * - iOS / Safari: no hay API; muestra un instructivo (Compartir → Añadir a inicio).
 * - Si ya está instalada o el navegador no es elegible, no renderiza nada.
 */
/**
 * - `card`: tarjeta con texto + botón (para el perfil/ajustes).
 * - `icon`: botón-ícono compacto (para la barra superior).
 */
export function BotonInstalarPWA({
  variant = "card",
}: {
  variant?: "card" | "icon";
}) {
  const [deferido, setDeferido] = useState<BeforeInstallPromptEvent | null>(null);
  // Se instaló durante esta sesión (evento `appinstalled`).
  const [instaladaEnSesion, setInstaladaEnSesion] = useState(false);
  const [verInstruccionesIOS, setVerInstruccionesIOS] = useState(false);

  // Flags solo-cliente (sin setState en effect → sin renders en cascada).
  const standalone = useFlagCliente(estaInstalada);
  const ios = useFlagCliente(esIOS);
  const instalada = standalone || instaladaEnSesion;

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      // Evita el mini-infobar de Chrome; guardamos el evento para dispararlo
      // desde nuestro botón. (setState en callback, no en el cuerpo del effect.)
      e.preventDefault();
      setDeferido(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setInstaladaEnSesion(true);
      setDeferido(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function instalar() {
    if (!deferido) return;
    await deferido.prompt();
    await deferido.userChoice;
    // El evento solo puede usarse una vez.
    setDeferido(null);
  }

  // Ya instalada → nada que mostrar.
  if (instalada) return null;
  // Ni evento nativo (Android/escritorio) ni iOS → navegador no elegible.
  if (!deferido && !ios) return null;

  // Acción común: en iOS abre el instructivo; en el resto, el diálogo nativo.
  const onInstalar = ios ? () => setVerInstruccionesIOS(true) : instalar;

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={onInstalar}
          aria-label="Instalar la app"
          className="grid size-9 place-items-center rounded-full text-fg-muted transition-colors hover:bg-sunken hover:text-primary"
        >
          <Download className="size-5" aria-hidden />
        </button>
      ) : (
        <Card className="flex items-center gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow">
            <Download className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="t-body-sm font-bold text-fg-strong">Instalar la app</p>
            <p className="t-caption text-fg-muted">
              Acceso directo en tu pantalla de inicio, a pantalla completa.
            </p>
          </div>
          <Button size="sm" onClick={onInstalar} className="shrink-0">
            Instalar
          </Button>
        </Card>
      )}

      {/* Instructivo para iOS (Safari no permite instalar por código). */}
      <Dialog open={verInstruccionesIOS} onOpenChange={setVerInstruccionesIOS}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar en iPhone o iPad</DialogTitle>
            <DialogDescription>
              En Safari, sigue estos dos pasos para añadir Polla a tu pantalla de
              inicio.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3">
            <li className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-extrabold text-primary">
                1
              </span>
              <span className="t-body-sm text-fg-strong">
                Toca el botón{" "}
                <Share className="inline size-4 -translate-y-0.5 text-primary" />{" "}
                <strong>Compartir</strong> en la barra de Safari.
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-extrabold text-primary">
                2
              </span>
              <span className="t-body-sm text-fg-strong">
                Elige{" "}
                <Plus className="inline size-4 -translate-y-0.5 text-primary" />{" "}
                <strong>Añadir a pantalla de inicio</strong> y confirma.
              </span>
            </li>
          </ol>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setVerInstruccionesIOS(false)}
          >
            <Check className="size-4" /> Entendido
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
