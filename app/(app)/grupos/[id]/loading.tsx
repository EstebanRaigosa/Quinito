import { PageContainer } from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Estado de carga del detalle de una polla. Aparece de inmediato al tocar la
 * tarjeta en el dashboard, mientras `getGrupoDetalle` resuelve sus queries
 * (membresía, reglas, participantes, tabla, partidos, predicciones).
 *
 * Solo CSS (`animate-pulse`), sin sticky ni unidades de viewport problemáticas →
 * seguro en iOS Safari.
 */
export default function GrupoDetalleLoading() {
  return (
    <PageContainer ancho="ancho">
      {/* Migaja de navegación */}
      <Skeleton className="mb-3 h-3 w-48" />

      {/* Cabecera del grupo (bento) */}
      <div className="mb-5 rounded-2xl border border-strong bg-elevated p-4 shadow-md sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          <Skeleton className="size-16 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </div>

      {/* Pestañas */}
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* Lista de contenido (partidos / tabla) */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </PageContainer>
  );
}
