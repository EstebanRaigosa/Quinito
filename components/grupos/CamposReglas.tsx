"use client";

import { useWatch, type Control } from "react-hook-form";
import { Check } from "lucide-react";
import type { ReglasInput } from "@/lib/schemas/reglas";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/ui/form";

type CampoKey = keyof ReglasInput;

/**
 * Campo numérico editable directamente con el teclado (sin botones − / +).
 * `field` de RHF es la fuente de verdad. `ancho` permite usarlo full-width
 * (premios). El valor siempre se muestra; solo queda vacío mientras el usuario
 * borra para reescribir.
 */
function CampoNumero({
  control,
  name,
  sufijo,
  ancho = "w-[7.5rem]",
}: {
  control: Control<ReglasInput>;
  name: CampoKey;
  sufijo?: string;
  ancho?: string;
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        // Mostramos el valor salvo cuando está vacío/NaN (mientras se reescribe).
        const valor =
          field.value === undefined ||
          field.value === null ||
          Number.isNaN(field.value)
            ? ""
            : String(field.value);
        return (
          <div
            className={cn(
              "flex shrink-0 items-center overflow-hidden rounded-lg border bg-surface transition-colors focus-within:ring-2 focus-within:ring-ring",
              fieldState.error ? "border-destructive" : "border-input",
              ancho,
            )}
          >
            {/* type="text" + inputmode + pattern: teclado numérico iOS sin
                spinners ni validación de locale (§9). font-size ≥16px evita
                el zoom involuntario de Safari iOS. */}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              aria-label={`Valor de ${name}`}
              value={valor}
              onChange={(e) => {
                const limpio = e.target.value.replace(/[^0-9]/g, "");
                field.onChange(limpio === "" ? NaN : Number(limpio));
              }}
              onBlur={field.onBlur}
              name={field.name}
              ref={field.ref}
              className="w-full min-w-0 bg-transparent py-2.5 pl-3 text-center text-base font-extrabold tabular-nums text-fg-strong focus-visible:outline-none"
            />
            {sufijo && (
              <span className="pointer-events-none shrink-0 pr-3 text-2xs font-bold text-fg-subtle">
                {sufijo}
              </span>
            )}
          </div>
        );
      }}
    />
  );
}

function RuleField({
  control,
  name,
  etiqueta,
  ayuda,
  sufijo,
}: {
  control: Control<ReglasInput>;
  name: CampoKey;
  etiqueta: string;
  ayuda: string;
  sufijo?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-fg-strong">{etiqueta}</p>
        <p className="mt-0.5 text-xs leading-snug text-fg-muted">{ayuda}</p>
      </div>
      <CampoNumero control={control} name={name} sufijo={sufijo} />
    </div>
  );
}

const ACIERTOS: { name: CampoKey; etiqueta: string; ayuda: string }[] = [
  { name: "pts_marcador_exacto", etiqueta: "Marcador exacto", ayuda: "Aciertas exactamente el marcador. Recomendado mayor que Gol + Ganador." },
  { name: "pts_ganador", etiqueta: "Ganador acertado", ayuda: "Aciertas solo el ganador (o el empate) del partido." },
  { name: "pts_gol_acertado", etiqueta: "Gol acertado", ayuda: "Aciertas el número exacto de goles de uno de los equipos." },
  { name: "pts_prediccion_unica", etiqueta: "Predicción única", ayuda: "Bono por ser el único en acertar el marcador exacto." },
];

const BONOS: { name: CampoKey; etiqueta: string; ayuda: string }[] = [
  { name: "bono_dieciseisavos", etiqueta: "Dieciseisavos", ayuda: "Bono por marcador exacto en 1/16." },
  { name: "bono_octavos", etiqueta: "Octavos", ayuda: "Bono por marcador exacto en octavos." },
  { name: "bono_cuartos", etiqueta: "Cuartos", ayuda: "Bono por marcador exacto en cuartos." },
  { name: "bono_semifinales", etiqueta: "Semifinales", ayuda: "Bono por marcador exacto en semis." },
  { name: "bono_final", etiqueta: "Final", ayuda: "Bono por marcador exacto en la final." },
];

