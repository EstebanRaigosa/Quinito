import { archivoBandera } from "@/lib/utils/banderas";

/**
 * Banderas reales (SVG) servidas localmente desde `public/flags/` — estilo
 * circular del repo `circle-flags`. Funciona offline (PWA). Se indexan por el
 * código ISO-3 del equipo (`Equipo.codigo_iso`), que se mapea al archivo ISO-2
 * en `lib/utils/banderas.ts` (fuente compartida con el ícono de notificaciones).
 */

type Props = {
  code: string | null | undefined;
  size?: number;
  /** Las banderas son circulares por defecto. `round={false}` las recorta a rectángulo. */
  round?: boolean;
  className?: string;
};

export function Flag({ code, size = 28, round = true, className }: Props) {
  const archivo = archivoBandera(code);
  const dims = round
    ? { width: size, height: size, borderRadius: "50%" }
    : { width: size, height: Math.round(size * 0.66), borderRadius: 3 };

  // Sin código o sin mapeo: placeholder neutro (mantiene el layout estable).
  if (!archivo) {
    return (
      <span
        className={className}
        title={code ?? undefined}
        style={{
          display: "inline-block",
          ...dims,
          background: "var(--bg-muted)",
          flexShrink: 0,
          border: "1px solid rgba(0,0,0,0.08)",
        }}
      />
    );
  }

  return (
    <img
      src={`/flags/${archivo}.svg`}
      alt=""
      title={code ?? undefined}
      width={dims.width}
      height={dims.height}
      className={className}
      loading="lazy"
      decoding="async"
      style={{
        display: "inline-block",
        ...dims,
        objectFit: "cover",
        flexShrink: 0,
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    />
  );
}
