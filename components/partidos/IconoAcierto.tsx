import { Target, Crown, Check, type LucideIcon } from "lucide-react";
import type { NivelAcierto } from "@/lib/utils/prediccion";
import { cn } from "@/lib/utils";

/**
 * Icono que identifica el tipo de acierto dentro del badge de puntaje. El color
 * del badge es siempre esmeralda; el icono es lo que distingue cada tipo:
 * - `exacto`  → diana (clavaste el marcador completo).
 * - `unico`   → corona (fuiste el único en clavarlo).
 * - `parcial` → check (acertaste ganador y/o goles).
 * `ninguno` (sin puntos) no muestra icono.
 */
const ICONOS: Record<Exclude<NivelAcierto, "ninguno">, LucideIcon> = {
  exacto: Target,
  unico: Crown,
  parcial: Check,
};

export function IconoAcierto({
  nivel,
  className,
}: {
  nivel: NivelAcierto;
  className?: string;
}) {
  if (nivel === "ninguno") return null;
  const Icono = ICONOS[nivel];
  return <Icono aria-hidden className={cn("size-3", className)} />;
}
