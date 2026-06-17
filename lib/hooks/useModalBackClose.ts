"use client";

import { useEffect } from "react";
import { empujarModal, quitarModal } from "@/lib/utils/modal-historial";

/**
 * Hace que el botón/gesto "atrás" cierre la modal en vez de navegar a la página
 * anterior. Se usa DENTRO del contenido de la modal (que solo se monta mientras
 * está abierta), así el alta/baja del historial coincide con abrir/cerrar.
 *
 * `cerrar` debe disparar el cierre de ESTA modal (p. ej. un click en su botón X),
 * y debe ser estable (envolver en useCallback) para no re-registrar en cada render.
 */
export function useModalBackClose(cerrar: () => void) {
  useEffect(() => {
    const entrada = empujarModal(cerrar);
    return () => quitarModal(entrada);
    // Alta solo al montar / baja al desmontar: la modal vive mientras está abierta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
