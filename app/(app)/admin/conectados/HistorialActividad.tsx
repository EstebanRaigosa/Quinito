"use client";

import { useMemo, useState } from "react";
import { History, Monitor, Search, Smartphone, Users, X } from "lucide-react";
import { AvatarNotion, tintePorNombre } from "@/components/shared/AvatarNotion";
import { cn } from "@/lib/utils";
import type {
  HistorialActividad as Datos,
  RazonCierre,
} from "./actions";

/** Normaliza para buscar sin distinguir mayúsculas ni acentos (nombres es-CO). */
function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

// Zona horaria fija (CLAUDE.md §3.5): el formato NO depende del navegador, así
// que SSR e hidratación coinciden y no hay desajuste.
const fmtFecha = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "2-digit",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function formatear(iso: string | null): string {
  if (!iso) return "Nunca";
  return fmtFecha.format(new Date(iso));
}

/** Etiqueta + color de cada razón de cierre de sesión. */
const RAZON_UI: Record<RazonCierre, { etiqueta: string; clase: string }> = {
  manual: { etiqueta: "Manual", clase: "bg-sunken text-fg-muted" },
  inactividad: { etiqueta: "Inactividad", clase: "bg-amber-50 text-amber-700" },
  otro_dispositivo: {
    etiqueta: "Otro dispositivo",
    clase: "bg-violet-50 text-violet-700",
  },
  desconocida: { etiqueta: "Desconocida", clase: "bg-sunken text-fg-subtle" },
};

/** Un dato etiquetado dentro de la tarjeta de usuario. */
function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-2xs uppercase tracking-wide text-fg-subtle">
        {etiqueta}
      </dt>
      <dd className="truncate text-xs font-semibold text-fg">{valor}</dd>
    </div>
  );
}

/**
 * Histórico de actividad de todos los usuarios: última conexión y actividad
 * (presencia), y último inicio/cierre de sesión con su razón. Ordenado de más
 * reciente a más antiguo. Permite buscar por nombre o correo y filtrar por polla
 * en cliente sobre los datos ya cargados (el universo de usuarios es pequeño).
 */
export function HistorialActividad({ datos }: { datos: Datos }) {
  const [pollaId, setPollaId] = useState<string>("todas");
  const [busqueda, setBusqueda] = useState<string>("");

  const usuarios = useMemo(() => {
    const q = normalizar(busqueda);
    return datos.usuarios.filter((u) => {
      if (pollaId !== "todas" && !u.grupoIds.includes(pollaId)) return false;
      if (q && !normalizar(u.nombre).includes(q) && !normalizar(u.email).includes(q))
        return false;
      return true;
    });
  }, [datos.usuarios, pollaId, busqueda]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="t-h2 flex items-center gap-2">
          <History className="size-5 text-primary" /> Actividad por usuario
        </h2>
        <p className="t-body-sm mt-1 text-fg-muted">
          Conexión, actividad e inicio/cierre de sesión de cada usuario, de más
          reciente a más antiguo. Busca por nombre o correo, o filtra por polla.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          {/* Búsqueda: type="text" + inputMode="search" para teclado de búsqueda
              en mobile sin la "x" nativa de WebKit (usamos la nuestra). text-base
              (16px) evita el zoom involuntario de iOS; h-11 da tap target ≥44px. */}
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
              aria-hidden
            />
            <input
              type="text"
              inputMode="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o correo…"
              aria-label="Buscar usuario"
              className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-10 text-base text-fg-strong placeholder:text-fg-subtle transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-sunken hover:text-fg"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Native select: mejor UX en mobile (picker nativo) y tap target ≥44px;
              text-base evita el zoom involuntario de iOS (font-size ≥ 16px). */}
          <select
            value={pollaId}
            onChange={(e) => setPollaId(e.target.value)}
            aria-label="Filtrar por polla"
            className="h-11 min-w-0 max-w-full rounded-xl border border-border bg-surface px-3 text-base font-medium text-fg-strong sm:w-56"
          >
            <option value="todas">Todas las pollas</option>
            {datos.pollas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <span className="inline-flex items-center gap-2 rounded-pill bg-sunken px-3 py-1.5 text-sm font-semibold text-fg-muted">
          <Users className="size-4" /> {usuarios.length}{" "}
          {usuarios.length === 1 ? "usuario" : "usuarios"}
        </span>
      </div>

      {usuarios.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
          <Users className="size-7 text-fg-subtle" />
          <p className="t-body-sm font-semibold text-fg">Sin resultados</p>
          <p className="t-caption text-fg-muted">
            {busqueda
              ? `Ningún usuario coincide con «${busqueda}».`
              : pollaId === "todas"
                ? "Aún no hay usuarios registrados."
                : "Esta polla no tiene participantes activos."}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2.5">
          {usuarios.map((u) => {
            const Dispositivo = u.dispositivo === "movil" ? Smartphone : Monitor;
            const razon = u.razonCierre ? RAZON_UI[u.razonCierre] : null;
            return (
              <li
                key={u.usuarioId}
                className="space-y-3 overflow-hidden rounded-2xl border border-border bg-surface p-3.5"
              >
                <div className="flex items-center gap-3">
                  <AvatarNotion
                    nombre={u.nombre}
                    size="md"
                    tint={tintePorNombre(u.nombre)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-bold text-fg-strong">
                        {u.nombre}
                      </span>
                      {u.dispositivo && (
                        <Dispositivo
                          className="size-3.5 shrink-0 text-fg-subtle"
                          aria-hidden
                        />
                      )}
                    </p>
                    <p className="truncate text-xs text-fg-muted">{u.email}</p>
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3">
                  <Dato etiqueta="Última actividad" valor={formatear(u.ultimaActividad)} />
                  <Dato etiqueta="Última conexión" valor={formatear(u.ultimaConexion)} />
                  <Dato etiqueta="Inició sesión" valor={formatear(u.ultimoLogin)} />
                  <div className="min-w-0">
                    <dt className="text-2xs uppercase tracking-wide text-fg-subtle">
                      Cerró sesión
                    </dt>
                    <dd className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-fg">
                        {formatear(u.ultimoCierre)}
                      </span>
                      {razon && (
                        <span
                          className={cn(
                            "shrink-0 rounded-pill px-1.5 py-0.5 text-2xs font-semibold",
                            razon.clase,
                          )}
                        >
                          {razon.etiqueta}
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
