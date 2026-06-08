import { cn } from "@/lib/utils";

/**
 * Encabezado de sección uniforme: título (.t-h2) + meta/acción opcional a la
 * derecha. Centraliza el patrón para que todas las secciones respiren igual.
 * `sub` puede ir bajo el título (móvil) o como meta a la derecha vía `meta`.
 */
type Props = {
  titulo: string;
  /** Texto pequeño bajo el título (contexto, conteo). */
  sub?: string;
  /** Meta corta alineada a la derecha (contador "3 activos"). */
  meta?: React.ReactNode;
  /** Acción interactiva alineada a la derecha (botones). Tiene prioridad. */
  accion?: React.ReactNode;
  className?: string;
};

export function SectionHeader({
  titulo,
  sub,
  meta,
  accion,
  className,
}: Props) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="t-h2 truncate">{titulo}</h2>
        {sub && <p className="t-caption mt-0.5 truncate">{sub}</p>}
      </div>
      {accion ? (
        <div className="shrink-0">{accion}</div>
      ) : meta ? (
        <span className="t-caption shrink-0 font-semibold text-fg-subtle">
          {meta}
        </span>
      ) : null}
    </div>
  );
}
