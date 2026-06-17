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
  /** True si es cruce eliminatorio: un empate a los 90' exige definir el avance. */
  esEliminatoria: boolean;
  penalesLocal: number | null;
  penalesVisitante: number | null;
  /** Marcador del tiempo extra (cuando el cruce se resolvió en la prórroga). */
  prorrogaLocal: number | null;
  prorrogaVisitante: number | null;
  /** Cómo se definió (regular / prórroga / penales). */
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
  // Marcador del tiempo extra (cuando el cruce se resolvió en la prórroga).
  const [prl, setPrl] = useState(partido.prorrogaLocal?.toString() ?? "");
  const [prv, setPrv] = useState(partido.prorrogaVisitante?.toString() ?? "");
  // Definición del cruce cuando el marcador de los 90' quedó empatado: en tiempo
  // extra (prorroga) o por penales. Solo aplica a ese caso.
  const [definicion, setDefinicion] = useState<"prorroga" | "penales">(
    partido.tipoDefinicion === "prorroga" ? "prorroga" : "penales",
  );
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [finalizado, setFinalizado] = useState(partido.estado === "finalizado");

  // El tiempo extra solo existe si el cruce quedó EMPATADO a los 90'.
  const ambosGoles = gl !== "" && gv !== "";
  const empate = ambosGoles && gl === gv;
  const requiereDefinicion = partido.esEliminatoria && empate;
  const penalesIguales = pl !== "" && pv !== "" && pl === pv;
  const prorrogaIguales = prl !== "" && prv !== "" && prl === prv;

  function limpiar(v: string) {
    return v.replace(/\D/g, "").slice(0, 2);
  }

  async function guardar() {
    if (gl === "" || gv === "") {
      toast.error("Ingresa ambos marcadores");
      return;
    }
    // Desempate cuando hubo empate a los 90' (tiempo extra o penales). El equipo
    // que avanza lo deriva la BD del marcador correspondiente.
    let penalesLocal: number | undefined;
    let penalesVisitante: number | undefined;
    let prorrogaLocal: number | undefined;
    let prorrogaVisitante: number | undefined;
    if (requiereDefinicion) {
      if (definicion === "penales") {
        if (pl === "" || pv === "") {
          toast.error("Empate a los 90': ingresa la tanda de penales");
          return;
        }
        if (pl === pv) {
          toast.error("Los penales no pueden quedar empatados");
          return;
        }
        penalesLocal = Number(pl);
        penalesVisitante = Number(pv);
      } else {
        if (prl === "" || prv === "") {
          toast.error("Tiempo extra: ingresa el marcador");
          return;
        }
        if (prl === prv) {
          toast.error("El marcador del tiempo extra no puede quedar empatado");
          return;
        }
        prorrogaLocal = Number(prl);
        prorrogaVisitante = Number(prv);
      }
    }
    setGuardando(true);
    const r = await registrarResultado({
      partidoId: partido.id,
      golesLocal: Number(gl),
      golesVisitante: Number(gv),
      penalesLocal,
      penalesVisitante,
      prorrogaLocal,
      prorrogaVisitante,
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
    setPrl("");
    setPrv("");
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

      {requiereDefinicion && (
        <div className="flex w-full flex-col gap-2.5 rounded-lg bg-amber-500/10 p-2.5 sm:basis-full">
          {/* Empate a los 90': ¿cómo se resolvió el cruce? */}
          <div className="flex flex-col gap-1.5">
            <span className="t-caption font-semibold text-amber-700 dark:text-amber-400">
              Empate a los 90’ · ¿cómo se resolvió?
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { valor: "prorroga", etiqueta: "Tiempo extra" },
                  { valor: "penales", etiqueta: "Penales" },
                ] as const
              ).map((op) => {
                const activo = definicion === op.valor;
                return (
                  <button
                    key={op.valor}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setDefinicion(op.valor)}
                    className={cn(
                      "min-h-[44px] rounded-lg border-2 px-2 py-2 text-sm font-bold transition-colors",
                      activo
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-strong bg-surface text-fg-strong hover:border-primary/50",
                    )}
                  >
                    {op.etiqueta}
                  </button>
                );
              })}
            </div>
          </div>

          {definicion === "penales" ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="t-caption font-semibold text-fg-muted">Penales:</span>
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
              {pl !== "" && pv !== "" && !penalesIguales && (
                <span className="t-caption truncate font-bold text-fg-strong">
                  Pasa{" "}
                  {Number(pl) > Number(pv)
                    ? partido.localNombre
                    : partido.visitanteNombre}
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="t-caption font-semibold text-fg-muted">
                Marcador en tiempo extra:
              </span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`Tiempo extra ${partido.localNombre}`}
                value={prl}
                onChange={(e) => setPrl(limpiar(e.target.value))}
                onFocus={centrarEnFoco}
                className={cn(inputCls, "h-9 w-10 text-base")}
              />
              <span className="font-extrabold text-fg-subtle">-</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`Tiempo extra ${partido.visitanteNombre}`}
                value={prv}
                onChange={(e) => setPrv(limpiar(e.target.value))}
                onFocus={centrarEnFoco}
                className={cn(inputCls, "h-9 w-10 text-base")}
              />
              {prl !== "" && prv !== "" && !prorrogaIguales && (
                <span className="t-caption truncate font-bold text-fg-strong">
                  Pasa{" "}
                  {Number(prl) > Number(prv)
                    ? partido.localNombre
                    : partido.visitanteNombre}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
