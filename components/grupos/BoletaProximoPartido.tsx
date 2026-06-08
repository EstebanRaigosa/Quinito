import { ArrowRight, Check, Clock } from "lucide-react";
import type { Equipo } from "@/lib/types/dominio";
import type { ProximoPartidoGrupo } from "@/lib/queries/proximo-por-grupo";
import { Flag } from "@/components/shared/Flag";
import { cuentaRegresivaCorta } from "@/lib/utils/fechas";

/** Sigla corta del equipo: ISO-3 o las 3 primeras letras del nombre. */
function sigla(equipo: Equipo | null): string {
  if (!equipo) return "—";
  return (equipo.codigo_iso ?? equipo.nombre.slice(0, 3)).toUpperCase();
}

/**
 * "Boleta" del próximo partido, embebida en la tarjeta del grupo. Metáfora de
 * entrada de estadio en esmeralda profunda (eco del hero): cuerpo con el
 * enfrentamiento y la cuenta regresiva, y un talón perforado (línea punteada
 * con muescas reales) con TU predicción.
 *
 * Es solo visual: la tarjeta completa enlaza al grupo, donde se predice. Por eso
 * "Predecir" no es un enlace anidado, sino una pista de acción.
 */
export function BoletaProximoPartido({
  proximo,
  ahora,
}: {
  proximo: ProximoPartidoGrupo;
  ahora: Date;
}) {
  const { partido, miPrediccion } = proximo;
  const cuenta = cuentaRegresivaCorta(partido.fecha_hora, ahora);

  return (
    <div className="relative mt-4 flex overflow-hidden rounded-xl bg-gradient-to-br from-[#06351C] via-[#0B3D24] to-[#15803D] text-[#ECFDF5] shadow-md ring-1 ring-white/10">
      {/* Halo dorado-verde en la esquina. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-mustard-300/20 blur-xl"
      />
      {/* Brillo diagonal que recorre la boleta. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />

      {/* Cuerpo: enfrentamiento + cuenta regresiva */}
      <div className="relative flex min-w-0 flex-1 flex-col justify-center gap-2 p-3">
        <span className="inline-flex items-center gap-1.5 text-2xs font-extrabold uppercase tracking-[0.16em] text-mustard-200">
          <span className="size-1.5 animate-live-pulse rounded-full bg-mustard-300" />
          Próximo partido
        </span>

        <div className="flex items-center gap-1.5">
          <Flag
            code={partido.equipo_local?.codigo_iso}
            size={24}
            round
            className="shadow-md ring-2 ring-white/25"
          />
          <span className="text-sm font-black tracking-tight">
            {sigla(partido.equipo_local)}
          </span>
          <span className="px-0.5 text-2xs font-bold text-white/55">vs</span>
          <span className="text-sm font-black tracking-tight">
            {sigla(partido.equipo_visitante)}
          </span>
          <Flag
            code={partido.equipo_visitante?.codigo_iso}
            size={24}
            round
            className="shadow-md ring-2 ring-white/25"
          />
        </div>

        {/* Cuenta regresiva (donde antes iba el código de barras). */}
        <span className="inline-flex items-center gap-1.5 text-2xs font-semibold text-white/70">
          <Clock className="size-3 shrink-0 text-mustard-200" />
          Empieza en{" "}
          <span className="font-black tabular-nums text-mustard-200">
            {cuenta}
          </span>
        </span>
      </div>

      {/* Talón perforado: TU predicción, a la derecha, pequeña y clara. */}
      <div className="relative flex w-[34%] shrink-0 flex-col items-center justify-center gap-0.5 border-l-2 border-dashed border-white/30 px-2 py-3 text-center">
        {/* Muescas reales de la perforación (mordidas en el papel). */}
        <span
          aria-hidden
          className="absolute -left-2 -top-2 size-4 rounded-full bg-[var(--bg-surface)]"
        />
        <span
          aria-hidden
          className="absolute -bottom-2 -left-2 size-4 rounded-full bg-[var(--bg-surface)]"
        />

        {miPrediccion ? (
          <>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/60">
              <Check className="size-3 text-mustard-300" /> Tu predicción
            </span>
            <span className="text-lg font-black tabular-nums leading-none tracking-tight text-mustard-200">
              {miPrediccion.goles_local}&nbsp;–&nbsp;{miPrediccion.goles_visitante}
            </span>
          </>
        ) : (
          <>
            <span className="text-[9px] font-bold uppercase leading-tight tracking-[0.08em] text-white/55">
              Aún sin predecir
            </span>
            <span className="mt-0.5 inline-flex animate-pop items-center gap-0.5 rounded-pill bg-gradient-to-b from-mustard-200 to-mustard-400 px-2 py-0.5 text-2xs font-black text-[#052E16] shadow-glow ring-1 ring-mustard-200/50 transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
              Predecir
              <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
