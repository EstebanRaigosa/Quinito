"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";
import { actualizarPuntajeInicial } from "@/app/(app)/grupos/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  nombre: string;
  puntosIniciales: number;
};

/**
 * Edita el "puntaje de arranque" de un participante: lo que ya traía cuando la
 * polla se llevaba por fuera (Excel u otra app) antes de migrar a la app a mitad
 * de torneo. Se suma a los puntos ganados aquí (ver `vwTablaPosiciones`). Solo lo
 * monta el admin; la validación dura (permiso, no negativos) vive en el RPC.
 */
export function GestionPuntajeInicial({
  grupoId,
  participanteId,
  nombre,
  puntosIniciales,
}: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState(String(puntosIniciales));
  const [errorCampo, setErrorCampo] = useState<string | null>(null);
  const [guardando, startGuardar] = useTransition();

  function abrir() {
    // Recarga el valor actual cada vez que se abre (por si cambió fuera).
    setValor(String(puntosIniciales));
    setErrorCampo(null);
    setAbierto(true);
  }

  function onGuardar() {
    setErrorCampo(null);
    const puntos = Number(valor);
    if (!Number.isInteger(puntos) || puntos < 0) {
      setErrorCampo("Debe ser un número entero mayor o igual a 0.");
      return;
    }
    startGuardar(async () => {
      const res = await actualizarPuntajeInicial(grupoId, participanteId, puntos);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Puntaje de arranque guardado");
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={abrir}
      >
        <Flag className="size-4" />
        Arranque
      </Button>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Puntaje de arranque</DialogTitle>
          <DialogDescription>
            Puntos que {nombre} ya traía de antes (Excel u otra app). Se suman a
            los puntos ganados dentro de la app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            htmlFor="puntaje-inicial"
            className="t-caption font-semibold text-fg-muted"
          >
            Puntos de arranque
          </label>
          <Input
            id="puntaje-inicial"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            placeholder="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          {errorCampo && (
            <p className="t-caption text-destructive">{errorCampo}</p>
          )}
          <Button
            type="button"
            className="w-full"
            disabled={guardando}
            onClick={onGuardar}
          >
            {guardando ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Flag className="size-4" />
            )}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
