"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/** Una notificación tal como la ve el usuario en su bandeja (campanita). */
export type NotificacionBandeja = {
  id: string;
  titulo: string;
  cuerpo: string;
  url: string | null;
  imagen_url: string | null;
  accion_label: string | null;
  creada_en: string;
  leida_en: string | null;
};

/** Bandeja del usuario actual (RPC `mis_notificaciones`, ya filtrado por auth.uid()). */
export function useMisNotificaciones() {
  return useQuery({
    queryKey: ["mis-notificaciones"],
    queryFn: async (): Promise<NotificacionBandeja[]> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("mis_notificaciones", {
        p_limite: 30,
      });
      if (error) throw error;
      return (data ?? []) as unknown as NotificacionBandeja[];
    },
    staleTime: 60_000,
  });
}

/** Marca como leídas todas las notificaciones del usuario (al abrir la bandeja). */
export function useMarcarLeidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase.rpc("marcar_notificaciones_leidas", {});
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mis-notificaciones"] }),
  });
}
