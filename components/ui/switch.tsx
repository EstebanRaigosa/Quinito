"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = {
  /** Estado controlado del switch. */
  checked: boolean;
  /** Se invoca con el nuevo valor al alternar. */
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

/**
 * Switch accesible (toggle on/off) sin dependencias extra (CLAUDE.md §2).
 *
 * Implementado como `<button role="switch">` para máxima compatibilidad en
 * WebKit/iOS y Android. Tamaño tipo iOS nativo (51×31) → tap target cómodo.
 */
export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "pointer-events-none block size-[27px] rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
