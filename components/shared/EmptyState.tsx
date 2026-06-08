import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icono: LucideIcon;
  titulo: string;
  descripcion?: string;
  children?: React.ReactNode;
  className?: string;
};

/** Estado vacío reutilizable (no dejar pantallas en blanco — CLAUDE.md §10). */
export function EmptyState({
  icono: Icono,
  titulo,
  descripcion,
  children,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-strong bg-sunken/40 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="grid size-16 animate-pop place-items-center rounded-2xl bg-gradient-to-br from-primary-soft to-sage-100 text-primary shadow-xs">
        <Icono className="size-7" />
      </span>
      <div className="space-y-1.5">
        <h3 className="t-h4 text-fg-strong">{titulo}</h3>
        {descripcion && (
          <p className="mx-auto max-w-xs text-fg-muted t-body-sm">
            {descripcion}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
