"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Plus, User, LogOut, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCerrarSesion } from "@/lib/auth/use-cerrar-sesion";

type ItemNav = {
  href: string;
  etiqueta: string;
  Icono: typeof Home;
};

// Ítems normales a los lados; "Crear" va como botón central destacado.
const IZQUIERDA: ItemNav[] = [
  { href: "/dashboard", etiqueta: "Inicio", Icono: Home },
  { href: "/grupos/buscar", etiqueta: "Buscar", Icono: Search },
];
const DERECHA: ItemNav[] = [{ href: "/perfil", etiqueta: "Perfil", Icono: User }];
const CREAR = { href: "/grupos/crear", etiqueta: "Crear", Icono: Plus };

/**
 * Navegación inferior (mobile-first) con safe-area inferior para iOS.
 * La administración (solo super-admin) vive en la top bar → /admin/panel.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { cerrarSesion, saliendo } = useCerrarSesion();

  const esActivo = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const renderItem = ({ href, etiqueta, Icono }: ItemNav) => {
    const activo = esActivo(href);
    return (
      <li key={href} className="flex flex-1">
        <Link
          href={href}
          aria-label={etiqueta}
          aria-current={activo ? "page" : undefined}
          className={cn(
            "group relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors duration-200",
            activo ? "text-primary" : "text-muted-foreground hover:text-fg",
          )}
        >
          {/* Píldora indicadora detrás del icono (estilo Material 3) */}
          <span
            className={cn(
              "flex h-8 w-16 items-center justify-center rounded-pill transition-all duration-200 ease-out",
              activo
                ? "bg-primary-soft"
                : "bg-transparent group-hover:bg-muted",
            )}
          >
            <Icono
              className={cn(
                "size-6 transition-transform duration-200 ease-out",
                activo && "scale-110",
              )}
              strokeWidth={activo ? 2.5 : 2}
            />
          </span>
          <span className={cn(activo && "font-semibold")}>{etiqueta}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[200] border-t border-border bg-card pb-safe">
      <div className="relative mx-auto flex max-w-md items-stretch">
        <ul className="flex flex-1 items-stretch justify-around">
          {IZQUIERDA.map(renderItem)}
        </ul>

        {/* Hueco reservado para el botón central */}
        <div className="w-16 shrink-0" aria-hidden />

        <ul className="flex flex-1 items-stretch justify-around">
          {DERECHA.map(renderItem)}

          <li className="flex flex-1">
            <button
              type="button"
              onClick={cerrarSesion}
              disabled={saliendo}
              aria-label="Cerrar sesión"
              className="group flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-2xs font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-60"
            >
              <span className="flex h-8 w-16 items-center justify-center rounded-pill transition-colors group-hover:bg-destructive-soft">
                {saliendo ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <LogOut className="size-6" strokeWidth={2} />
                )}
              </span>
              Salir
            </button>
          </li>
        </ul>

        {/* Botón "Crear" centrado horizontalmente */}
        <Link
          href={CREAR.href}
          aria-label={CREAR.etiqueta}
          className="group absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-5 flex-col items-center gap-0.5"
        >
          <span className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition-all duration-200 ease-out group-hover:-translate-y-0.5 group-hover:bg-primary-hover group-hover:shadow-glow-lg group-active:scale-90">
            <CREAR.Icono className="size-6 transition-transform duration-200 group-active:rotate-90" strokeWidth={2.5} />
          </span>
          <span className="text-2xs font-medium text-muted-foreground">
            {CREAR.etiqueta}
          </span>
        </Link>
      </div>
    </nav>
  );
}
