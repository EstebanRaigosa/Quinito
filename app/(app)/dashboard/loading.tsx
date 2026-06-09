import { PageContainer } from "@/components/shared/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Estado de carga del dashboard. Se muestra al instante mientras el Server
 * Component resuelve sus queries (perfil, grupos, predicciones), evitando que la
 * navegación quede "congelada" en la pantalla anterior.
 *
 * Solo CSS (`animate-pulse`), sin sticky ni unidades de viewport problemáticas →
 * seguro en iOS Safari.
 */
export default function DashboardLoading() {
  return (
    <PageContainer ancho="ancho" className="space-y-6 md:space-y-8">
      {/* Saludo */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[5.5rem] rounded-2xl" />
        <Skeleton className="h-[5.5rem] rounded-2xl" />
      </div>

      {/* Mis pollas */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="space-y-4 rounded-3xl border border-border bg-surface p-5"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-20 rounded-2xl" />
              <Skeleton className="h-11 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
