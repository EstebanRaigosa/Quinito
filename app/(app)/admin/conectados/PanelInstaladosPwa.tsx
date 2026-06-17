"use client";

import { useState } from "react";
import { ChevronDown, Download, Smartphone } from "lucide-react";
import { AvatarNotion, tintePorNombre } from "@/components/shared/AvatarNotion";
import { cn } from "@/lib/utils";
import type { ResumenPwa } from "./actions";

/** Fecha legible en es-CO, zona horaria Bogotá (CLAUDE.md §3.5). */
function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

/**
 * Histórico de quiénes han instalado la PWA (abrieron la app en modo standalone
 * al menos una vez). No es en vivo: refleja `tblProfiles.pwa_instalada_en`.
 */
export function PanelInstaladosPwa({ resumen }: { resumen: ResumenPwa }) {
  const [abierto, setAbierto] = useState(false);
  const { totalUsuarios, instalados } = resumen;
  const n = instalados.length;
  const porcentaje =
    totalUsuarios > 0 ? Math.round((n / totalUsuarios) * 100) : 0;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="t-title flex items-center gap-2">
          <Smartphone className="size-5 text-violet-600" /> App instalada
        </h2>
        <p className="t-body-sm mt-1 text-fg-muted">
          Usuarios que han abierto la app desde el ícono instalado (PWA) al menos
          una vez.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-pill bg-violet-50 px-3 py-1.5 text-sm font-semibold text-violet-700">
          <Download className="size-4" /> {n} con la app instalada
        </span>
        <span className="inline-flex items-center gap-2 rounded-pill bg-sunken px-3 py-1.5 text-sm font-semibold text-fg-muted">
          {porcentaje}% de {totalUsuarios} usuarios
        </span>
      </div>

      {n === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <Smartphone className="size-7 text-fg-subtle" />
          <p className="t-body-sm font-semibold text-fg">
            Nadie ha instalado la app todavía
          </p>
          <p className="t-caption text-fg-muted">
            Aquí aparecerán los usuarios apenas abran la app desde el ícono
            instalado.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <span className="t-body-sm font-semibold text-fg-strong">
              Ver lista de usuarios
            </span>
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-fg-muted transition-transform",
                abierto && "rotate-180",
              )}
              aria-hidden
            />
          </button>

          {abierto && (
            <ul className="divide-y divide-border border-t border-border">
              {instalados.map((u) => (
                <li
                  key={u.usuarioId}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <AvatarNotion
                    nombre={u.nombre}
                    size="sm"
                    tint={tintePorNombre(u.nombre)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-fg-strong">
                      {u.nombre}
                    </p>
                    <p className="truncate text-xs text-fg-muted">{u.email}</p>
                  </div>
                  <p className="shrink-0 text-2xs text-fg-subtle">
                    {formatearFecha(u.instaladaEn)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
