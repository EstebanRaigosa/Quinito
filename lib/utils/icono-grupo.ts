import {
  Trophy,
  Medal,
  Award,
  Crown,
  Star,
  Flame,
  Zap,
  Target,
  Rocket,
  Sparkles,
  Shield,
  Gem,
  Swords,
  Goal,
  Ticket,
  type LucideIcon,
} from "lucide-react";

/** Set temático (deporte / competencia) para los avatares de pollas. */
const ICONOS: LucideIcon[] = [
  Trophy,
  Medal,
  Award,
  Crown,
  Star,
  Flame,
  Zap,
  Target,
  Rocket,
  Sparkles,
  Shield,
  Gem,
  Swords,
  Goal,
  Ticket,
];

/** Icono estable derivado de un string (mismo nombre → mismo icono). */
export function iconoPorNombre(nombre: string): LucideIcon {
  const n = nombre.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ICONOS[n % ICONOS.length]!;
}
