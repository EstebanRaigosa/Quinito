import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { BottomNav } from "@/components/shared/BottomNav";
import { Sidebar } from "@/components/shared/Sidebar";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { createClient } from "@/lib/supabase/server";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import type { Perfil } from "@/lib/types/dominio";
import { getMisGrupos } from "@/lib/queries/grupos";

/**
 * Shell autenticado responsive: sidebar en desktop (≥ md), top bar + bottom nav
 * en móvil. El middleware (`middleware.ts`) ya protege estas rutas; aquí además
 * obtenemos el usuario real de Supabase (defensa en profundidad) y lo pasamos al
 * shell.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("tblProfiles")
    .select("nombre_completo, email, avatar_url")
    .eq("id", user.id)
    .single();

  const usuario: Perfil = {
    id: user.id,
    nombre_completo: perfil?.nombre_completo ?? user.email ?? "Usuario",
    email: perfil?.email ?? user.email ?? "",
    avatar_url: perfil?.avatar_url ?? null,
  };
  const grupos = await getMisGrupos();
  const superAdmin = esSuperAdmin(user.email);

  return (
    <div className="flex min-h-dvh bg-app">
      <Sidebar usuario={usuario} grupos={grupos} esAdmin={superAdmin} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar móvil */}
        <header className="sticky top-0 z-[200] border-b border-border bg-surface/95 pt-safe backdrop-blur md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/dashboard" aria-label="Inicio">
              <Logo size={18} />
            </Link>
            <div className="flex items-center gap-1">
              {superAdmin && (
                <Link
                  href="/admin"
                  aria-label="Registrar resultados (admin)"
                  className="grid size-9 place-items-center rounded-full text-fg-muted transition-colors hover:bg-sunken hover:text-primary"
                >
                  <ShieldCheck className="size-5" />
                </Link>
              )}
              <Link href="/perfil" aria-label="Mi perfil">
                <AvatarNotion
                  nombre={usuario.nombre_completo}
                  size="sm"
                  tint="clay"
                />
              </Link>
            </div>
          </div>
        </header>

        {/* El padding inferior (solo móvil) reserva el espacio del BottomNav fijo
            para que el contenido nunca quede tapado, incluida la safe-area iOS. */}
        <main className="flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>

        <div className="md:hidden">
          <BottomNav esAdmin={superAdmin} />
        </div>
      </div>
    </div>
  );
}
