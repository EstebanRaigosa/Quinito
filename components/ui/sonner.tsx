"use client";

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toaster global (notificaciones). Cada tipo tiene fondo, borde e ícono propios
 * para diferenciar de un vistazo éxito / error / advertencia / info
 * (CLAUDE.md §4.6, §3.6 contraste WCAG AA).
 *
 * DECISIÓN: el toast usa SIEMPRE la paleta del tema CLARO (fondos pastel sólidos
 * + texto oscuro), también en modo oscuro. Por eso los colores van hardcodeados
 * (hex del tema claro) en vez de tokens `var(--*)`, que cambiarían con el tema y
 * dejaban el fondo translúcido/oscuro. El resultado es idéntico en claro y
 * oscuro, que es lo buscado. `theme="light"` fija además los estilos internos
 * de sonner. (Sin `color-mix`: no existe en Safari/iOS 15, §3.3.)
 */
export function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="top-center"
      // En móvil, separa los toasts del notch/Dynamic Island (§3 safe-area).
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      icons={{
        success: <CheckCircle2 className="size-5 text-[#16A34A]" />,
        error: <XCircle className="size-5 text-[#E11D48]" />,
        warning: <AlertTriangle className="size-5 text-[#D97706]" />,
        info: <Info className="size-5 text-[#2563EB]" />,
        loading: <Loader2 className="size-5 animate-spin text-[#475569]" />,
      }}
      toastOptions={{
        classNames: {
          // Base: toast neutro (default / loading). Blanco + texto oscuro, fijo.
          // Los tipos coloreados sobreescriben fondo y borde con `!`.
          toast:
            "group flex items-center gap-3 rounded-md border border-[#EEF2F7] bg-white text-[#0B1C30] shadow-lg",
          title: "text-sm font-medium",
          description: "text-sm text-[#475569]",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-muted text-muted-foreground",
          icon: "shrink-0",
          // Paleta del tema claro hardcodeada: fondo pastel sólido + borde de
          // color + texto oscuro. Idéntico en claro y oscuro.
          success: "!bg-[#D1FAE5] !border-[#16A34A]/50 !text-[#0B1C30]",
          error: "!bg-[#FFE4E6] !border-[#E11D48]/50 !text-[#0B1C30]",
          warning: "!bg-[#FEF3C7] !border-[#D97706]/50 !text-[#0B1C30]",
          info: "!bg-[#DBEAFE] !border-[#2563EB]/50 !text-[#0B1C30]",
        },
      }}
      {...props}
    />
  );
}
