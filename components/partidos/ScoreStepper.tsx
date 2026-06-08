"use client";

import { cn } from "@/lib/utils";

/**
 * Selector de goles (DS "Spring Turf"): caja de marcador con borde verde. El
 * número se ingresa tecleando (0–99). Controlado; `value` es null mientras no
 * se predice.
 *
 * A11y: el input numérico tiene label (`aria-label`) y anuncia el valor; tap
 * target ≥ 44px (CLAUDE.md §3.3).
 */
type Props = {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  big?: boolean;
  ariaLabel: string;
};

export function ScoreStepper({ value, onChange, disabled, big, ariaLabel }: Props) {
  const sz = big ? 80 : 68;

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    // Solo dígitos, máximo 2 (0–99). Vacío → null (sin predicción).
    const limpio = e.target.value.replace(/\D/g, "").slice(0, 2);
    if (limpio === "") {
      onChange(null);
      return;
    }
    onChange(Math.min(99, parseInt(limpio, 10)));
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      disabled={disabled}
      value={value ?? ""}
      onChange={onInput}
      onFocus={(e) => {
        e.currentTarget.select();
        // En táctil (iOS), el teclado flota y tapa el campo + el botón
        // "Guardar". Esperamos a que anime y centramos el campo (§4.1).
        if (window.matchMedia("(pointer: coarse)").matches) {
          const el = e.currentTarget;
          setTimeout(
            () => el.scrollIntoView({ block: "center", behavior: "smooth" }),
            300,
          );
        }
      }}
      placeholder="–"
      aria-label={`Goles de ${ariaLabel}`}
      className={cn(
        "rounded-2xl border-2 bg-surface text-center font-extrabold tabular-nums text-fg-strong shadow-xs",
        "border-primary/60",
        "placeholder:font-bold placeholder:text-fg-subtle",
        "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:border-border disabled:bg-muted disabled:text-fg-muted disabled:shadow-none",
      )}
      style={{
        width: sz,
        height: sz,
        fontSize: big ? 40 : 34,
        letterSpacing: "-0.04em",
        padding: 0,
      }}
    />
  );
}
