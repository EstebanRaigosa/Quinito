import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Partido } from "@/lib/types/dominio";
import { ETIQUETA_FASE } from "@/lib/types/dominio";
import { Flag } from "@/components/shared/Flag";
import {
  cuentaRegresivaCorta,
  formatearFechaHoraBogota,
  formatearHoraBogota,
} from "@/lib/utils/fechas";

type Props = {
  partido: Partido;
  href: string;
  ahora: Date;
  /** Marcador ya predicho por el usuario para este partido (si existe). */
  miPrediccion?: { goles_local: number; goles_visitante: number } | null;
  /** Minutos antes del kickoff en que cierra la apuesta (de las reglas). */
  minutosCierre?: number;
};

/**
 * Hero del próximo partido: superficie verde profunda con contador, banderas,
 * tu predicción (si la hiciste) y CTA. Responsive: en móvil apila banderas y
 * nombres; en desktop los alinea con el marcador/predicción al centro.
 */
export function ProximoPartido({
  partido,
  href,
  ahora,
  miPrediccion,
  minutosCierre = 0,
}: Props) {
  const titulo =
    partido.fase === "fase_grupos" && partido.grupo
      ? `Fase de grupos · Grupo ${partido.grupo}`
      : ETIQUETA_FASE[partido.fase];
  const subtitulo = [partido.estadio, partido.ciudad]
    .filter(Boolean)
    .join(" · ");
  const cierre = new Date(
    new Date(partido.fecha_hora).getTime() - minutosCierre * 60_000,
  );
  const yaPredicho = !!miPrediccion;

  return (
    <Link
      href={href}
      className="group relative block animate-fade-up overflow-hidden rounded-2xl bg-gradient-to-br from-[#052E16] via-[#0B3D24] to-[#15803D] p-5 text-[#ECFDF5] shadow-lg ring-1 ring-white/10 transition-transform duration-300 ease-out hover:-translate-y-0.5 md:p-7"
    >
      {/* Halo dorado de profundidad. */}
      <span
        className="pointer-events-none absolute -right-16 -top-20 size-60 rounded-full bg-mustard-400/[0.18] blur-md"
        aria-hidden
      />
      {/* Brillo diagonal. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shine bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />

      {/* Cabecera: rótulo + contexto · contador */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/10 px-2.5 py-1 text-2xs font-extrabold uppercase tracking-[0.14em] text-mustard-200">
            <span className="size-1.5 animate-live-pulse rounded-full bg-mustard-300" />
            Próximo partido
          </span>
          <h2 className="mt-3 text-balance text-xl font-extrabold leading-tight tracking-tight md:text-2xl">
            {titulo}
          </h2>
          {subtitulo && (
            <p className="mt-1.5 text-xs text-white/75 md:text-sm">{subtitulo}</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-2xs font-bold uppercase tracking-[0.16em] text-white/70">
            Empieza en
          </div>
          <div className="mt-1 text-2xl font-extrabold tabular-nums tracking-tight md:text-3xl">
            {cuentaRegresivaCorta(partido.fecha_hora, ahora)}
          </div>
        </div>
      </div>

      {/* Enfrentamiento */}
      <div className="relative mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-2 md:mt-7 md:gap-4">
        {/* Local */}
        <div className="flex flex-col items-center gap-2 md:flex-row md:gap-3">
          <Flag
            code={partido.equipo_local?.codigo_iso}
            size={52}
            round
            className="shadow-md ring-2 ring-white/20 transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-center text-base font-extrabold tracking-tight md:text-left md:text-lg">
            {partido.equipo_local?.nombre}
          </span>
        </div>

        {/* Centro: predicción o VS + datos */}
        <div className="flex flex-col items-center gap-1.5">
          {yaPredicho ? (
            <>
              <span className="inline-flex items-center gap-2 rounded-pill bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
                <span className="hidden text-white/70 sm:inline">
                  Tu predicción
                </span>
                <span className="text-sm font-black tabular-nums">
                  {miPrediccion!.goles_local}&nbsp;—&nbsp;
                  {miPrediccion!.goles_visitante}
                </span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/55">
                Editable hasta {formatearHoraBogota(cierre)}
              </span>
            </>
          ) : (
            <>
              <span className="grid size-11 place-items-center rounded-full border border-white/15 bg-white/5 text-sm font-black tracking-tight text-mustard-200 backdrop-blur">
                VS
              </span>
              <span className="text-2xs font-semibold text-white/75">
                {formatearFechaHoraBogota(partido.fecha_hora)}
              </span>
            </>
          )}
        </div>

        {/* Visitante */}
        <div className="flex flex-col items-center gap-2 md:flex-row-reverse md:gap-3">
          <Flag
            code={partido.equipo_visitante?.codigo_iso}
            size={52}
            round
            className="shadow-md ring-2 ring-white/20 transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-center text-base font-extrabold tracking-tight md:text-right md:text-lg">
            {partido.equipo_visitante?.nombre}
          </span>
        </div>
      </div>

      {/* CTA */}
      <span className="relative mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-mustard-300 to-primary px-4 py-2.5 text-center text-sm font-bold text-primary-foreground shadow-glow transition-transform duration-200 group-hover:scale-[1.01] group-active:scale-[0.99]">
        {yaPredicho ? "Editar mi predicción" : "Hacer mi predicción"}
        <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
