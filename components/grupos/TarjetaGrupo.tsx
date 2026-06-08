import Link from "next/link";
import { Crown, ChevronRight } from "lucide-react";
import type { EstadoGrupo } from "@/lib/types/dominio";
import type { GrupoConResumen } from "@/lib/queries/grupos";
import type { ProximoPartidoGrupo } from "@/lib/queries/proximo-por-grupo";
import { Badge } from "@/components/ui/badge";
import { AvatarGrupo } from "@/components/grupos/AvatarGrupo";
import { BoletaProximoPartido } from "@/components/grupos/BoletaProximoPartido";
import { cn } from "@/lib/utils";

const ESTADO_META: Record<
  EstadoGrupo,
  { etiqueta: string; variant: "success" | "info" | "neutral" }
> = {
  activo: { etiqueta: "Activo", variant: "success" },
  proximo: { etiqueta: "Próximo", variant: "info" },
  finalizado: { etiqueta: "Finalizado", variant: "neutral" },
};

export function TarjetaGrupo({
  grupo,
  index = 0,
  proximo,
  ahora,
}: {
  grupo: GrupoConResumen;
  index?: number;
  /** Próximo partido predecible de esta polla (boleta). */
  proximo?: ProximoPartidoGrupo | null;
  /** Momento de referencia para la cuenta regresiva (servidor). */
  ahora: Date;
}) {
  const estado = ESTADO_META[grupo.estado];
  const primero = grupo.mi_posicion === 1;

  return (
    <Link
      href={`/grupos/${grupo.id}`}
      style={{ animationDelay: `${Math.min(index, 6) * 70}ms` }}
      className="group relative block animate-fade-up overflow-hidden rounded-3xl border border-mustard-400/50 bg-surface p-5 shadow-md transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lg"
    >

      {/* Cabecera */}
      <div className="flex items-center gap-3">
        <AvatarGrupo
          nombre={grupo.nombre}
          size="lg"
          className="ring-2 ring-app transition-transform duration-300 group-hover:scale-105"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="t-h4 truncate">{grupo.nombre}</h3>
            {primero && (
              <Crown
                className="size-3.5 shrink-0 text-mustard-500"
                aria-label="Vas de líder"
              />
            )}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <p className="t-caption truncate">{grupo.torneo.nombre}</p>
            <Badge variant={estado.variant} dot={grupo.estado === "activo"}>
              {estado.etiqueta}
            </Badge>
          </div>
        </div>
        <ChevronRight
          className="size-5 shrink-0 text-fg-subtle transition-transform duration-200 group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>

      {/* Standing — posición / puntos / aciertos, en panel con divisores verticales */}
      <div className="mt-4 grid grid-cols-3 divide-x divide-[var(--border-strong)] rounded-2xl bg-sunken px-2 py-3.5">
        <div className="px-2 text-center">
          <p className="text-sm font-bold text-fg-default">Posición</p>
          <p className="mt-1.5 flex items-baseline justify-center gap-0.5">
            <span
              className={cn(
                "text-2xl font-black tracking-tight",
                primero ? "text-gradient-gold" : "text-fg-strong",
              )}
            >
              #{grupo.mi_posicion ?? "—"}
            </span>
            <span className="t-caption font-bold">
              /{grupo.total_participantes}
            </span>
          </p>
        </div>
        <div className="px-2 text-center">
          <p className="text-sm font-bold text-fg-default">Puntos</p>
          <p className="mt-1.5 text-2xl font-black tracking-tight text-fg-strong">
            {grupo.mis_puntos}
          </p>
        </div>
        <div className="px-2 text-center">
          <p className="text-sm font-bold text-fg-default">Aciertos</p>
          <p className="mt-1.5 text-2xl font-black tracking-tight text-fg-strong">
            {grupo.mis_aciertos}
          </p>
        </div>
      </div>

      {/* Boleta del próximo partido (o estado vacío si no hay nada por predecir) */}
      {proximo ? (
        <BoletaProximoPartido proximo={proximo} ahora={ahora} />
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-border px-3 py-2.5 text-center text-2xs font-semibold text-fg-subtle">
          Sin partidos por predecir por ahora
        </div>
      )}
    </Link>
  );
}
