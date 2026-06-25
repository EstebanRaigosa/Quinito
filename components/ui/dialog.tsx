"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useViewportModal } from "@/lib/hooks/useViewportModal";
import { useModalBackClose } from "@/lib/hooks/useModalBackClose";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[400] bg-clay-900/70 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * Registra el cierre-con-"atrás" SOLO mientras el diálogo está abierto. Va DENTRO
 * de `DialogPrimitive.Content`, que Radix monta/desmonta con su estado `open`
 * (vía `Presence`), de modo que el alta/baja del historial coincide con
 * abrir/cerrar. Si el hook se llamara en el wrapper `DialogContent` (que SÍ está
 * siempre en el árbol cuando el diálogo es controlado), empujaría una entrada de
 * historial al montar la página —no al abrir— y el "atrás" dejaría de cerrar la
 * modal. Ver `useModalBackClose`.
 */
function CierreConAtras({ cerrar }: { cerrar: () => void }) {
  useModalBackClose(cerrar);
  return null;
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, style, ...props }, ref) => {
  // Reposiciona el modal sobre el área visible cuando el teclado virtual está
  // abierto. Ver useViewportModal / COMPATIBILIDAD-MOVIL §4.1.
  const estiloViewport = useViewportModal();
  // "Atrás" (Android/swipe iOS) cierra el diálogo en vez de navegar. Cerramos
  // haciendo click en el botón X de ESTE diálogo (sirve controlado o no).
  const cerrarRef = React.useRef<HTMLButtonElement>(null);
  const cerrar = React.useCallback(() => cerrarRef.current?.click(), []);
  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      style={{ ...estiloViewport, ...style }}
      className={cn(
        "fixed left-1/2 top-1/2 z-[400] grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto scroll-touch rounded-2xl border border-border bg-card p-5 shadow-xl",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    >
      <CierreConAtras cerrar={cerrar} />
      {children}
      <DialogPrimitive.Close
        ref={cerrarRef}
        className="absolute right-2 top-2 grid size-11 place-items-center rounded-md text-muted-foreground opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-5" />
        <span className="sr-only">Cerrar</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1 pr-8 text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
