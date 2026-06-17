"use client";

import { Info } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Pill ⓘ que abre un popover con un texto de ayuda al tocar/hacer clic. Usa
 * Popover (no hover) porque es fiable en móvil —incluido iOS, donde el hover no
 * existe y el foco al tocar es inconsistente— y el contenido va en un portal,
 * así que nunca se recorta ni se sale de la pantalla.
 */
export function PildoraInfo({
  texto,
  etiqueta = "Más información",
}: {
  texto: string;
  etiqueta?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={etiqueta}
          className="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-sunken text-fg-subtle transition-colors hover:bg-primary/15 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
        >
          <Info className="size-3" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 leading-snug text-fg-muted">
        {texto}
      </PopoverContent>
    </Popover>
  );
}
