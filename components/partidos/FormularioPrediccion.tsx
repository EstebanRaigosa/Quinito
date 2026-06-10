"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Check, Clock, Loader2, Lock, Pencil, WifiOff } from "lucide-react";
import { toast } from "sonner";
import type { Partido } from "@/lib/types/dominio";
import { guardarPrediccion } from "@/lib/queries/predicciones";
import { formatearHoraBogota } from "@/lib/utils/fechas";
import { cn } from "@/lib/utils";
import { Flag } from "@/components/shared/Flag";
import { ScoreStepper } from "@/components/partidos/ScoreStepper";
import { Button } from "@/components/ui/button";

type Props = {
  partido: Partido;
  participanteId: string;
  golesLocalInicial?: number;
  golesVisitanteInicial?: number;
  bloqueado: boolean;
  motivoBloqueo?: string;
  /** Equipos ya definidos: si está cerrado sin predicción, se avisa en rojo. */
  equiposDefinidos?: boolean;
  /** El partido se juega hoy (zona Bogotá): muestra el badge "¡Es hoy!". */
  esHoy?: boolean;
  /** Se invoca tras guardar con éxito (para que la tarjeta actualice su estado). */
  onGuardado?: () => void;
};

export function FormularioPrediccion({
  partido,
  participanteId,
  golesLocalInicial,
  golesVisitanteInicial,
  bloqueado,
  motivoBloqueo,
  equiposDefinidos = false,
  esHoy = false,
  onGuardado,
}: Props) {
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<number | null>(golesLocalInicial ?? null);
  const [visitante, setVisitante] = useState<number | null>(
    golesVisitanteInicial ?? null,
  );
  const [editando, setEditando] = useState(false);
  // Línea base = último marcador guardado. Se actualiza tras guardar con éxito.
  const [base, setBase] = useState<{ l: number | null; v: number | null }>({
    l: golesLocalInicial ?? null,
    v: golesVisitanteInicial ?? null,
  });

  const guardado = base.l !== null && base.v !== null;
  const completo = local !== null && visitante !== null;
  // Solo-lectura: bloqueada por tiempo, o ya guardada y no se está editando.
  const soloLectura = bloqueado || (guardado && !editando);

  /**
   * Guardado con `useMutation`. `networkMode: "online"` es clave: si no hay
   * conexión (WiFi de estadio), la mutación se PAUSA y se reintenta sola al
   * reconectar, en vez de fallar en silencio y perder la predicción
   * (COMPATIBILIDAD-STACK.md §6). `retry` cubre cortes intermitentes.
   */
  const mutation = useMutation({
    mutationFn: async (vars: { golesLocal: number; golesVisitante: number }) => {
      const { ok, error } = await guardarPrediccion({
        participanteId,
        partidoId: partido.id,
        golesLocal: vars.golesLocal,
        golesVisitante: vars.golesVisitante,
      });
      if (!ok) throw new Error(error ?? "No se pudo guardar");
      return vars;
    },
    networkMode: "online",
    retry: 2,
    retryDelay: (intento) => Math.min(1000 * 2 ** intento, 8000),
    onSuccess: (vars) => {
      setBase({ l: vars.golesLocal, v: vars.golesVisitante });
      setEditando(false);
      onGuardado?.();
      toast.success("Predicción guardada");
      // Refresca los agregados del partido (% ganador, marcadores comunes).
      queryClient.invalidateQueries({
        predicate: (q) =>
          typeof q.queryKey[0] === "string" &&
          (q.queryKey[0] as string).startsWith("estadisticas"),
      });
    },
    onError: () => {
      toast.error("No se pudo guardar. ¿Ya cerró la apuesta?");
    },
  });

  // `isPending` cubre también el estado pausado (sin red): el botón sigue en
  // "guardando" hasta que reconecte y confirme.
  const guardando = mutation.isPending;

  function guardar() {
    if (!completo) {
      toast.error("Ingresa ambos marcadores");
      return;
    }
    mutation.mutate({ golesLocal: local, golesVisitante: visitante });
  }

  const nombreLocal = partido.equipo_local?.nombre ?? "Local";
  const nombreVisitante = partido.equipo_visitante?.nombre ?? "Visitante";

  return (
    <div className="space-y-3">
      {/* Marcadores: equipo + bandera arriba, stepper con caja verde abajo */}
      <div className="flex items-start justify-center gap-3 sm:gap-5">
        <div className="flex flex-1 flex-col items-center gap-2.5">
          <div className="flex flex-col items-center gap-1.5">
            <Flag code={partido.equipo_local?.codigo_iso} size={40} round />
            <span className="line-clamp-2 text-center text-sm font-bold leading-tight text-fg-strong">
              {nombreLocal}
            </span>
          </div>
          <ScoreStepper
            value={local}
            onChange={setLocal}
            disabled={soloLectura}
            ariaLabel={nombreLocal}
          />
        </div>

        <div className="mt-7 flex shrink-0 flex-col items-center gap-1.5">
          <span className="t-caption font-extrabold uppercase tracking-widest text-fg-subtle">
            vs
          </span>
          <span className="t-caption inline-flex items-center gap-1 whitespace-nowrap rounded-pill bg-sunken px-2 py-0.5 font-bold text-fg-muted">
            <Clock className="size-3.5 text-fg-subtle" />
            {formatearHoraBogota(partido.fecha_hora)}
          </span>
          {esHoy && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-pill bg-destructive-soft px-2 py-0.5 text-2xs font-extrabold uppercase tracking-wide text-destructive">
              <span
                aria-hidden
                className="size-1.5 animate-pulse rounded-full bg-destructive"
              />
              ¡Es hoy!
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center gap-2.5">
          <div className="flex flex-col items-center gap-1.5">
            <Flag code={partido.equipo_visitante?.codigo_iso} size={40} round />
            <span className="line-clamp-2 text-center text-sm font-bold leading-tight text-fg-strong">
              {nombreVisitante}
            </span>
          </div>
          <ScoreStepper
            value={visitante}
            onChange={setVisitante}
            disabled={soloLectura}
            ariaLabel={nombreVisitante}
          />
        </div>
      </div>

      {/* Pie: estado + acción */}
      {bloqueado ? (
        !guardado && equiposDefinidos ? (
          // Cerrado y sin marcador: se avisa en rojo que no predijiste.
          <p className="flex items-center justify-center gap-1.5 rounded-lg bg-destructive-soft px-3 py-2.5 text-center text-sm font-bold text-destructive">
            <Ban className="size-4 shrink-0" aria-hidden />
            No pusiste predicción
          </p>
        ) : (
          <p className="flex items-center justify-center gap-1.5 rounded-lg bg-muted px-3 py-2.5 text-center text-sm font-medium text-fg-muted">
            <Lock className="size-4 shrink-0" aria-hidden />
            {motivoBloqueo ?? "Apuesta cerrada"}
          </p>
        )
      ) : guardado && !editando ? (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-success">
            <Check className="size-4 shrink-0" /> Predicción guardada
          </span>
          <Button
            variant="secondary"
            onClick={() => setEditando(true)}
            className="w-full sm:w-auto"
          >
            <Pencil className="size-4" /> Editar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          {mutation.isPaused ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-info-soft px-3.5 py-1.5 text-sm font-bold text-info shadow-sm ring-1 ring-info/25">
              <WifiOff className="size-4 shrink-0" aria-hidden />
              Sin conexión — se guardará al reconectar
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-3.5 py-1.5 text-sm font-bold text-warning shadow-sm ring-1 ring-warning/25">
              <span aria-hidden className="relative flex size-2.5 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-warning" />
              </span>
              {guardado ? "Edita tu marcador y guarda" : "Falta guardar tu predicción"}
            </span>
          )}
          <Button
            onClick={guardar}
            disabled={guardando || !completo}
            className={cn("w-full sm:w-auto", !completo && "opacity-60")}
          >
            {guardando && <Loader2 className="size-4 animate-spin" />}
            Guardar predicción
          </Button>
        </div>
      )}
    </div>
  );
}
