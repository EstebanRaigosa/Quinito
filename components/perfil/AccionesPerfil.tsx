"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  Moon,
  UserPlus,
  Settings,
  LogOut,
  Loader2,
  ChevronRight,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { FormularioNombre } from "@/components/perfil/FormularioNombre";
import { BotonNotificaciones } from "@/components/notificaciones/BotonNotificaciones";
import { BotonCompartirCodigo } from "@/components/grupos/BotonCompartirCodigo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Grupo (mínimo) necesario para compartir su código de invitación. */
export type GrupoInvitable = {
  id: string;
  nombre: string;
  codigo: string;
};

/** Qué diálogo del menú está abierto. */
type DialogoAbierto = null | "notificaciones" | "invitar";

const OPCIONES: { Icono: LucideIcon; etiqueta: string; dialogo: DialogoAbierto }[] = [
  { Icono: Bell, etiqueta: "Notificaciones", dialogo: "notificaciones" },
  { Icono: UserPlus, etiqueta: "Invitar amigos", dialogo: "invitar" },
];

/** Opciones y cierre de sesión del perfil (parte interactiva). */
export function AccionesPerfil({
  nombre,
  grupos,
}: {
  nombre: string;
  grupos: GrupoInvitable[];
}) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [dialogo, setDialogo] = useState<DialogoAbierto>(null);

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
        {/* Nombre de usuario: editable (el que ven los demás en las pollas) */}
        <button
          type="button"
          onClick={() => setEditandoNombre(true)}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-sunken active:bg-sunken"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-fg-muted">
            <UserRound className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="t-body-sm block font-semibold text-fg-strong">
              Nombre de usuario
            </span>
            <span className="block truncate text-xs text-fg-muted">
              {nombre}
            </span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
        </button>

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

        {/* Accesos de ajustes con su diálogo */}
        {OPCIONES.map(({ Icono, etiqueta, dialogo: destino }) => (
          <button
            key={etiqueta}
            type="button"
            onClick={() => setDialogo(destino)}
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

        {/* Configuración: aún por construir */}
        <button
          type="button"
          onClick={() => toast("Pronto disponible")}
          className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-sunken active:bg-sunken"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-fg-muted">
            <Settings className="size-4" aria-hidden />
          </span>
          <span className="t-body-sm flex-1 font-semibold text-fg-strong">
            Configuración
          </span>
          <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden />
        </button>
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

      {/* Diálogo para editar el nombre visible */}
      <Dialog open={editandoNombre} onOpenChange={setEditandoNombre}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nombre de usuario</DialogTitle>
            <DialogDescription>
              Así te verán los demás en las pollas y las tablas de posiciones.
            </DialogDescription>
          </DialogHeader>
          <FormularioNombre
            nombreInicial={nombre}
            textoBoton="Guardar"
            onGuardado={() => {
              setEditandoNombre(false);
              router.refresh();
            }}
            onCancelar={() => setEditandoNombre(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Sección de Notificaciones: switch de recordatorios de cierre */}
      <Dialog
        open={dialogo === "notificaciones"}
        onOpenChange={(abierto) => setDialogo(abierto ? "notificaciones" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notificaciones</DialogTitle>
            <DialogDescription>
              Gestiona los avisos que te enviamos en este dispositivo.
            </DialogDescription>
          </DialogHeader>
          <BotonNotificaciones />
        </DialogContent>
      </Dialog>

      {/* Invitar amigos: compartir el código de cada polla */}
      <Dialog
        open={dialogo === "invitar"}
        onOpenChange={(abierto) => setDialogo(abierto ? "invitar" : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitar amigos</DialogTitle>
            <DialogDescription>
              Comparte el código de tu polla para que se unan.
            </DialogDescription>
          </DialogHeader>

          {grupos.length === 0 ? (
            <div className="space-y-3 py-2 text-center">
              <p className="t-body-sm text-fg-muted">
                Aún no tienes pollas. Crea una o únete con un código para poder
                invitar a tus amigos.
              </p>
              <Button asChild className="w-full" onClick={() => setDialogo(null)}>
                <Link href="/grupos/crear">Crear una polla</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {grupos.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="t-body-sm min-w-0 truncate font-semibold text-fg-strong">
                    {g.nombre}
                  </span>
                  <BotonCompartirCodigo
                    codigo={g.codigo}
                    nombreGrupo={g.nombre}
                    className="shrink-0"
                  />
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
