import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { BottomNav } from "@/components/shared/BottomNav";
import { Sidebar } from "@/components/shared/Sidebar";
import { LatidoPresencia } from "@/components/shared/LatidoPresencia";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import { BotonInstalarPWA } from "@/components/shared/BotonInstalarPWA";
import { CampanaNotificaciones } from "@/components/notificaciones/CampanaNotificaciones";
import { PromptNotificaciones } from "@/components/notificaciones/PromptNotificaciones";
import { OnboardingNombre } from "@/components/perfil/OnboardingNombre";
import { esSuperAdmin } from "@/lib/auth/superadmin";
import type { Perfil } from "@/lib/types/dominio";
import { getMisGrupos } from "@/lib/queries/grupos";
import { getPerfilActual, getUsuarioActual } from "@/lib/auth/usuario-actual";

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
  const user = await getUsuarioActual();
  if (!user) redirect("/login");

  // Cacheado por request: lo comparten layout y página (una sola consulta).
  const perfil = await getPerfilActual();

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
      {/* Latido de presencia (cada usuario actualiza solo su propia fila). */}
      <LatidoPresencia usuarioId={user.id} />

      <Sidebar usuario={usuario} grupos={grupos} esAdmin={superAdmin} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar móvil */}
        <header className="sticky top-0 z-[200] border-b border-border bg-surface/95 pt-safe backdrop-blur md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/dashboard" aria-label="Inicio">
              <Logo size={18} />
            </Link>
            <div className="flex items-center gap-1">
              {/* Instalar PWA: solo aparece si el navegador es elegible y no está instalada */}
              <BotonInstalarPWA variant="icon" />
              <CampanaNotificaciones />
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

      {/* Onboarding: pide configurar el nombre visible en el primer ingreso
          (tras registrarse o entrar con Google) hasta que se confirme. */}
      {!perfil?.nombre_confirmado ? (
        <OnboardingNombre nombreInicial={usuario.nombre_completo} />
      ) : (
        /* Una vez confirmado el nombre, invitamos a activar las notificaciones
            push al abrir la PWA (no se apila con el onboarding de nombre). */
        <PromptNotificaciones />
      )}
    </div>
  );
}
