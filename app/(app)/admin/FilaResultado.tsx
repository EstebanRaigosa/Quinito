"use client";

import { useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Flag } from "@/components/shared/Flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { limpiarResultado, registrarResultado } from "./actions";

export type PartidoAdmin = {
  id: string;
  etiqueta: string;
  fechaTexto: string;
  localNombre: string;
  localIso: string | null;
  visitanteNombre: string;
  visitanteIso: string | null;
  estado: string;
  golesLocal: number | null;
  golesVisitante: number | null;
};

const inputCls =
  "h-11 w-12 rounded-lg border-2 border-primary/50 bg-surface text-center text-lg font-extrabold tabular-nums text-fg-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function FilaResultado({ partido }: { partido: PartidoAdmin }) {
  const [gl, setGl] = useState(partido.golesLocal?.toString() ?? "");
  const [gv, setGv] = useState(partido.golesVisitante?.toString() ?? "");
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [finalizado, setFinalizado] = useState(partido.estado === "finalizado");

  function limpiar(v: string) {
    return v.replace(/\D/g, "").slice(0, 2);
  }

  async function guardar() {
    if (gl === "" || gv === "") {
      toast.error("Ingresa ambos marcadores");
      return;
    }
    setGuardando(true);
    const r = await registrarResultado({
      partidoId: partido.id,
      golesLocal: Number(gl),
      golesVisitante: Number(gv),
    });
    setGuardando(false);
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo registrar");
      return;
    }
    setFinalizado(true);
    toast.success("Resultado registrado · puntos recalculados");
  }

  async function eliminar() {
    setEliminando(true);
    const r = await limpiarResultado({ partidoId: partido.id });
    setEliminando(false);
    if (!r.ok) {
      toast.error(r.error ?? "No se pudo eliminar");
      return;
    }
    setFinalizado(false);
    setGl("");
    setGv("");
    setDialogAbierto(false);
    toast.success("Resultado eliminado · puntos revertidos");
  }

  return (
    <div className="surface-card flex flex-col gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="t-caption font-semibold text-fg-muted">
            {partido.etiqueta}
          </span>
          <span aria-hidden className="text-fg-subtle">·</span>
          <span className="t-caption text-fg-subtle">{partido.fechaTexto}</span>
          {finalizado && (
            <Badge variant="success">
              <Check className="size-3" /> Final
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-fg-strong">
          <Flag code={partido.localIso} size={22} round />
          <span className="truncate">{partido.localNombre}</span>
          <span className="text-fg-subtle">vs</span>
          <Flag code={partido.visitanteIso} size={22} round />
          <span className="truncate">{partido.visitanteNombre}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <input
          inputMode="numeric"
          aria-label={`Goles ${partido.localNombre}`}
          value={gl}
          onChange={(e) => setGl(limpiar(e.target.value))}
          placeholder="–"
          className={inputCls}
        />
        <span className="font-extrabold text-fg-subtle">-</span>
        <input
          inputMode="numeric"
          aria-label={`Goles ${partido.visitanteNombre}`}
          value={gv}
          onChange={(e) => setGv(limpiar(e.target.value))}
          placeholder="–"
          className={inputCls}
        />
        <Button
          size="sm"
          onClick={guardar}
          disabled={guardando || eliminando}
          className="ml-1"
        >
          {guardando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : finalizado ? (
            "Actualizar"
          ) : (
            "Registrar"
          )}
        </Button>

        {finalizado && (
          <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDialogAbierto(true)}
              disabled={guardando || eliminando}
              aria-label="Eliminar resultado"
              className="text-fg-subtle hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Eliminar resultado</DialogTitle>
                <DialogDescription>
                  Se borrará el marcador de{" "}
                  <strong className="text-fg-strong">
                    {partido.localNombre} vs {partido.visitanteNombre}
                  </strong>{" "}
                  y se revertirán los puntos de todas las pollas que lo apostaban.
                  Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" disabled={eliminando}>
                    Cancelar
                  </Button>
                </DialogClose>
                <Button
                  variant="destructive"
                  onClick={eliminar}
                  disabled={eliminando}
                >
                  {eliminando ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="size-4" /> Eliminar
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
