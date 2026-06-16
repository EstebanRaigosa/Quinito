import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-0.5 text-xs font-bold leading-tight transition-colors",
  {
    variants: {
      variant: {
        // Soft (fondo tinte + texto de color) — estilo DS
        primary: "bg-primary text-primary-foreground",
        secondary: "bg-muted text-fg-muted",
        neutral: "bg-muted text-fg-muted",
        outline: "border border-border text-fg-muted",
        success: "bg-success-soft text-success",
        info: "bg-info-soft text-info",
        warning: "bg-warning-soft text-warning",
        danger: "bg-destructive-soft text-destructive",
        accent: "bg-accent-soft text-accent",
        // Sólidas para momentos deportivos (en vivo, líder).
        live: "bg-destructive text-destructive-foreground shadow-xs",
        playing: "bg-info text-info-foreground shadow-xs",
        // "En juego": ámbar sólido con relieve (gradiente + sombra). Texto blanco
        // con sombra para legibilidad sobre el ámbar. El brillo que lo recorre se
        // arma en el sitio de uso (span con `animate-shine`).
        enjuego:
          "bg-gradient-to-b from-[#F59E0B] to-[#B45309] text-white shadow-sm [text-shadow:0_1px_1.5px_rgb(0_0_0_/_35%)]",
        // Puntaje de predicciones (esmeralda) y estado de pago "Parcial". El TIPO
        // de acierto se distingue con un icono dentro del badge, no con el color.
        gold: "bg-gradient-to-b from-mustard-300 to-primary text-primary-foreground shadow-xs",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Muestra un punto de color (currentColor) al inicio. */
  dot?: boolean;
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-current"
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
