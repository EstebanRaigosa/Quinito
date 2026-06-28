import { PageContainer } from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Estado de carga de la auditoría de una polla. Aparece de inmediato al elegir la
 * polla en el selector, mientras `getAuditoriaGrupo` (RPC que arma el historial
 * completo) y `getTodasLasPollas` resuelven. Sin esto la navegación quedaba
 * "colgada" sin feedback en pollas con muchos movimientos.
 *
 * Solo CSS (`animate-pulse`), sin sticky ni unidades de viewport problemáticas →
 * seguro en iOS Safari.
 */
export default function AuditoriaPollaLoading() {
  return (
    <PageContainer ancho="ancho" className="space-y-5">
      {/* Migaja "Todas las pollas" */}
      <Skeleton className="h-3 w-32" />

      {/* Cabecera de sección (título + subtítulo + meta) */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Tarjeta de filtros */}
      <div className="surface-card space-y-3 rounded-2xl p-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-11 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-24 rounded-full" />
          <Skeleton className="h-11 w-40 rounded-full" />
        </div>
      </div>

      {/* Lista de expedientes */}
      <div className="space-y-2.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    </PageContainer>
  );
}
