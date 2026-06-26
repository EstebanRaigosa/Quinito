"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { registrarCierreSesion } from "@/lib/auth/eventos-sesion";

/**
 * Hook de cierre de sesión reutilizable (Sidebar, BottomNav, perfil…).
 * Cierra la sesión en Supabase y redirige a /login.
 */
export function useCerrarSesion() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function cerrarSesion() {
    if (saliendo) return;
    setSaliendo(true);
    const supabase = createClient();
    // Registra el cierre (razón "manual") ANTES de signOut, mientras hay sesión.
    await registrarCierreSesion("manual");
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("No se pudo cerrar la sesión. Intenta de nuevo.");
      setSaliendo(false);
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return { cerrarSesion, saliendo };
}
