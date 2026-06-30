"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Receipt, Share2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const noop = () => () => {};

type Props = {
  /** Nombre del participante (va en el comprobante). */
  nombre: string;
  /** Nombre de la polla. */
  grupoNombre: string;
  /** Monto del abono (pesos) que certifica este comprobante. */
  monto: number;
  /** Valor de la inscripción (pesos), como contexto. */
  valor: number;
  /** Método/nota del abono (Efectivo, Transferencia…), si se registró. */
  metodo: string | null;
  /** Código del comprobante (ej. "CMP-7F3K9Q2M"). */
  codigo: string;
  /** Fecha ISO del abono (cuándo se realizó el pago). */
  fechaISO: string;
  /**
   * Modo controlado: si se pasan, el padre gobierna la apertura (p. ej. para
   * abrir el comprobante automáticamente justo tras registrar el pago). Si se
   * omiten, el componente usa su propio estado y se abre con el botón.
   */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  /** Oculta el botón disparador "Comprobante" (cuando se abre por código). */
  hideTrigger?: boolean;
};

/** Slug seguro para el nombre de archivo: "Andrés Núñez" → "andres-nunez". */
function slug(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 40) || "comprobante"
  );
}

/**
 * Genera y comparte/descarga un comprobante de pago tipo "ticket" (PNG).
 * El PNG lo rasteriza el servidor (`/api/comprobante-pago`). Aquí solo se
 * previsualiza y se entrega: por `navigator.share` (WhatsApp en móvil) o como
 * descarga (escritorio / navegadores sin Web Share de archivos).
 *
 * El blob se descarga al abrir el diálogo (TanStack Query) para que el clic de
 * "Compartir" invoque `navigator.share` SIN un `await` previo: iOS exige que el
 * share salga directo del gesto del usuario o lanza NotAllowedError.
 */
export function ComprobantePago({
  nombre,
  grupoNombre,
  monto,
  valor,
  metodo,
  codigo,
  fechaISO,
  open,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  // Apertura controlada (padre) o interna (botón propio).
  const [abiertoInterno, setAbiertoInterno] = useState(false);
  const controlado = open !== undefined;
  const abierto = controlado ? open : abiertoInterno;
  const setAbierto = (v: boolean) => {
    if (!controlado) setAbiertoInterno(v);
    onOpenChange?.(v);
  };
  const [compartiendo, setCompartiendo] = useState(false);

  // ¿El navegador soporta compartir (con archivos)? `navigator` no existe en SSR.
  const puedeCompartir = useSyncExternalStore(
    noop,
    () => typeof navigator !== "undefined" && "canShare" in navigator,
    () => false,
  );

  const url = useMemo(() => {
    const params = new URLSearchParams({
      g: grupoNombre,
      p: nombre,
      a: String(monto),
      v: String(valor),
      m: metodo ?? "",
      c: codigo,
      f: fechaISO,
    });
    return `/api/comprobante-pago?${params.toString()}`;
  }, [grupoNombre, nombre, monto, valor, metodo, codigo, fechaISO]);

  const { data: blob, isError, error } = useQuery({
    queryKey: ["comprobante-pago", url],
    queryFn: async () => {
      const res = await fetch(url);
      if (!res.ok) {
        // El servidor manda el motivo en el cuerpo; lo propagamos para mostrarlo.
        const motivo = await res.text().catch(() => "");
        throw new Error(motivo || "No se pudo generar el comprobante");
      }
      return res.blob();
    },
    enabled: abierto,
    staleTime: Infinity,
    gcTime: 0,
    retry: 1,
  });

  // URL temporal para previsualizar/descargar; se revoca al cambiar o desmontar.
  const objectURL = useMemo(
    () => (blob ? URL.createObjectURL(blob) : null),
    [blob],
  );
  useEffect(() => {
    return () => {
      if (objectURL) URL.revokeObjectURL(objectURL);
    };
  }, [objectURL]);

  const nombreArchivo = `comprobante-${slug(codigo)}.png`;

  function descargar(file: Blob) {
    const href = objectURL ?? URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = href;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    if (!objectURL) URL.revokeObjectURL(href);
  }

  async function compartir() {
    if (!blob) return;
    const file = new File([blob], nombreArchivo, { type: "image/png" });
    // `navigator.share` debe ser lo primero del handler (sin await previo): el
    // blob ya está en caché, así que el gesto del usuario sigue "activo".
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [file] })
    ) {
      setCompartiendo(true);
      try {
        await navigator.share({
          files: [file],
          title: `Comprobante de pago · ${grupoNombre}`,
          text: `Comprobante de pago de ${nombre} — ${grupoNombre}`,
        });
      } catch (e) {
        // El usuario canceló: no es error.
        if ((e as Error)?.name !== "AbortError") {
          descargar(file);
        }
      } finally {
        setCompartiendo(false);
      }
      return;
    }
    // Sin Web Share de archivos (escritorio): descargamos.
    descargar(file);
    toast.success("Comprobante descargado");
  }

  function onDescargar() {
    if (!blob) return;
    descargar(blob);
    toast.success("Comprobante descargado");
  }

  const listo = !!blob && !isError;

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      {!hideTrigger && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          aria-label={`Ver comprobante ${codigo}`}
          onClick={() => setAbierto(true)}
        >
          <Receipt className="size-4" />
          Comprobante
        </Button>
      )}

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Comprobante {codigo}</DialogTitle>
          <DialogDescription>
            Envíaselo a {nombre} por WhatsApp o descárgalo.
          </DialogDescription>
        </DialogHeader>

        {/* Previsualización del ticket (altura acotada para no tapar los botones) */}
        <div className="grid place-items-center overflow-hidden rounded-xl border border-border bg-sunken p-2">
          {isError ? (
            <p className="t-body-sm break-words p-6 text-center text-destructive">
              {error instanceof Error && error.message
                ? error.message
                : "No se pudo generar el comprobante. Inténtalo de nuevo."}
            </p>
          ) : objectURL ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob local, no Image
            <img
              src={objectURL}
              alt={`Comprobante de pago de ${nombre}`}
              className="block max-h-[52dvh] w-auto rounded-lg"
            />
          ) : (
            <div className="grid h-[40dvh] w-full place-items-center">
              <Loader2 className="size-6 animate-spin text-fg-muted" aria-hidden />
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="grid grid-cols-2 gap-2">
          {puedeCompartir && (
            <Button
              type="button"
              className="w-full"
              disabled={!listo || compartiendo}
              onClick={compartir}
            >
              {compartiendo ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Share2 className="size-4" />
              )}
              Compartir
            </Button>
          )}
          <Button
            type="button"
            variant={puedeCompartir ? "outline" : "default"}
            className={puedeCompartir ? "w-full" : "col-span-2 w-full"}
            disabled={!listo}
            onClick={onDescargar}
          >
            <Download className="size-4" />
            Descargar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
