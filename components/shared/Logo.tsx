import { cn } from "@/lib/utils";

/**
 * Isotipo de Polla: un check que se eleva y lanza un balón ("acertá el
 * marcador"). SVG inline (nítido, escalable) sobre cuadro navy bento.
 * Geometría espejo de `marca/isotipo/isotipo-navy.svg`.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Polla"
    >
      <rect width="100" height="100" rx="22.5" fill="#0B1C30" />
      <polyline
        points="26 54 43 69 66 40"
        fill="none"
        stroke="#22C55E"
        strokeWidth="10.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="74.5" cy="30" r="12" fill="#22C55E" />
      <polygon
        points="74.5,25.2 79.07,28.52 77.32,33.88 71.68,33.88 69.93,28.52"
        fill="#0B1C30"
      />
      <g stroke="#0B1C30" strokeWidth="1.6" strokeLinecap="round">
        <line x1="74.5" y1="25.2" x2="74.5" y2="18" />
        <line x1="79.07" y1="28.52" x2="85.91" y2="26.29" />
        <line x1="77.32" y1="33.88" x2="81.55" y2="39.71" />
        <line x1="71.68" y1="33.88" x2="67.45" y2="39.71" />
        <line x1="69.93" y1="28.52" x2="63.09" y2="26.29" />
      </g>
    </svg>
  );
}

type Props = {
  size?: number;
  className?: string;
  /** Oculta el wordmark, deja solo la marca. */
  soloMarca?: boolean;
};

/** Logo completo: marca + wordmark "polla". */
export function Logo({ size = 18, className, soloMarca = false }: Props) {
  if (soloMarca) return <LogoMark size={size + 10} className={className} />;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size + 10} />
      <span
        className="font-black text-fg-strong"
        style={{ fontSize: size, letterSpacing: "-0.04em" }}
      >
        polla
      </span>
    </span>
  );
}
