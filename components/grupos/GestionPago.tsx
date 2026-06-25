"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Wallet, Trash2, Loader2, Plus, Banknote, CreditCard } from "lucide-react";
import { registrarAbono, eliminarAbono } from "@/app/(app)/grupos/[id]/actions";
import { useAbonosParticipante } from "@/lib/queries/pagos";
import { abonoSchema } from "@/lib/schemas/abono";
import { formatearMonto } from "@/lib/utils/texto";
import { formatearFechaHoraBogota, claveDiaBogota } from "@/lib/utils/fechas";
import { cn } from "@/lib/utils";
import { ComprobantePago } from "@/components/grupos/ComprobantePago";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Props = {
  grupoId: string;
  participanteId: string;
  nombre: string;
  grupoNombre: string;
  valorApuesta: number;
  totalAbonado: number;
  /**
   * Disparador personalizado (p. ej. una fila completa clickeable). Si se omite,
   * se usa el botón "Pago" por defecto. Debe ser un único elemento enfocable:
   * va dentro de `DialogTrigger asChild`.
   */
  trigger?: React.ReactNode;
};

/** Método de pago del abono. Se guarda como nota del abono. */
type MetodoPago = "Efectivo" | "Transferencia";

/** Pesos enteros contenidos en un texto: "$600.000" → 600000. */
function soloDigitos(texto: string): number {
  const limpio = texto.replace(/\D/g, "");
  return limpio ? Number(limpio) : 0;
}

/** Formatea con separador de miles es-CO mientras se escribe: "600000" → "600.000". */
function formatearMiles(texto: string): string {
  const limpio = texto.replace(/\D/g, "");
  return limpio ? new Intl.NumberFormat("es-CO").format(Number(limpio)) : "";
}

/**
 * Gestión de pagos parciales (abonos) de un participante. Muestra el saldo,
 * permite registrar un abono (monto + nota, con atajo "Pagar todo") y ver/eliminar
 * el historial. Toda la validación dura vive en los RPCs; aquí solo UX.
 */
