import Image from "next/image";
import { cn } from "@/lib/utils";
import estadio from "@/public/images/estadio.png";

/**
 * Panel lateral de auth (desktop): foto del estadio desde la grada con un
 * degradado navy encima para legibilidad y un toque de marca.
 */
export function IlustracionFutbol({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <Image
        src={estadio}
        alt="Estadio de fútbol lleno visto desde la grada, con las luces encendidas"
        fill
        sizes="(min-width: 768px) 50vw, 100vw"
        className="object-cover"
        placeholder="blur"
        priority
      />
      {/* Degradado de marca para profundidad y contraste */}
      <div className="absolute inset-0 bg-gradient-to-t from-clay-900/90 via-clay-900/30 to-clay-900/10" />
    </div>
  );
}
