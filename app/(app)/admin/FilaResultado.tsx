"use client";

import { useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { TipoDefinicion } from "@/lib/types/dominio";
import { cn } from "@/lib/utils";
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
  /** True si es cruce eliminatorio: un empate exige definir penales. */
  esEliminatoria: boolean;
  penalesLocal: number | null;
  penalesVisitante: number | null;
  /** Cómo se definió (para reflejar el estado del checkbox de prórroga). */
  tipoDefinicion: TipoDefinicion;
};

const inputCls =
  "h-11 w-12 rounded-lg border-2 border-primary/50 bg-surface text-center text-lg font-extrabold tabular-nums text-fg-strong shadow-[inset_0_2px_4px_rgba(0,0,0,0.12)] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * En táctil (iOS) el teclado flota y puede tapar el input/botón en una lista
 * larga; al enfocar, esperamos la animación del teclado y centramos la fila
 * (COMPATIBILIDAD-MOVIL.md §4.1).
 */
function centrarEnFoco(e: React.FocusEvent<HTMLInputElement>) {
  if (typeof window === "undefined") return;
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  const el = e.currentTarget;
  setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 300);
}

export function FilaResultado({ partido }: { partido: PartidoAdmin }) {
  const [gl, setGl] = useState(partido.golesLocal?.toString() ?? "");
  const [gv, setGv] = useState(partido.golesVisitante?.toString() ?? "");
  const [pl, setPl] = useState(partido.penalesLocal?.toString() ?? "");
  const [pv, setPv] = useState(partido.penalesVisitante?.toString() ?? "");
  // Cómo se definió el cruce (90' / prórroga / penales). El admin lo elige.
  const [modo, setModo] = useState<TipoDefinicion>(partido.tipoDefinicion);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [finalizado, setFinalizado] = useState(partido.estado === "finalizado");

  // En un cruce eliminatorio, un empate en goles obliga a definir penales.
  const ambosGoles = gl !== "" && gv !== "";
  const empate = ambosGoles && gl === gv;
  const requierePenales = partido.esEliminatoria && empate;
  // El selector "¿cómo se definió?" aparece en eliminatoria al cargar los goles.
  const mostrarSelector = partido.esEliminatoria && ambosGoles;
  // Modo efectivo según el marcador: un empate SIEMPRE es penales; con ganador,
  // penales no aplica (queda 90' o prórroga, lo que haya elegido el admin).
  const modoEfectivo: TipoDefinicion = empate
    ? "penales"
    : modo === "prorroga"
      ? "prorroga"
      : "regular";

  function limpiar(v: string) {
    return v.replace(/\D/g, "").slice(0, 2);
  }

  async function guardar() {
    if (gl === "" || gv === "") {
      toast.error("Ingresa ambos marcadores");
      return;
    }
    if (requierePenales && (pl === "" || pv === "")) {
      toast.error("Empate en eliminación: define los penales");
      return;
    }
    if (requierePenales && pl === pv) {
      toast.error("Los penales no pueden quedar empatados");
      return;
    }
    setGuardando(true);
    const r = await registrarResultado({
      partidoId: partido.id,
      golesLocal: Number(gl),
      golesVisitante: Number(gv),
      penalesLocal: requierePenales ? Number(pl) : undefined,
      penalesVisitante: requierePenales ? Number(pv) : undefined,
      prorroga: modoEfectivo === "prorroga",
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
    setPl("");
    setPv("");
    setDialogAbierto(false);
    toast.success("Resultado eliminado · puntos revertidos");
  }

  return (
    <div className="surface-card flex flex-col flex-wrap gap-3 rounded-xl p-3 sm:flex-row sm:items-center sm:justify-between">
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
          pattern="[0-9]*"
          enterKeyHint="next"
          aria-label={`Goles ${partido.localNombre}`}
          value={gl}
          onChange={(e) => setGl(limpiar(e.target.value))}
          onFocus={centrarEnFoco}
          className={cn(
            inputCls,
            gl === "" && "border-primary bg-primary/10 shadow-[inset_0_2px_7px_rgba(0,0,0,0.18)]",
          )}
        />
        <span className="font-extrabold text-fg-subtle">-</span>
        <input
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          aria-label={`Goles ${partido.visitanteNombre}`}
          value={gv}
          onChange={(e) => setGv(limpiar(e.target.value))}
          onFocus={centrarEnFoco}
          className={cn(
            inputCls,
            gv === "" && "border-primary bg-primary/10 shadow-[inset_0_2px_7px_rgba(0,0,0,0.18)]",
          )}
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

      {mostrarSelector && (
        <div className="flex w-full flex-col gap-1.5 sm:basis-full">
          <span className="t-caption font-semibold text-fg-muted">
            ¿Cómo se definió?
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { valor: "regular", etiqueta: "90 minutos", habilitado: !empate },
                { valor: "prorroga", etiqueta: "Tiempo extra", habilitado: !empate },
                { valor: "penales", etiqueta: "Penales", habilitado: empate },
              ] as const
            ).map((op) => {
              const activo = modoEfectivo === op.valor;
              return (
                <button
                  key={op.valor}
                  type="button"
                  disabled={!op.habilitado}
                  aria-pressed={activo}
                  onClick={() => setModo(op.valor)}
                  className={cn(
                    "min-h-[44px] rounded-lg border-2 px-2 py-2 text-sm font-bold transition-colors",
                    activo
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-strong bg-surface text-fg-strong",
                    op.habilitado && !activo && "hover:border-primary/50",
                    !op.habilitado && "cursor-not-allowed opacity-45",
                  )}
                >
                  {op.etiqueta}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {requierePenales && (
        <div className="flex w-full items-center gap-2 rounded-lg bg-amber-500/10 p-2.5 sm:basis-full">
          <span className="t-caption font-semibold text-amber-700 dark:text-amber-400">
            Empate · ¿quién pasa? Penales:
          </span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={`Penales ${partido.localNombre}`}
            value={pl}
            onChange={(e) => setPl(limpiar(e.target.value))}
            onFocus={centrarEnFoco}
            className={cn(inputCls, "h-9 w-10 text-base")}
          />
          <span className="font-extrabold text-fg-subtle">-</span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={`Penales ${partido.visitanteNombre}`}
            value={pv}
            onChange={(e) => setPv(limpiar(e.target.value))}
            onFocus={centrarEnFoco}
            className={cn(inputCls, "h-9 w-10 text-base")}
          />
          {pl !== "" && pv !== "" && pl !== pv && (
            <span className="t-caption truncate font-bold text-fg-strong">
              Pasa {Number(pl) > Number(pv) ? partido.localNombre : partido.visitanteNombre}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