export function GestionPago({
  grupoId,
  participanteId,
  nombre,
  grupoNombre,
  valorApuesta,
  totalAbonado,
  trigger,
}: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago>("Efectivo");
  // Fecha del pago (YYYY-MM-DD en zona Bogotá). Por defecto, hoy.
  const hoyBogota = claveDiaBogota(new Date());
  const [fechaPago, setFechaPago] = useState(hoyBogota);
  const [errorCampo, setErrorCampo] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [guardando, startGuardar] = useTransition();
  const [borrando, startBorrar] = useTransition();

  const { data: abonos, isLoading } = useAbonosParticipante(
    participanteId,
    abierto,
  );

  const saldo = Math.max(0, valorApuesta - totalAbonado);
  const completo = saldo <= 0;

  function invalidar() {
    queryClient.invalidateQueries({ queryKey: ["pagos-grupo", grupoId] });
    queryClient.invalidateQueries({
      queryKey: ["abonos-participante", participanteId],
    });
    router.refresh();
  }

  function onRegistrar() {
    setErrorCampo(null);
    const valor = soloDigitos(monto);
    const parsed = abonoSchema.safeParse({ monto: valor, nota: metodo });
    if (!parsed.success) {
      setErrorCampo(parsed.error.issues[0]?.message ?? "Monto inválido");
      return;
    }
    if (valor > saldo) {
      setErrorCampo(`El abono supera el saldo pendiente (${formatearMonto(saldo)})`);
      return;
    }
    // Hoy → sin fecha explícita (el RPC usa `now()`, con la hora real). Una fecha
    // pasada se ancla a mediodía Bogotá (UTC-5) para no cruzar el borde del día.
    const fechaISO =
      fechaPago && fechaPago !== hoyBogota
        ? new Date(`${fechaPago}T12:00:00-05:00`).toISOString()
        : undefined;
    startGuardar(async () => {
      const res = await registrarAbono(
        grupoId,
        participanteId,
        valor,
        metodo,
        fechaISO,
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`Abono de ${formatearMonto(valor)} registrado`, {
        description: res.codigo ? `Comprobante ${res.codigo}` : undefined,
      });
      setMonto("");
      setMetodo("Efectivo");
      setFechaPago(hoyBogota);
      invalidar();
    });
  }

  function onEliminar(abonoId: string) {
    startBorrar(async () => {
      const res = await eliminarAbono(grupoId, abonoId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Abono eliminado");
      setConfirmandoId(null);
      invalidar();
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="shrink-0">
            <Wallet className="size-4" />
            Pago
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="flex max-h-[80dvh] max-w-sm flex-col">
        <DialogHeader>
          <DialogTitle>Pago de {nombre}</DialogTitle>
          <DialogDescription>
            Abonado {formatearMonto(totalAbonado)} de{" "}
            {formatearMonto(valorApuesta)}
            {completo ? " · Pagado" : ` · Faltan ${formatearMonto(saldo)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain">
          {/* Registrar abono */}
          {!completo && (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label
                    htmlFor="monto-abono"
                    className="t-caption font-semibold text-fg-muted"
                  >
                    Monto
                  </label>
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted"
                      aria-hidden
                    >
                      $
                    </span>
                    <Input
                      id="monto-abono"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className="pl-7 tabular-nums"
                      value={monto}
                      onChange={(e) => setMonto(formatearMiles(e.target.value))}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mb-0.5"
                  onClick={() => setMonto(formatearMiles(String(saldo)))}
                >
                  Pagar todo
                </Button>
              </div>
              <div>
                <span className="t-caption font-semibold text-fg-muted">
                  Método
                </span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {(["Efectivo", "Transferencia"] as const).map((opt) => {
                    const activo = metodo === opt;
                    const Icono = opt === "Efectivo" ? Banknote : CreditCard;
                    return (
                      <Button
                        key={opt}
                        type="button"
                        variant={activo ? "default" : "outline"}
                        size="sm"
                        aria-pressed={activo}
                        className="justify-center"
                        onClick={() => setMetodo(opt)}
                      >
                        <Icono className="size-4" />
                        {opt}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label
                  htmlFor="fecha-abono"
                  className="t-caption font-semibold text-fg-muted"
                >
                  Fecha del pago
                </label>
                <Input
                  id="fecha-abono"
                  type="date"
                  className="mt-1"
                  value={fechaPago}
                  max={hoyBogota}
                  onChange={(e) => setFechaPago(e.target.value)}
                />
              </div>
              {errorCampo && (
                <p className="t-caption text-destructive">{errorCampo}</p>
              )}
              <Button
                type="button"
                className="w-full"
                disabled={guardando || soloDigitos(monto) <= 0}
                onClick={onRegistrar}
              >
                {guardando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Registrar abono
              </Button>
            </div>
          )}

          {/* Historial */}
          <div className="space-y-2">
            <p className="t-caption font-bold uppercase tracking-wide text-fg-subtle">
              Historial
            </p>
            {isLoading ? (
              <p className="t-body-sm text-fg-muted">Cargando…</p>
            ) : !abonos || abonos.length === 0 ? (
              <p className="t-body-sm text-fg-muted">
                Aún no hay abonos registrados.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {abonos.map((a) => (
                  <li
                    key={a.id}
                    className="space-y-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold tabular-nums text-fg-strong">
                          {formatearMonto(a.monto)}
                        </p>
                        <p className="t-caption truncate text-fg-muted">
                          {formatearFechaHoraBogota(a.creado_en)}
                          {a.nota ? ` · ${a.nota}` : ""}
                        </p>
                        {a.codigo && (
                          <p className="t-caption font-mono tracking-wide text-fg-subtle">
                            {a.codigo}
                          </p>
                        )}
                      </div>
                      {confirmandoId !== a.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar abono"
                          className={cn("shrink-0 text-fg-muted")}
                          onClick={() => setConfirmandoId(a.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>

                    {confirmandoId === a.id ? (
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={borrando}
                          onClick={() => onEliminar(a.id)}
                        >
                          {borrando ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Eliminar"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={borrando}
                          onClick={() => setConfirmandoId(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : a.codigo ? (
                      <ComprobantePago
                        nombre={nombre}
                        grupoNombre={grupoNombre}
                        monto={a.monto}
                        valor={valorApuesta}
                        metodo={a.nota}
                        codigo={a.codigo}
                        fechaISO={a.creado_en}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
