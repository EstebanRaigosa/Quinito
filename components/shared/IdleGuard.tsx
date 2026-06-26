"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { limpiarUltimaActividad, useIdleTimeout } from "@/lib/hooks/useIdleTimeout";

/**
 * Activa la recarga por inactividad solo cuando hay sesión. **No cierra la
 * sesión**: tras el umbral de inactividad el hook recarga la página para
 * refrescar los datos (ver `useIdleTimeout`).
 *
 * No existe AuthProvider global, así que aquí escuchamos el estado de auth de
 * Supabase: el contador de inactividad solo corre con sesión (no tiene sentido
 * en `/login`). Al cerrar sesión manualmente se limpia el contador para no
 * arrastrar un timestamp viejo a la siguiente sesión.
 *
 * Se monta una sola vez dentro de `Providers`. No renderiza UI.
 */
export function IdleGuard() {
  const [tieneSesion, setTieneSesion] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let activo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (activo) setTieneSesion(!!data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((evento, session) => {
      setTieneSesion(!!session);
      // Importante: NO reiniciar el contador en SIGNED_IN. Ese evento también se
      // dispara al revalidar la sesión (foco/refresh de token en iOS); si lo
      // usáramos como "actividad", al volver del segundo plano se reiniciaría el
      // contador y nunca recargaría por inactividad. El hook ya siembra la marca
      // si falta tras un login limpio (SIGNED_OUT borró la clave).
      if (evento === "SIGNED_OUT") limpiarUltimaActividad();
    });

    return () => {
      activo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useIdleTimeout({ habilitado: tieneSesion });

  return null;
}
