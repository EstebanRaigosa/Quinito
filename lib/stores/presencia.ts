import { create } from "zustand";

/**
 * Detalle de presencia: sub-sección de cliente que la URL no refleja (las
 * pestañas del detalle de una polla cambian con estado de Radix, no con la
 * ruta). La pestaña activa publica aquí un texto legible (ej. "Mundialeros ·
 * Tabla de posiciones") y `LatidoPresencia` lo lee para el panel de admin.
 *
 * Efímero (sin persistir): es estado de UI puramente vivo. `null` cuando el
 * usuario no está en una sección con sub-navegación de cliente.
 */
type PresenciaStore = {
  detalle: string | null;
  setDetalle: (detalle: string | null) => void;
};

export const usePresencia = create<PresenciaStore>((set) => ({
  detalle: null,
  setDetalle: (detalle) => set({ detalle }),
}));
