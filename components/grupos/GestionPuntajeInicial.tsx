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
  exactosIniciales: number;
  unicasIniciales: number;
  aciertosIniciales: number;
};

/** Campos del formulario de arranque (clave → etiqueta + ayuda). */
const CAMPOS = [
  {
    clave: "puntos",
    label: "Puntos de arranque",
    ayuda: "Puntaje acumulado que ya traía.",
  },
  {
    clave: "exactos",
    label: "Marcadores exactos acertados",
    ayuda: "Para desempate.",
  },
  {
    clave: "unicas",
    label: "Marcadores únicos acertados",
    ayuda: "Para desempate.",
  },
  {
    clave: "aciertos",
    label: "Otros aciertos",
    ayuda: "Ganadores y goles acertados. Para desempate.",
  },
] as const;

type Clave = (typeof CAMPOS)[number]["clave"];

/**
 * Edita el "arranque" de un participante: lo que ya traía cuando la polla se
 * llevaba por fuera (Excel u otra app) antes de migrar a la app a mitad de
 * torneo. Además del puntaje acumulado, carga los contadores de desempate
 * (marcadores exactos, únicas y otros aciertos) para que el orden a igualdad de
 * puntos sea justo con quien trae historial. Todo se suma a lo jugado dentro de
 * la app (ver `vwTablaPosiciones`). Solo lo monta el admin; la validación dura
 * (permiso, no negativos) vive en el RPC.
 */
export function GestionPuntajeInicial({
  grupoId,
  participanteId,
  nombre,
  puntosIniciales,
  exactosIniciales,
  unicasIniciales,
  aciertosIniciales,
}: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [valores, setValores] = useState<Record<Clave, string>>({
    puntos: String(puntosIniciales),
    exactos: String(exactosIniciales),
    unicas: String(unicasIniciales),
    aciertos: String(aciertosIniciales),
  });
  const [errorCampo, setErrorCampo] = useState<string | null>(null);
  const [guardando, startGuardar] = useTransition();

  function abrir() {
    // Recarga los valores actuales cada vez que se abre (por si cambiaron fuera).
    setValores({
      puntos: String(puntosIniciales),
      exactos: String(exactosIniciales),
      unicas: String(unicasIniciales),
      aciertos: String(aciertosIniciales),
    });
    setErrorCampo(null);
    setAbierto(true);
  }

  function setCampo(clave: Clave, valor: string) {
    setValores((prev) => ({ ...prev, [clave]: valor }));
  }

  function onGuardar() {
    setErrorCampo(null);
    const nums = {
      puntos: Number(valores.puntos),
      exactos: Number(valores.exactos),
      unicas: Number(valores.unicas),
      aciertos: Number(valores.aciertos),
    };
    if (Object.values(nums).some((n) => !Number.isInteger(n) || n < 0)) {
      setErrorCampo("Todos los valores deben ser enteros mayores o iguales a 0.");
      return;
    }
    startGuardar(async () => {
      const res = await actualizarPuntajeInicial(grupoId, participanteId, nums);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Arranque guardado");
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
          <DialogTitle>Arranque de {nombre}</DialogTitle>
          <DialogDescription>
            Lo que {nombre} ya traía de antes (Excel u otra app). Se suma a lo
            jugado dentro de la app, incluidos los contadores de desempate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {CAMPOS.map((campo) => (
            <div key={campo.clave} className="space-y-1.5">
              <label
                htmlFor={`arranque-${campo.clave}`}
                className="t-caption font-semibold text-fg-muted"
              >
                {campo.label}
              </label>
              <Input
                id={`arranque-${campo.clave}`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="0"
                value={valores[campo.clave]}
                onChange={(e) => setCampo(campo.clave, e.target.value)}
              />
              <p className="t-caption text-fg-subtle">{campo.ayuda}</p>
            </div>
          ))}

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
