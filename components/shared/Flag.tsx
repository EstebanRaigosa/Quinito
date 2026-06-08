/**
 * Banderas reales (SVG) servidas localmente desde `public/flags/` — estilo
 * circular del repo `circle-flags`. Funciona offline (PWA). Se indexan por el
 * código ISO-3 del equipo (`Equipo.codigo_iso`), que se mapea al archivo ISO-2.
 *
 * Para agregar una bandera nueva: descarga el SVG circular a `public/flags/<iso2>.svg`
 * y añade la entrada al mapa `ISO3_A_ARCHIVO`.
 */

/** ISO-3 del dominio → nombre de archivo en `public/flags/` (ISO-2 o variante gb-*). */
const ISO3_A_ARCHIVO: Record<string, string> = {
  MEX: "mx", RSA: "za", KOR: "kr", CZE: "cz",
  CAN: "ca", BIH: "ba", QAT: "qa", SUI: "ch",
  BRA: "br", MAR: "ma", HAI: "ht", SCO: "gb-sct",
  USA: "us", PAR: "py", AUS: "au", TUR: "tr",
  GER: "de", CUW: "cw", CIV: "ci", ECU: "ec",
  NED: "nl", JPN: "jp", SWE: "se", TUN: "tn",
  BEL: "be", EGY: "eg", IRN: "ir", NZL: "nz",
  ESP: "es", CPV: "cv", KSA: "sa", URU: "uy",
  FRA: "fr", SEN: "sn", IRQ: "iq", NOR: "no",
  ARG: "ar", ALG: "dz", AUT: "at", JOR: "jo",
  POR: "pt", COD: "cd", UZB: "uz", COL: "co",
  ENG: "gb-eng", CRO: "hr", GHA: "gh", PAN: "pa",
  // Alias: el mock usa SUI; por si llega CHE desde otra fuente.
  CHE: "ch",
};

type Props = {
  code: string | null | undefined;
  size?: number;
  /** Las banderas son circulares por defecto. `round={false}` las recorta a rectángulo. */
  round?: boolean;
  className?: string;
};

export function Flag({ code, size = 28, round = true, className }: Props) {
  const archivo = code ? ISO3_A_ARCHIVO[code] : undefined;
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
