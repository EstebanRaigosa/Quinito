"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, User, Plus, ShieldCheck, ListOrdered, Trophy, Radio, ScrollText, LogOut, Loader2 } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { CampanaNotificaciones } from "@/components/notificaciones/CampanaNotificaciones";
import { AvatarGrupo } from "@/components/grupos/AvatarGrupo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCerrarSesion } from "@/lib/auth/use-cerrar-sesion";
import type { Grupo, Perfil } from "@/lib/types/dominio";

const NAV = [
  { href: "/dashboard", etiqueta: "Inicio", Icono: Home },
  { href: "/grupos/buscar", etiqueta: "Buscar polla", Icono: Search },
  { href: "/perfil", etiqueta: "Perfil", Icono: User },
];

/** Sidebar del shell desktop (≥ md). Oculto en móvil (usa BottomNav). */
export function Sidebar({
  usuario,
  grupos,
  esAdmin = false,
}: {
  usuario: Perfil;
  grupos: Grupo[];
  esAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { cerrarSesion, saliendo } = useCerrarSesion();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface p-4 md:flex">
      <div className="flex items-center justify-between px-2 pb-4">
        <Link href="/dashboard" aria-label="Inicio">
          <Logo size={20} />
        </Link>
        <CampanaNotificaciones />
      </div>

      <Button asChild className="mb-4 w-full">
        <Link href="/grupos/crear">
          <Plus className="size-4" /> Crear polla
        </Link>
      </Button>

      {/* Zona scrolleable: navegación + lista de pollas */}
      <div className="-mr-2 mt-1 flex-1 overflow-y-auto pr-2">
        <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, etiqueta, Icono }) => {
          const activo = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                activo
                  ? "bg-primary-soft text-primary"
                  : "text-fg-muted hover:bg-sunken",
              )}
            >
              <Icono className={cn("size-[18px]", activo && "text-primary")} strokeWidth={activo ? 2.5 : 2} />
              {etiqueta}
            </Link>
          );
        })}

        {esAdmin && (
          <Link
            href="/admin"
            aria-current={pathname === "/admin" ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              pathname === "/admin"
                ? "bg-primary-soft text-primary"
                : "text-fg-muted hover:bg-sunken",
            )}
          >
            <ShieldCheck
              className={cn("size-[18px]", pathname === "/admin" && "text-primary")}
              strokeWidth={pathname === "/admin" ? 2.5 : 2}
            />
            Resultados
          </Link>
        )}

        {esAdmin && (
          <Link
            href="/admin/clasificacion"
            aria-current={pathname === "/admin/clasificacion" ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              pathname === "/admin/clasificacion"
                ? "bg-primary-soft text-primary"
                : "text-fg-muted hover:bg-sunken",
            )}
          >
            <ListOrdered
              className={cn(
                "size-[18px]",
                pathname === "/admin/clasificacion" && "text-primary",
              )}
              strokeWidth={pathname === "/admin/clasificacion" ? 2.5 : 2}
            />
            Clasificación
          </Link>
        )}

        {esAdmin && (
          <Link
            href="/admin/pollas"
            aria-current={pathname === "/admin/pollas" ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              pathname === "/admin/pollas"
                ? "bg-primary-soft text-primary"
                : "text-fg-muted hover:bg-sunken",
            )}
          >
            <Trophy
              className={cn("size-[18px]", pathname === "/admin/pollas" && "text-primary")}
              strokeWidth={pathname === "/admin/pollas" ? 2.5 : 2}
            />
            Pollas
          </Link>
        )}

        {esAdmin && (
          <Link
            href="/admin/conectados"
            aria-current={pathname === "/admin/conectados" ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              pathname === "/admin/conectados"
                ? "bg-primary-soft text-primary"
                : "text-fg-muted hover:bg-sunken",
            )}
          >
            <Radio
              className={cn("size-[18px]", pathname === "/admin/conectados" && "text-primary")}
              strokeWidth={pathname === "/admin/conectados" ? 2.5 : 2}
            />
            Conectados
          </Link>
        )}

        {esAdmin && (
          <Link
            href="/admin/auditoria"
            aria-current={pathname.startsWith("/admin/auditoria") ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
              pathname.startsWith("/admin/auditoria")
                ? "bg-primary-soft text-primary"
                : "text-fg-muted hover:bg-sunken",
            )}
          >
            <ScrollText
              className={cn(
                "size-[18px]",
                pathname.startsWith("/admin/auditoria") && "text-primary",
              )}
              strokeWidth={pathname.startsWith("/admin/auditoria") ? 2.5 : 2}
            />
            Auditoría
          </Link>
        )}
      </nav>

      {grupos.length > 0 && (
        <div className="mt-6 px-2">
          <p className="overline mb-2">Mis pollas</p>
          <div className="flex flex-col gap-0.5">
            {grupos.map((g) => {
              const activo = pathname === `/grupos/${g.id}`;
              return (
                <Link
                  key={g.id}
                  href={`/grupos/${g.id}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    activo ? "bg-sunken" : "hover:bg-sunken/60",
                  )}
                >
                  <AvatarGrupo nombre={g.nombre} size="xs" />
                  <span className="flex-1 truncate font-medium text-fg">
                    {g.nombre}
                  </span>
                  <span className="text-xs text-fg-subtle">
                    {g.total_participantes}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
      </div>

      {/* Fijo abajo: usuario + cerrar sesión (siempre visibles) */}
      <div className="mt-2 space-y-1 border-t border-border pt-3">
        <Link
          href="/perfil"
          className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-sunken"
        >
          <AvatarNotion nombre={usuario.nombre_completo} size="sm" tint="clay" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-fg-strong">
              {usuario.nombre_completo}
            </div>
            <div className="truncate text-xs text-fg-muted">{usuario.email}</div>
          </div>
        </Link>

        <button
          type="button"
          onClick={cerrarSesion}
          disabled={saliendo}
          className="group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-semibold text-fg-muted transition-colors hover:bg-destructive-soft hover:text-destructive disabled:opacity-60"
        >
          {saliendo ? (
            <Loader2 className="size-[18px] animate-spin" />
          ) : (
            <LogOut className="size-[18px] transition-transform group-hover:-translate-x-0.5" />
          )}
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
