"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toaster global (notificaciones). Estilizado con tokens de marca vía variables CSS.
 * Errores de red/Supabase → toast.error en español (CLAUDE.md §4.6).
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="top-center"
      // En móvil, separa los toasts del notch/Dynamic Island (§3 safe-area).
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-md border border-border bg-popover text-popover-foreground shadow-lg",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          error: "border-destructive/40",
          success: "border-success/40",
        },
      }}
      {...props}
    />
  );
}
