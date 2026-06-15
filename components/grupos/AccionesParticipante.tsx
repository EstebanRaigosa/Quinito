"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, UserMinus, Ban, ArrowLeft, Loader2 } from "lucide-react";
import { gestionarParticipante } from "@/app/(app)/grupos/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  grupoId: string;
  participanteId: string;
  /** Nombre mostrado en el diálogo de confirmación. */
  nombre: string;
};

/** Qué acción se está confirmando (segundo paso del diálogo). */
type Confirmando = null | "eliminar" | "banear";

/**
 * Menú de acciones del admin sobre un participante: eliminarlo del grupo o
 * eliminarlo y banearlo. Flujo en DOS pasos: primero se elige la acción y luego
 * se CONFIRMA explícitamente (ningún proceso se ejecuta con un solo toque, por
 * lo delicado de la acción). La validación dura (solo admin, no a sí mismo, no a
 * otro admin) vive en el RPC.
 */
export function AccionesParticipante({ grupoId, participanteId, nombre }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState<Confirmando>(null);
  const [procesando, startTransition] = useTransition();

  /** Cierra (o reabre) reseteando siempre al menú, nunca a media confirmación. */
  function cambiarAbierto(v: boolean) {
    if (procesando) return; // no cerrar a mitad de la operación
    setAbierto(v);
    if (!v) setConfirmando(null);
  }

  function ejecutar(banear: boolean) {
    startTransition(async () => {
      const res = await gestionarParticipante(grupoId, participanteId, banear);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(
        banear ? `${nombre} fue eliminado y baneado` : `${nombre} fue eliminado`,
      );
      setConfirmando(null);
      setAbierto(false);
      router.refresh();
    });
  }

  const esBanear = confirmando === "banear";

  return (
    <Dialog open={abierto} onOpenChange={cambiarAbierto}>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Gestionar a ${nombre}`}
        className="shrink-0 text-fg-muted"
        onClick={() => setAbierto(true)}
      >
        <MoreVertical className="size-4" />
      </Button>

      <DialogContent className="max-w-sm">
        {confirmando === null ? (
          // ── Paso 1: elegir acción ──────────────────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle>Gestionar a {nombre}</DialogTitle>
              <DialogDescription>
                Elige qué hacer. Sale de la polla y deja de verla, pero sus
                predicciones y puntos se conservan: si vuelve a unirse con el
                código, los recupera. No afecta a otros grupos.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setConfirmando("eliminar")}
              >
                <UserMinus className="size-4" />
                Eliminar del grupo
              </Button>
              <p className="t-caption -mt-1 pl-1 text-fg-muted">
                Sale del grupo, pero podría volver a unirse con el código.
              </p>

              <Button
                variant="destructive"
                className="mt-2 justify-start"
                onClick={() => setConfirmando("banear")}
              >
                <Ban className="size-4" />
                Eliminar y banear
              </Button>
              <p className="t-caption -mt-1 pl-1 text-fg-muted">
                Sale del grupo y no podrá volver a entrar con el código.
              </p>
            </div>
          </>
        ) : (
          // ── Paso 2: confirmar la acción elegida ────────────────────────────
          <>
            <DialogHeader>
              <DialogTitle>
                {esBanear
                  ? `¿Eliminar y banear a ${nombre}?`
                  : `¿Eliminar a ${nombre}?`}
              </DialogTitle>
              <DialogDescription>
                {esBanear
                  ? "Saldrá de la polla y NO podrá volver a entrar con el código. Sus predicciones y puntos se conservan, pero quedará bloqueado."
                  : "Saldrá de la polla y dejará de verla. Sus predicciones y puntos se conservan: si vuelve a unirse con el código, los recupera."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="ghost"
                disabled={procesando}
                onClick={() => setConfirmando(null)}
              >
                <ArrowLeft className="size-4" />
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={procesando}
                onClick={() => ejecutar(esBanear)}
              >
                {procesando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : esBanear ? (
                  <Ban className="size-4" />
                ) : (
                  <UserMinus className="size-4" />
                )}
                {esBanear ? "Sí, eliminar y banear" : "Sí, eliminar"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
