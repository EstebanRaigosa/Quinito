"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { desbanearParticipante } from "@/app/(app)/grupos/[id]/actions";
import { Button } from "@/components/ui/button";
import { AvatarNotion } from "@/components/shared/AvatarNotion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type Baneado = {
  usuario_id: string;
  nombre_completo: string | null;
  email: string | null;
  avatar_url: string | null;
  baneado_en: string;
};

/**
 * Panel del admin para ver y revertir baneos del grupo. La lista se carga de
 * forma diferida (solo al abrir el diálogo) vía el RPC `listar_baneados`, que
 * exige ser admin. Desbanear permite al usuario volver a unirse con el código.
 */
export function PanelBaneados({ grupoId }: { grupoId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [baneados, setBaneados] = useState<Baneado[]>([]);
  const [procesando, startTransition] = useTransition();

  async function cargar() {
    setCargando(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("listar_baneados", {
      p_grupo_id: grupoId,
    });
    if (error) {
      toast.error("No se pudo cargar la lista de baneados.");
      setBaneados([]);
    } else {
      setBaneados((data ?? []) as Baneado[]);
    }
    setCargando(false);
  }

  function onOpenChange(v: boolean) {
    setAbierto(v);
    if (v) void cargar();
  }

  function desbanear(usuarioId: string, nombre: string) {
    startTransition(async () => {
      const res = await desbanearParticipante(grupoId, usuarioId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${nombre} fue desbaneado`);
      setBaneados((prev) => prev.filter((b) => b.usuario_id !== usuarioId));
      router.refresh();
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onOpenChange(true)}
      >
        <Ban className="size-4" />
        Baneados
      </Button>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Usuarios baneados</DialogTitle>
          <DialogDescription>
            Al desbanear, la persona podrá volver a unirse con el código.
          </DialogDescription>
        </DialogHeader>

        {cargando ? (
          <p className="t-body-sm py-6 text-center text-fg-muted">Cargando…</p>
        ) : baneados.length === 0 ? (
          <p className="t-body-sm py-6 text-center text-fg-muted">
            No hay nadie baneado en esta polla.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {baneados.map((b) => {
              const nombre = b.nombre_completo ?? "Usuario";
              return (
                <div
                  key={b.usuario_id}
                  className="surface-card flex items-center gap-3 rounded-xl p-3"
                >
                  <AvatarNotion nombre={nombre} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="t-body-sm truncate font-bold text-fg-strong">
                      {nombre}
                    </p>
                    {b.email && (
                      <p className="t-caption truncate text-fg-muted">
                        {b.email}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={procesando}
                    onClick={() => desbanear(b.usuario_id, nombre)}
                  >
                    <RotateCcw className="size-4" />
                    Desbanear
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
