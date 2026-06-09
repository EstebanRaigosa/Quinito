"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { FormularioNombre } from "@/components/perfil/FormularioNombre";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Modal de bienvenida que aparece una sola vez tras registrarse o entrar con
 * Google (mientras `nombre_confirmado` sea false). Pide confirmar el nombre
 * visible —prellenado con el actual— y avisa que se puede cambiar luego desde
 * Perfil. Se monta en el shell `(app)` solo cuando falta confirmar.
 */
export function OnboardingNombre({ nombreInicial }: { nombreInicial: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(true);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      {/* Sin botón de cerrar ni cierre por click-fuera/escape: es un paso de
          onboarding. Igual reaparece en el próximo ingreso hasta que se guarde. */}
      <DialogContent
        className="[&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <span className="mb-1 grid size-12 place-items-center rounded-full bg-primary-soft text-primary">
            <PartyPopper className="size-6" aria-hidden />
          </span>
          <DialogTitle>¡Te damos la bienvenida!</DialogTitle>
          <DialogDescription>
            Ingresa tu nombre de usuario: así te verán los demás en las pollas y
            las tablas de posiciones. Podrás cambiarlo cuando quieras desde las
            opciones de Perfil.
          </DialogDescription>
        </DialogHeader>

        <FormularioNombre
          nombreInicial={nombreInicial}
          textoBoton="Continuar"
          onGuardado={() => {
            setAbierto(false);
            // Refresca para tomar el `nombre_confirmado = true` ya persistido y
            // que el modal no se vuelva a montar.
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
