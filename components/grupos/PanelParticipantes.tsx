"use client";

import { useMemo, useState } from "react";
import { BellRing, Search, Shield, Users } from "lucide-react";
import type { EstadoPago, Participante } from "@/lib/types/dominio";
import { usePagosGrupo } from "@/lib/queries/pagos";
import { useNotificacionesGrupo } from "@/lib/queries/notificaciones-grupo";
import { formatearMonto } from "@/lib/utils/texto";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { AccionesParticipante } from "@/components/grupos/AccionesParticipante";
import { GestionPago } from "@/components/grupos/GestionPago";
import { GestionPuntajeInicial } from "@/components/grupos/GestionPuntajeInicial";

/** Normaliza para búsqueda: minúsculas y sin acentos. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const BADGE_PAGO: Record<
  Exclude<EstadoPago, "sin_costo">,
  { label: string; variant: "success" | "gold" | "neutral" }
> = {
  pagado: { label: "Pagado", variant: "success" },
  parcial: { label: "Parcial", variant: "gold" },
  pendiente: { label: "Pendiente", variant: "neutral" },
};

export function PanelParticipantes({
  grupoId,
  participantes,
  valorApuesta,
  esAdmin,
}: {
  grupoId: string;
  participantes: Participante[];
  valorApuesta: number;
  esAdmin: boolean;
}) {
  const [busqueda, setBusqueda] = useState("");
  const sinCosto = valorApuesta <= 0;

  // Totales abonados por participante (solo admin; el RPC ya lo restringe).
  const { data: totales } = usePagosGrupo(grupoId, esAdmin && !sinCosto);

  // usuario_id con notificaciones push activas (solo admin; el RPC lo restringe).
  const { data: conNotificaciones } = useNotificacionesGrupo(grupoId, esAdmin);

  // Orden alfabético estable por nombre (es-CO), insensible a acentos/caja.
  const ordenados = useMemo(
    () =>
      [...participantes].sort((a, b) =>
        a.usuario.nombre_completo.localeCompare(
          b.usuario.nombre_completo,
          "es",
          { sensitivity: "base" },
        ),
      ),
    [participantes],
  );

  const filtrados = useMemo(() => {
    const q = norm(busqueda.trim());
    if (!q) return ordenados;
    return ordenados.filter(
      (p) =>
        norm(p.usuario.nombre_completo).includes(q) ||
        (p.usuario.email ? norm(p.usuario.email).includes(q) : false),
    );
  }, [ordenados, busqueda]);

  function estadoDe(p: Participante): {
    estado: EstadoPago;
    total: number | undefined;
  } {
    if (sinCosto) return { estado: "sin_costo", total: undefined };
    const total = totales?.get(p.id);
    if (total === undefined) {
      // Mientras carga el total: estado provisional desde el boolean.
      return { estado: p.pago_realizado ? "pagado" : "pendiente", total };
    }
    if (total >= valorApuesta) return { estado: "pagado", total };
    if (total > 0) return { estado: "parcial", total };
    return { estado: "pendiente", total };
  }

  return (
    <div className="space-y-3">
      {/* Búsqueda */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
          aria-hidden
        />
        <Input
          type="search"
          inputMode="search"
          aria-label="Buscar participante"
          placeholder="Buscar participante…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          icono={Users}
          titulo="Sin resultados"
          descripcion="Nadie coincide con la búsqueda."
        />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {filtrados.map((part) => {
            const { estado, total } = estadoDe(part);
            const badge =
              estado === "sin_costo" ? null : BADGE_PAGO[estado];
            // ¿Hay alguna acción del admin que mostrar en esta tarjeta?
            // (Arranque solo admin · Pago si la polla cuesta · Gestionar a jugadores)
            const tieneAcciones =
              esAdmin || !sinCosto || part.rol !== "admin";
            return (
              <div
                key={part.id}
                className="surface-card hover-lift flex min-w-0 flex-col gap-2.5 rounded-xl border-strong p-3 shadow-md"
              >
                {/* Fila principal: avatar + datos + puntos. */}
                <div className="flex items-center gap-3">
                  <AvatarNotion
                    nombre={part.usuario.nombre_completo}
                    size="sm"
                    className="ring-2 ring-app"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="t-body-sm truncate font-bold text-fg-strong">
                      {part.usuario.nombre_completo}
                    </p>
                    {/* El correo solo lo recibe admin/superadmin (RPC lo restringe). */}
                    {esAdmin && part.usuario.email && (
                      <p className="t-caption truncate text-fg-muted">
                        {part.usuario.email}
                      </p>
                    )}
                  </div>

                  {/* Notis push activas (solo lo ve el admin). Ícono-chip con
                      aria-label; no añade texto para no recargar la fila. */}
                  {esAdmin && conNotificaciones?.has(part.usuario.id) && (
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"
                      title="Notificaciones activas"
                      aria-label="Notificaciones activas"
                    >
                      <BellRing className="size-3.5" aria-hidden />
                    </span>
                  )}

                  {part.rol === "admin" && (
                    <Badge variant="accent" className="shrink-0">
                      <Shield className="size-3" /> Admin
                    </Badge>
                  )}

                  <span className="inline-flex shrink-0 items-center rounded-pill bg-foreground px-3 py-1 text-sm font-bold tabular-nums text-background shadow-sm">
                    {part.puntos_totales}
                  </span>
                </div>

                {/* Estado de pago + saldo: fila propia a ancho completo (oculto si
                    la polla no tiene costo). Va aquí —y no junto al nombre— para que
                    el monto, que no se puede partir, nunca compita por el espacio
                    angosto del nombre y desborde la tarjeta en móvil. */}
                {badge && (
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <Badge variant={badge.variant} className="shrink-0">
                      {badge.label}
                    </Badge>
                    {total !== undefined && (
                      <span className="t-caption tabular-nums text-fg-muted">
                        {formatearMonto(total)} / {formatearMonto(valorApuesta)}
                      </span>
                    )}
                  </span>
                )}

                {/* Fila de acciones del admin: envuelve en móvil, sin scroll horizontal. */}
                {tieneAcciones && (
                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-2.5">
                    {esAdmin && (
                      <GestionPuntajeInicial
                        grupoId={grupoId}
                        participanteId={part.id}
                        nombre={part.usuario.nombre_completo}
                        puntosIniciales={part.puntos_iniciales}
                        exactosIniciales={part.exactos_iniciales}
                        unicasIniciales={part.unicas_iniciales}
                        aciertosIniciales={part.aciertos_iniciales}
                      />
                    )}

                    {!sinCosto && (
                      <GestionPago
                        grupoId={grupoId}
                        participanteId={part.id}
                        nombre={part.usuario.nombre_completo}
                        valorApuesta={valorApuesta}
                        totalAbonado={total ?? 0}
                      />
                    )}

                    {/* Solo se puede gestionar a jugadores (no a admins). */}
                    {part.rol !== "admin" && (
                      <AccionesParticipante
                        grupoId={grupoId}
                        participanteId={part.id}
                        nombre={part.usuario.nombre_completo}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
