import { cn } from "@/lib/utils";
import { iniciales } from "@/lib/utils/texto";

/**
 * Avatar cuadrado con tinte (estilo Notion) — la opción "personal" del DS.
 * Muestra una inicial o un emoji sobre un fondo tinteado de la paleta.
 */
export type Tint =
  | "mustard"
  | "sage"
  | "clay"
  | "rust"
  | "slate"
  | "bronze"
  | "moss"
  | "sand";

const TINT: Record<Tint, { bg: string; fg: string }> = {
  mustard: { bg: "#D1FAE5", fg: "#166534" }, /* emerald soft */
  sage: { bg: "#CCFBF1", fg: "#0F766E" },    /* teal soft */
  clay: { bg: "#E2E8F0", fg: "#334155" },    /* slate/ink soft */
  rust: { bg: "#FFE4E6", fg: "#BE123C" },    /* rose soft */
  slate: { bg: "#DBEAFE", fg: "#2563EB" },   /* blue soft */
  bronze: { bg: "#FEF3C7", fg: "#B45309" },  /* amber soft */
  moss: { bg: "#D1FAE5", fg: "#15803D" },    /* green soft */
  sand: { bg: "#E2E8F0", fg: "#475569" },    /* slate soft */
};

const TINTS = Object.keys(TINT) as Tint[];

/** Tinte estable derivado de un string (mismo nombre → mismo color). */
export function tintePorNombre(nombre: string): Tint {
  const n = nombre
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  return TINTS[n % TINTS.length]!;
}

const SIZES = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
} as const;

type Props = {
  nombre?: string;
  /** Emoji o contenido custom; si se omite, usa iniciales de `nombre`. */
  children?: React.ReactNode;
  tint?: Tint;
  size?: keyof typeof SIZES;
  className?: string;
};

export function AvatarNotion({
  nombre = "",
  children,
  tint,
  size = "md",
  className,
}: Props) {
  const t = TINT[tint ?? tintePorNombre(nombre)];
  const px = SIZES[size];
  const contenido = children ?? iniciales(nombre);
  return (
    <span
      className={cn("inline-flex items-center justify-center font-bold", className)}
      style={{
        width: px,
        height: px,
        borderRadius: px >= 48 ? 10 : px >= 32 ? 8 : 6,
        background: t.bg,
        color: t.fg,
        fontSize: px * 0.4,
        flexShrink: 0,
        lineHeight: 1,
      }}
      aria-hidden
    >
      {contenido}
    </span>
  );
}