const PREMIOS: { name: CampoKey; lugar: string; medalla: string }[] = [
  { name: "premio_primer_lugar", lugar: "1er lugar", medalla: "🥇" },
  { name: "premio_segundo_lugar", lugar: "2do lugar", medalla: "🥈" },
  { name: "premio_tercer_lugar", lugar: "3er lugar", medalla: "🥉" },
];

function SeccionHeader({ titulo, sub }: { titulo: string; sub: string }) {
  return (
    <div className="mb-4">
      <h3 className="t-h4 text-fg-strong">{titulo}</h3>
      <p className="mt-0.5 text-xs text-fg-muted">{sub}</p>
    </div>
  );
}

/**
 * Campos de configuración de reglas (puntajes, bonos, pozo, premios y cierre).
 * Presentacional: recibe el `control` de RHF y se reusa tanto en el wizard de
 * creación (`PasoReglas`) como en la edición de una polla existente
 * (`FormularioReglas`). La validación vive en `reglasSchema`.
 */
export function CamposReglas({ control }: { control: Control<ReglasInput> }) {
  const [p1, p2, p3] = useWatch({
    control,
    name: ["premio_primer_lugar", "premio_segundo_lugar", "premio_tercer_lugar"],
  });
  const suma = (p1 || 0) + (p2 || 0) + (p3 || 0);
  const premiosOk = suma === 100;

  return (
    <div className="space-y-4">
      {/* Aciertos */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <SeccionHeader
          titulo="Aciertos básicos"
          sub="Puntos que se otorgan partido a partido."
        />
        <div className="flex flex-col divide-y divide-border">
          {ACIERTOS.map((c) => (
            <div key={c.name} className="py-3.5 first:pt-0 last:pb-0">
              <RuleField control={control} sufijo="pts" {...c} />
            </div>
          ))}
        </div>
      </section>

      {/* Bonos */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <SeccionHeader
          titulo="Bonos por fase de eliminación"
          sub="Puntos extra por acertar marcador exacto en estas fases."
        />
        <div className="flex flex-col divide-y divide-border">
          {BONOS.map((c) => (
            <div key={c.name} className="py-3.5 first:pt-0 last:pb-0">
              <RuleField control={control} sufijo="pts" {...c} />
            </div>
          ))}
        </div>
      </section>

      {/* Pozo y premios */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <SeccionHeader
          titulo="Pozo y premios"
          sub="Configura el valor de la apuesta y la repartición."
        />
        <RuleField
          control={control}
          name="valor_apuesta"
          etiqueta="Valor de apuesta"
          ayuda="Monto en COP que paga cada participante. 0 = grupo gratis."
          sufijo="COP"
        />
        <div className="mt-4 grid grid-cols-3 gap-2.5 rounded-xl bg-sunken p-3">
          {PREMIOS.map((p) => (
            <div
              key={p.name}
              className="rounded-lg border border-border bg-surface p-2.5"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-base" aria-hidden>
                  {p.medalla}
                </span>
                <span className="text-2xs font-bold uppercase tracking-wide text-fg-muted">
                  {p.lugar}
                </span>
              </div>
              <CampoNumero
                control={control}
                name={p.name}
                sufijo="%"
                ancho="w-full"
              />
            </div>
          ))}
        </div>
        <div
          className={cn(
            "mt-3 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold",
            premiosOk
              ? "bg-primary-soft text-primary"
              : "bg-destructive-soft text-destructive",
          )}
          role="status"
        >
          {premiosOk && <Check className="size-4 shrink-0" strokeWidth={3} />}
          <span>
            La repartición suma {suma}%
            {premiosOk ? " — ¡perfecto!" : " (debe sumar 100%)"}
          </span>
        </div>
      </section>

      {/* Cierre */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <RuleField
          control={control}
          name="minutos_cierre_prediccion"
          etiqueta="Cierre de predicciones"
          ayuda="Minutos antes del kickoff en que se bloquea la predicción."
          sufijo="min"
        />
      </section>
    </div>
  );
}
