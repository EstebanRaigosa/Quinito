"use client";

import { useState } from "react";
import { Search, Loader2, Receipt, SearchX } from "lucide-react";
import { useBuscarComprobante } from "@/lib/queries/comprobantes";
import { formatearMonto } from "@/lib/utils/texto";
import { formatearFechaHoraBogota } from "@/lib/utils/fechas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Buscador de comprobantes por código (visible solo para admin del grupo o
 * superadmin: el RPC `buscar_comprobante` aplica el guard). Sirve para verificar,
 * cuando un participante presenta su código, cuándo se hizo el pago y por cuánto.
 *
 * Funciona igual en la pestaña Gente (admin → solo sus pollas) y en el panel de
 * superadmin (cualquier polla): es el RLS quien decide qué se encuentra.
 */
export function BuscadorComprobante() {
  const [valor, setValor] = useState("");
  const [termino, setTermino] = useState<string | null>(null);

  const { data, isFetching, isError } = useBuscarComprobante(termino);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const limpio = valor.trim();
    setTermino(limpio.length > 0 ? limpio : null);
  }

  const buscado = termino !== null && !isFetching;
  const sinResultado = buscado && !isError && data === null;

  return (
    <div className="surface-card space-y-3 rounded-xl border-strong p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
          <Receipt className="size-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="t-body-sm font-bold text-fg-strong">
            Verificar comprobante
          </p>
          <p className="t-caption text-fg-muted">
            Busca por código para confirmar el pago.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
            aria-hidden
          />
          <Input
            type="search"
            inputMode="text"
            autoCapitalize="characters"
            aria-label="Código de comprobante"
            placeholder="CMP-XXXXXXXX"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="pl-9 font-mono uppercase tracking-wide"
          />
        </div>
        <Button type="submit" disabled={isFetching || valor.trim().length === 0}>
          {isFetching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Buscar
        </Button>
      </form>

      {isError && (
        <p className="t-body-sm text-destructive">
          No se pudo buscar el comprobante. Inténtalo de nuevo.
        </p>
      )}

      {sinResultado && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-sunken px-3 py-3 text-fg-muted">
          <SearchX className="size-4 shrink-0" aria-hidden />
          <p className="t-body-sm">
            No se encontró ningún comprobante con ese código.
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-2 rounded-lg border border-border bg-sunken p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-bold tracking-wide text-fg-strong">
              {data.codigo}
            </span>
            <Badge variant={data.pagado ? "success" : "gold"}>
              {data.pagado ? "Pagado" : "Pendiente"}
            </Badge>
          </div>

          <div className="grid gap-1.5">
            <Dato etiqueta="Valor del pago" valor={formatearMonto(data.monto)} fuerte />
            <Dato
              etiqueta="Fecha del pago"
              valor={formatearFechaHoraBogota(data.creado_en)}
            />
            {data.metodo && <Dato etiqueta="Método" valor={data.metodo} />}
            {data.participante_nombre && (
              <Dato etiqueta="Participante" valor={data.participante_nombre} />
            )}
            <Dato etiqueta="Polla" valor={data.grupo_nombre} />
            <Dato
              etiqueta="Abonado / Valor polla"
              valor={`${formatearMonto(data.total_abonado)} / ${formatearMonto(data.valor_apuesta)}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Fila etiqueta → valor del resultado. */
function Dato({
  etiqueta,
  valor,
  fuerte = false,
}: {
  etiqueta: string;
  valor: string;
  fuerte?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="t-caption shrink-0 text-fg-muted">{etiqueta}</span>
      <span
        className={
          fuerte
            ? "text-sm font-bold tabular-nums text-fg-strong"
            : "t-body-sm text-right tabular-nums text-fg-default"
        }
      >
        {valor}
      </span>
    </div>
  );
}
