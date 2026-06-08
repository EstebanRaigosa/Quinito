import Image from "next/image";
import { cn } from "@/lib/utils";
import estadio from "@/public/images/estadio.png";

/**
 * Banner hero de auth en mobile: foto del estadio a sangre con degradados
 * navy (arriba y abajo) para que el saludo en blanco se lea y empalme con la
 * hoja blanca del formulario.
 */
export function IlustracionFutbolHero({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      <Image
        src={estadio}
        alt="Estadio de fútbol lleno visto desde la grada, con las luces encendidas"
        fill
        sizes="100vw"
        className="object-cover object-center"
        placeholder="blur"
        priority
      />
      {/* Oscurecido base para contraste del texto */}
      <div className="absolute inset-0 bg-clay-900/45" />
      {/* Refuerzo arriba (saludo) y abajo (empalme con la hoja) */}
      <div className="absolute inset-0 bg-gradient-to-b from-clay-900/70 via-clay-900/20 to-clay-900/80" />
    </div>
  );
}
