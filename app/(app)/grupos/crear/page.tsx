"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { useWizardGrupo } from "@/lib/stores/wizard-grupo";
import { PasoDatos } from "@/components/grupos/wizard/PasoDatos";
import { PasoReglas } from "@/components/grupos/wizard/PasoReglas";
import { PasoPartidos } from "@/components/grupos/wizard/PasoPartidos";
import { PageContainer } from "@/components/shared/PageContainer";
import { cn } from "@/lib/utils";

const PASOS = ["Datos", "Reglas", "Partidos"] as const;

const TITULOS = [
  {
    titulo: "Empecemos con lo básico",
    sub: "Ponle nombre a tu grupo y describe de qué se trata.",
  },
  {
    titulo: "Reglas de puntuación",
    sub: "Define cuántos puntos otorga cada acierto. Puedes editarlas después.",
  },
  {
    titulo: "Selecciona los partidos",
    sub: "Por defecto incluimos todos. Desmarca los que no quieras.",
  },
] as const;

/**
 * Stepper de 3 pasos. Completado = verde con check, activo = navy relleno,
 * futuro = neutro. Las líneas que unen pasos completados van en verde.
 */
function StepIndicator({ paso }: { paso: number }) {
  return (
    <ol
      aria-label="Progreso de creación del grupo"
      className="flex items-center justify-center"
    >
      {PASOS.map((label, i) => {
        const n = i + 1;
        const hecho = n < paso;
        const activo = n === paso;
        return (
          <li
            key={label}
            className={cn("flex items-center", i < PASOS.length - 1 && "flex-1")}
            aria-current={activo ? "step" : undefined}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold transition-colors",
                  hecho && "bg-primary text-primary-foreground",
                  activo &&
                    "bg-secondary text-secondary-foreground ring-4 ring-primary-soft",
                  !hecho && !activo && "bg-muted text-fg-muted",
                )}
              >
                {hecho ? <Check className="size-3.5" strokeWidth={3} /> : n}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-sm font-bold transition-colors",
                  activo || hecho ? "text-fg-strong" : "text-fg-muted",
                )}
              >
                {label}
              </span>
            </div>
            {i < PASOS.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "mx-2 h-0.5 flex-1 rounded-pill transition-colors sm:mx-3",
                  hecho ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export default function CrearGrupoPage() {
  const router = useRouter();
  const { paso, reset } = useWizardGrupo();

  useEffect(() => {
    reset();
    return () => reset();
  }, [reset]);

  const { titulo, sub } = TITULOS[paso - 1];

  return (
    <PageContainer ancho="normal">
      <div className="mb-6">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="size-4" />
          Volver al dashboard
        </button>
      </div>

      <div className="mb-7">
        <StepIndicator paso={paso} />
      </div>

      <div className="mb-7 text-center">
        <h1 className="t-h1">{titulo}</h1>
        <p className="t-body-sm mx-auto mt-1.5 max-w-md text-fg-muted">{sub}</p>
      </div>

      {paso === 1 && <PasoDatos />}
      {paso === 2 && <PasoReglas />}
      {paso === 3 && <PasoPartidos />}
    </PageContainer>
  );
}
