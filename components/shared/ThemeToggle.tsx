"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  type Preferencia,
  setPreferencia,
  subscribePreferencia,
  getPreferenciaSnapshot,
  getPreferenciaServerSnapshot,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPCIONES: { valor: Preferencia; etiqueta: string; Icono: typeof Sun }[] = [
  { valor: "light", etiqueta: "Claro", Icono: Sun },
  { valor: "dark", etiqueta: "Oscuro", Icono: Moon },
  { valor: "system", etiqueta: "Sistema", Icono: Monitor },
];

/** Segmented control de tema. Persiste la preferencia y respeta el sistema. */
export function ThemeToggle() {
  // useSyncExternalStore: lee la preferencia real en cliente sin setState-en-effect
  // y sin desajuste de hidratación (el servidor siempre rinde "system").
  const pref = useSyncExternalStore(
    subscribePreferencia,
    getPreferenciaSnapshot,
    getPreferenciaServerSnapshot,
  );

  return (
    <div
      role="radiogroup"
      aria-label="Tema de la aplicación"
      className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
    >
      {OPCIONES.map(({ valor, etiqueta, Icono }) => {
        const activo = pref === valor;
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={activo}
            onClick={() => setPreferencia(valor)}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1.5 rounded-md text-sm font-semibold transition-all duration-200",
              activo
                ? "bg-card text-fg-strong shadow-sm"
                : "text-fg-muted hover:text-fg-strong",
            )}
          >
            <Icono className="size-4" />
            {etiqueta}
          </button>
        );
      })}
    </div>
  );
}
