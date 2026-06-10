import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { DatosGrupoInput } from "@/lib/schemas/grupo";
import { reglasDefault, type ReglasInput } from "@/lib/schemas/reglas";

/**
 * Estado del wizard de creación de grupo (solo cliente).
 * Zustand se usa exclusivamente para el wizard — NO para auth ni datos de
 * servidor (esos van por TanStack Query). Ver PLAN §3 Fase 3.
 *
 * **Persistido** en localStorage (UI-state efímero, NO sensible → seguro de
 * persistir, COMPATIBILIDAD-STACK §7): así un borrador a medio llenar sobrevive
 * si iOS mata la PWA en segundo plano. `skipHydration` evita mismatch SSR; la
 * página del wizard hace `rehydrate()` al montar y limpia el borrador al salir.
 */
type WizardState = {
  paso: 1 | 2 | 3;
  datos: DatosGrupoInput;
  reglas: ReglasInput;
  /** Ids de partidos seleccionados (por defecto todos). */
  partidosSeleccionados: Set<string>;
  setPaso: (paso: 1 | 2 | 3) => void;
  siguiente: () => void;
  anterior: () => void;
  setDatos: (datos: DatosGrupoInput) => void;
  setReglas: (reglas: ReglasInput) => void;
  inicializarPartidos: (ids: string[]) => void;
  togglePartido: (id: string) => void;
  toggleFase: (ids: string[], seleccionar: boolean) => void;
  reset: () => void;
};

const estadoInicial = {
  paso: 1 as const,
  datos: { nombre: "", descripcion: "" },
  reglas: reglasDefault,
  partidosSeleccionados: new Set<string>(),
};

export const useWizardGrupo = create<WizardState>()(
  persist(
    (set) => ({
      ...estadoInicial,
      setPaso: (paso) => set({ paso }),
      siguiente: () =>
        set((s) => ({ paso: Math.min(3, s.paso + 1) as 1 | 2 | 3 })),
      anterior: () =>
        set((s) => ({ paso: Math.max(1, s.paso - 1) as 1 | 2 | 3 })),
      setDatos: (datos) => set({ datos }),
      setReglas: (reglas) => set({ reglas }),
      inicializarPartidos: (ids) =>
        set((s) =>
          // Solo inicializa si está vacío (no pisar la selección del usuario).
          s.partidosSeleccionados.size === 0
            ? { partidosSeleccionados: new Set(ids) }
            : s,
        ),
      togglePartido: (id) =>
        set((s) => {
          const next = new Set(s.partidosSeleccionados);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { partidosSeleccionados: next };
        }),
      toggleFase: (ids, seleccionar) =>
        set((s) => {
          const next = new Set(s.partidosSeleccionados);
          for (const id of ids) {
            if (seleccionar) next.add(id);
            else next.delete(id);
          }
          return { partidosSeleccionados: next };
        }),
      reset: () =>
        set({ ...estadoInicial, partidosSeleccionados: new Set() }),
    }),
    {
      name: "polla-wizard-grupo",
      version: 1,
      skipHydration: true,
      // Solo el borrador (las funciones no se serializan).
      partialize: (s) => ({
        paso: s.paso,
        datos: s.datos,
        reglas: s.reglas,
        partidosSeleccionados: s.partidosSeleccionados,
      }),
      // `Set` no es JSON-serializable: lo convertimos a/desde array.
      storage: createJSONStorage(() => localStorage, {
        replacer: (_key, value) =>
          value instanceof Set ? { __set: Array.from(value) } : value,
        reviver: (_key, value) => {
          if (
            value &&
            typeof value === "object" &&
            Array.isArray((value as { __set?: unknown }).__set)
          ) {
            return new Set((value as { __set: unknown[] }).__set);
          }
          return value;
        },
      }),
    },
  ),
);
