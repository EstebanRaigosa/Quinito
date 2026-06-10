import { cn } from "@/lib/utils";

/** Contenedor de página: columna estrecha en móvil, más ancha en desktop. */
export function PageContainer({
  children,
  className,
  ancho = "normal",
}: {
  children: React.ReactNode;
  className?: string;
  ancho?: "normal" | "estrecho" | "ancho";
}) {
  const max = {
    estrecho: "md:max-w-xl",
    normal: "md:max-w-3xl",
    ancho: "md:max-w-5xl",
  }[ancho];
  return (
    <div
      className={cn(
        // Padding lateral ≥16px que respeta el notch en Safari landscape
        // (no standalone). En desktop manda md:px-9.
        "mx-auto w-full max-w-md py-5 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-9 md:py-8",
        max,
        className,
      )}
    >
      {children}
    </div>
  );
}
