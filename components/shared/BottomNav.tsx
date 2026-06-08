"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Search,
  Plus,
  User,
  LogOut,
  Loader2,
  ShieldCheck,
  ClipboardCheck,
  ListOrdered,
} from "lucide-react";
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
 * `esAdmin` añade el botón "Admin" que despliega Resultados y Clasificación.
 */
export function BottomNav({ esAdmin = false }: { esAdmin?: boolean }) {
  const pathname = usePathname();
  const { cerrarSesion, saliendo } = useCerrarSesion();
  const [adminAbierto, setAdminAbierto] = useState(false);

  const esActivo = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);
  const adminActivo = esActivo("/admin");

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
          {/* Admin (solo superusuario): despliega Resultados y Clasificación */}
          {esAdmin && (
            <li className="flex flex-1">
              <button
                type="button"
                onClick={() => setAdminAbierto((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={adminAbierto}
                aria-label="Administración"
                className={cn(
                  "group relative flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-2xs font-medium transition-colors duration-200",
                  adminActivo || adminAbierto
                    ? "text-primary"
                    : "text-muted-foreground hover:text-fg",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-16 items-center justify-center rounded-pill transition-all duration-200 ease-out",
                    adminActivo || adminAbierto
                      ? "bg-primary-soft"
                      : "bg-transparent group-hover:bg-muted",
                  )}
                >
                  <ShieldCheck
                    className={cn(
                      "size-6 transition-transform duration-200 ease-out",
                      (adminActivo || adminAbierto) && "scale-110",
                    )}
                    strokeWidth={adminActivo ? 2.5 : 2}
                  />
                </span>
                <span
                  className={cn((adminActivo || adminAbierto) && "font-semibold")}
                >
                  Admin
                </span>
              </button>
            </li>
          )}

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

        {/* Menú desplegable de Administración (sobre la barra) */}
        {esAdmin && adminAbierto && (
          <>
            {/* Backdrop para cerrar al tocar fuera */}
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setAdminAbierto(false)}
              className="fixed inset-0 z-[210] cursor-default"
            />
            <div
              role="menu"
              aria-label="Administración"
              className="absolute bottom-full left-1/2 z-[220] mb-3 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
            >
              <p className="border-b border-border px-3 py-2 text-2xs font-bold uppercase tracking-wide text-fg-subtle">
                Administración
              </p>
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setAdminAbierto(false)}
                aria-current={pathname === "/admin" ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-3 text-sm font-semibold transition-colors hover:bg-sunken",
                  pathname === "/admin" ? "text-primary" : "text-fg",
                )}
              >
                <ClipboardCheck className="size-[18px] text-primary" />
                Resultados
              </Link>
              <Link
                href="/admin/clasificacion"
                role="menuitem"
                onClick={() => setAdminAbierto(false)}
                aria-current={
                  pathname === "/admin/clasificacion" ? "page" : undefined
                }
                className={cn(
                  "flex items-center gap-2.5 px-3 py-3 text-sm font-semibold transition-colors hover:bg-sunken",
                  pathname === "/admin/clasificacion"
                    ? "text-primary"
                    : "text-fg",
                )}
              >
                <ListOrdered className="size-[18px] text-primary" />
                Clasificación
              </Link>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
