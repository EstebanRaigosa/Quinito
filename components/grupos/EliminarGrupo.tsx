"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, AlertTriangle } from "lucide-react";
import { eliminarGrupo } from "@/app/(app)/grupos/[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type Props = {
  grupoId: string;
  /** Nombre del grupo: se pide reescribirlo para confirmar el borrado. */
  nombre: string;
  /** Total de participantes, para advertir el alcance del borrado. */
  totalParticipantes: number;
};

/**
 * Zona de peligro: eliminar la polla completa. Solo se muestra al creador.
 * Borrar es IRREVERSIBLE (predicciones, puntos, pagos y participantes), así que
 * exige reescribir el nombre exacto del grupo antes de habilitar el botón.
 * La validación dura (solo el creador) vive en el RPC `eliminar_grupo`.
 */
export function EliminarGrupo({ grupoId, nombre, totalParticipantes }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState("");
  const [procesando, startTransition] = useTransition();

  const puedeEliminar = confirmacion.trim() === nombre.trim();

  function ejecutar() {
    if (!puedeEliminar) return;
    startTransition(async () => {
      const res = await eliminarGrupo(grupoId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("La polla fue eliminada");
      setAbierto(false);
      router.push("/dashboard");
    });
  }

  return (
    <Card className="border-destructive/40">
      <CardContent className="space-y-2 p-4">
        <p className="t-h4 text-destructive">Eliminar polla</p>
        <p className="t-body-sm text-fg-muted">
          Borra la polla y todo su contenido: predicciones, puntos, pagos y
          participantes. Esta acción no se puede deshacer.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-1"
          onClick={() => {
            setConfirmacion("");
            setAbierto(true);
          }}
        >
          <Trash2 className="size-4" />
          Eliminar polla
        </Button>
      </CardContent>

      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-destructive" />
              Eliminar “{nombre}”
            </DialogTitle>
            <DialogDescription>
              Vas a borrar la polla de forma permanente, junto con las
              predicciones, puntos y pagos de{" "}
              <strong>
                {totalParticipantes}{" "}
                {totalParticipantes === 1 ? "participante" : "participantes"}
              </strong>
              . Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirmar-nombre">
              Escribe el nombre de la polla para confirmar:
            </Label>
            <Input
              id="confirmar-nombre"
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              placeholder={nombre}
              autoComplete="off"
              autoCapitalize="off"
              disabled={procesando}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setAbierto(false)}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={ejecutar}
              disabled={!puedeEliminar || procesando}
            >
              <Trash2 className="size-4" />
              {procesando ? "Eliminando…" : "Eliminar polla"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
