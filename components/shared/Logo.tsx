import { cn } from "@/lib/utils";

/** Marca "P" verde esmeralda sobre cuadro navy (Polla Design System · Spring Turf). */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center", className)}
      style={{
        width: size,
        height: size,
        borderRadius: 9,
        background: "var(--clay-900, #0B1C30)",
        color: "#22C55E",
        fontWeight: 900,
        fontSize: size * 0.55,
        letterSpacing: "-0.04em",
        flexShrink: 0,
      }}
      aria-hidden
    >
      P
    </span>
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
