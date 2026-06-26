import { Trophy } from "lucide-react";
import type { Partido } from "@/lib/types/dominio";
import { ETIQUETA_FASE } from "@/lib/types/dominio";

/**
 * Etiqueta de fase de un partido. Diferencia visualmente los partidos
 * eliminatorios (de dieciseisavos en adelante) de los de fase de grupos: los
 * eliminatorios se muestran como una píldora con color de acento + icono de
 * trofeo; los de grupos quedan como texto liso (estilo `className`).
 */
export function EtiquetaFase({
  partido,
  className,
}: {
  partido: Pick<Partido, "fase" | "grupo">;
  /** Clases del texto para la variante de fase de grupos (texto liso). */
  className?: string;
}) {
  // "16vos en adelante" = cualquier fase distinta a la de grupos (incluye
  // tercer lugar y final).
  const esEliminatoria = partido.fase !== "fase_grupos";

  const etiqueta =
    partido.fase === "fase_grupos" && partido.grupo
      ? `Grupo ${partido.grupo}`
      : ETIQUETA_FASE[partido.fase];

  if (esEliminatoria) {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-accent-soft px-2 py-0.5 text-2xs font-bold uppercase tracking-wide text-accent">
        <Trophy className="size-3 shrink-0" aria-hidden />
        {etiqueta}
      </span>
    );
  }

  return <span className={className}>{etiqueta}</span>;
}
