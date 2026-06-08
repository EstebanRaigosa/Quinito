import { createElement } from "react";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { iconoPorNombre } from "@/lib/utils/icono-grupo";

const TAMANO_ICONO = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 34,
} as const;

/**
 * Avatar de una polla: cuadro tinteado (estilo Notion) con un icono temático
 * estable derivado del nombre (mismo nombre → mismo icono + color). Reemplaza a
 * las iniciales para que las pollas se vean más bonitas y reconocibles.
 */
export function AvatarGrupo({
  nombre,
  size = "md",
  className,
}: {
  nombre: string;
  size?: keyof typeof TAMANO_ICONO;
  className?: string;
}) {
  const icono = iconoPorNombre(nombre);
  return (
    <AvatarNotion nombre={nombre} size={size} className={className}>
      {createElement(icono, { size: TAMANO_ICONO[size], strokeWidth: 2.4 })}
    </AvatarNotion>
  );
}
