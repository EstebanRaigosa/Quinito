"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone, Users, Wifi, WifiOff } from "lucide-react";
import { AvatarNotion, tintePorNombre } from "@/components/shared/AvatarNotion";
import { cn } from "@/lib/utils";
import { obtenerConectados, type Conectado } from "./actions";

/** Cada cuánto re-consultamos la lista al servidor (un solo admin viéndola). */
const SONDEO_MS = 8_000;

type Estado = "activo" | "inactivo" | "ausente";

function clasificar(
  c: Conectado,
  ahora: number,
): { segundos: number; estado: Estado } {
  const segundos = Math.max(
    0,
    Math.floor((ahora - new Date(c.ultimaActividad).getTime()) / 1000),
  );
  let estado: Estado;
  if (c.visible && segundos <= 75) estado = "activo";
  else if (segundos <= 180) estado = "inactivo";
  else estado = "ausente";
  return { segundos, estado };
}

function hace(segundos: number): string {
  if (segundos < 60) return `hace ${segundos}s`;
  const m = Math.floor(segundos / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  return `hace ${h} h`;
}

const ESTADO_UI: Record<Estado, { etiqueta: string; punto: string; texto: string }> = {
  activo: { etiqueta: "Activo", punto: "bg-emerald-500", texto: "text-emerald-600" },
  inactivo: { etiqueta: "Inactivo", punto: "bg-amber-500", texto: "text-amber-600" },
  ausente: { etiqueta: "Ausente", punto: "bg-fg-subtle", texto: "text-fg-subtle" },
};

/**
 * Tablero en vivo de usuarios conectados. Sondea la server action cada 8s y, en
 * paralelo, refresca las etiquetas relativas ("hace 12s", estado) cada segundo
 * sin volver a llamar al servidor.
 */
export function PanelConectados({ inicial }: { inicial: Conectado[] }) {
  const [lista, setLista] = useState<Conectado[]>(inicial);
  const [ahora, setAhora] = useState(() => Date.now());

  // Sondeo al servidor (solo mientras la pestaña está visible).
  useEffect(() => {
    let activo = true;
    const consultar = async () => {
      if (document.visibilityState !== "visible") return;
      const datos = await obtenerConectados();
      if (activo) setLista(datos);
    };
    const timer = setInterval(consultar, SONDEO_MS);
    const alVolver = () => {
      if (document.visibilityState === "visible") void consultar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("pageshow", alVolver);
    return () => {
      activo = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("pageshow", alVolver);
    };
  }, []);

  // Reloj local: recalcula "hace cuánto" / estado cada segundo.
  useEffect(() => {
    const timer = setInterval(() => setAhora(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const conEstado = lista.map((c) => ({ c, ...clasificar(c, ahora) }));
  const activos = conEstado.filter((x) => x.estado === "activo").length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-pill bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
          <Wifi className="size-4" /> {activos} {activos === 1 ? "activo" : "activos"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-pill bg-sunken px-3 py-1.5 text-sm font-semibold text-fg-muted">
          <Users className="size-4" /> {lista.length} en total
        </span>
      </div>

      {conEstado.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <WifiOff className="size-7 text-fg-subtle" />
          <p className="t-body-sm font-semibold text-fg">Nadie conectado ahora mismo</p>
          <p className="t-caption text-fg-muted">
            Aquí aparecerán los usuarios apenas abran la app.
          </p>
        </div>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {conEstado.map(({ c, segundos, estado }) => {
            const ui = ESTADO_UI[estado];
            const Dispositivo = c.dispositivo === "movil" ? Smartphone : Monitor;
            return (
              <li
                key={c.usuarioId}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                <div className="relative shrink-0">
                  <AvatarNotion
                    nombre={c.nombre}
                    size="md"
                    tint={tintePorNombre(c.nombre)}
                  />
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-surface",
                      ui.punto,
                    )}
                    aria-hidden
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-fg-strong">
                    {c.nombre}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-fg-muted">
                    <Dispositivo className="size-3.5 shrink-0" />
                    {c.seccion}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className={cn("text-xs font-semibold", ui.texto)}>
                    {ui.etiqueta}
                  </p>
                  <p className="text-2xs text-fg-subtle">{hace(segundos)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
