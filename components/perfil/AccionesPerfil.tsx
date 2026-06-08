"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Moon,
  UserPlus,
  Settings,
  LogOut,
  Loader2,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

const OPCIONES: { Icono: LucideIcon; etiqueta: string }[] = [
  { Icono: Bell, etiqueta: "Notificaciones" },
  { Icono: UserPlus, etiqueta: "Invitar amigos" },
  { Icono: Settings, etiqueta: "Configuración" },
];

/** Opciones y cierre de sesión del perfil (parte interactiva). */
export function AccionesPerfil() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function cerrarSesion() {
    setSaliendo(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("No se pudo cerrar la sesión. Intenta de nuevo.");
      setSaliendo(false);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <Card className="divide-y divide-border overflow-hidden">
        {/* Apariencia: tema claro / oscuro / sistema (segmented control) */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-fg-muted">
              <Moon className="size-4" aria-hidden />
            </span>
            <span className="t-body-sm font-semibold text-fg-strong">
              Apariencia
            </span>
          </span>
          <div className="sm:max-w-[260px] sm:flex-1">
            <ThemeToggle />
          </div>
        </div>

        {/* Accesos de ajustes */}
        {OPCIONES.map(({ Icono, etiqueta }) => (
          <button
            key={etiqueta}
            type="button"
            onClick={() => toast("Pronto disponible")}
            className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-sunken active:bg-sunken"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-fg-muted">
              <Icono className="size-4" aria-hidden />
            </span>
            <span className="t-body-sm flex-1 font-semibold text-fg-strong">
              {etiqueta}
            </span>
            <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
          </button>
        ))}
      </Card>

      <Button
        variant="outline"
        className="w-full text-destructive"
        onClick={cerrarSesion}
        disabled={saliendo}
      >
        {saliendo ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <LogOut className="size-4" />
        )}
        Cerrar sesión
      </Button>
    </div>
  );
}
