import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ComprobanteBusqueda } from "@/lib/types/dominio";

/**
 * Busca un comprobante por su código. Lee del RPC `buscar_comprobante`
 * (SECURITY DEFINER), que solo devuelve la fila si quien consulta es admin de la
 * polla del comprobante o superadmin (CLAUDE.md §3.4). Devuelve `null` si no hay
 * coincidencia visible.
 *
 * `codigo` es el término ya confirmado por el usuario (al pulsar "Buscar"); el
 * hook se habilita solo cuando hay algo que buscar.
 */
export function useBuscarComprobante(codigo: string | null) {
  const termino = codigo?.trim() ?? "";
  return useQuery({
    queryKey: ["buscar-comprobante", termino.toUpperCase()],
    enabled: termino.length > 0,
    queryFn: async (): Promise<ComprobanteBusqueda | null> => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("buscar_comprobante", {
        p_codigo: termino,
      });
      if (error) throw error;
      const fila = data?.[0];
      if (!fila) return null;
      return {
        codigo: fila.codigo,
        monto: Number(fila.monto ?? 0),
        creado_en: fila.creado_en,
        metodo: fila.metodo,
        participante_nombre: fila.participante_nombre,
        grupo_id: fila.grupo_id,
        grupo_nombre: fila.grupo_nombre,
        valor_apuesta: Number(fila.valor_apuesta ?? 0),
        total_abonado: Number(fila.total_abonado ?? 0),
        pagado: !!fila.pagado,
      };
    },
    staleTime: 30_000,
  });
}
