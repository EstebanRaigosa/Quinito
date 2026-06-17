"use client";

import { useState } from "react";
import { useWatch, type Control } from "react-hook-form";
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  X,
} from "lucide-react";
import type { ReglasInput } from "@/lib/schemas/reglas";
import type { CriterioDesempate } from "@/lib/types/dominio";
import { cn } from "@/lib/utils";
import { FormField } from "@/components/ui/form";

type CampoKey = keyof ReglasInput;

/** Catálogo de criterios de desempate (etiqueta + ayuda). */
const CRITERIOS_META: {
  key: CriterioDesempate;
  etiqueta: string;
  ayuda: string;
}[] = [
  {
    key: "exactos",
    etiqueta: "Marcadores exactos",
    ayuda: "Quien clavó más resultados exactos va arriba.",
  },
  {
    key: "unicas",
    etiqueta: "Predicciones únicas",
    ayuda: "Más marcadores exactos que nadie más del grupo acertó.",
  },
  {
    key: "aciertos",
    etiqueta: "Aciertos totales",
    ayuda: "Más predicciones que sumaron algún punto.",
  },
];

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
  etiqueta,
  ancho = "w-[7.5rem]",
}: {
  control: Control<ReglasInput>;
  name: CampoKey;
  sufijo?: string;
  /** Etiqueta legible para a11y (evita exponer la clave técnica del campo). */
  etiqueta?: string;
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
              aria-label={`Valor de ${etiqueta ?? name}`}
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
      <CampoNumero
        control={control}
        name={name}
        sufijo={sufijo}
        etiqueta={etiqueta}
      />
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
  { name: "bono_dieciseisavos", etiqueta: "Dieciseisavos", ayuda: "Todo o nada: aciertas todos los equipos que avanzan de dieciseisavos." },
  { name: "bono_octavos", etiqueta: "Octavos", ayuda: "Todo o nada: aciertas todos los equipos que avanzan de octavos." },
  { name: "bono_cuartos", etiqueta: "Cuartos", ayuda: "Todo o nada: aciertas todos los equipos que avanzan de cuartos." },
  { name: "bono_semifinales", etiqueta: "Semifinales", ayuda: "Todo o nada: aciertas los 2 finalistas (avanzan de semifinales)." },
  { name: "bono_final", etiqueta: "Final", ayuda: "Todo o nada: aciertas al campeón (gana la final)." },
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
 * Lista de criterios de desempate: **arrastrable tipo tarjeta** (Pointer Events,
 * sin librería — funciona en touch y mouse) y también con flechas ↑/↓ para
 * precisión/accesibilidad. Chips para volver a agregar los que se quitaron. El
 * valor (`activos`) es el array ordenado de criterios activos.
 */
function ListaDesempate({
  activos,
  onChange,
}: {
  activos: CriterioDesempate[];
  onChange: (next: CriterioDesempate[]) => void;
}) {
  const [arrastrando, setArrastrando] = useState<CriterioDesempate | null>(null);
  const meta = (k: CriterioDesempate) =>
    CRITERIOS_META.find((m) => m.key === k)!;
  const inactivos = CRITERIOS_META.filter((m) => !activos.includes(m.key));
  const btn =
    "grid size-8 shrink-0 place-items-center rounded-lg border border-border text-fg-muted transition-colors hover:bg-sunken disabled:pointer-events-none disabled:opacity-35";

  const mover = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= activos.length) return;
    const next = [...activos];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };

  // Arrastre: al pasar el puntero sobre otra tarjeta, mueve la arrastrada a esa
  // posición. `elementFromPoint` es robusto en touch (no depende de rects).
  const alArrastrar = (e: React.PointerEvent) => {
    if (!arrastrando) return;
    const sobre = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest("[data-criterio]")
      ?.getAttribute("data-criterio") as CriterioDesempate | null;
    if (!sobre || sobre === arrastrando) return;
    const from = activos.indexOf(arrastrando);
    const to = activos.indexOf(sobre);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...activos];
    next.splice(from, 1);
    next.splice(to, 0, arrastrando);
    onChange(next);
  };
  const finArrastre = () => setArrastrando(null);

  return (
    <div className="space-y-3">
      <ul className="flex flex-col gap-2">
        {activos.map((k, i) => (
          <li
            key={k}
            data-criterio={k}
            className={cn(
              "flex select-none items-center gap-2 rounded-xl border bg-surface p-2.5 transition-shadow",
              arrastrando === k
                ? "border-primary/50 shadow-lg ring-2 ring-primary/30"
                : "border-border",
            )}
          >
            {/* Handle de arrastre. `touch-none` evita que el navegador haga
                scroll al arrastrar en móvil. */}
            <button
              type="button"
              aria-label={`Arrastrar ${meta(k).etiqueta}`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                setArrastrando(k);
              }}
              onPointerMove={alArrastrar}
              onPointerUp={finArrastre}
              onPointerCancel={finArrastre}
              className="grid size-8 shrink-0 cursor-grab touch-none select-none place-items-center rounded-lg text-fg-subtle [-webkit-touch-callout:none] hover:bg-sunken active:cursor-grabbing"
            >
              <GripVertical className="size-4" />
            </button>
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-2xs font-black text-primary-foreground">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-fg-strong">
                {meta(k).etiqueta}
              </p>
              <p className="mt-0.5 text-2xs leading-snug text-fg-muted">
                {meta(k).ayuda}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={`Subir ${meta(k).etiqueta}`}
                disabled={i === 0}
                onClick={() => mover(i, -1)}
                className={btn}
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Bajar ${meta(k).etiqueta}`}
                disabled={i === activos.length - 1}
                onClick={() => mover(i, 1)}
                className={btn}
              >
                <ChevronDown className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Quitar ${meta(k).etiqueta}`}
                onClick={() => onChange(activos.filter((x) => x !== k))}
                className={btn}
              >
                <X className="size-4" />
              </button>
            </div>
          </li>
        ))}
        {activos.length === 0 && (
          <li className="rounded-xl border border-dashed border-border bg-sunken/40 p-3 text-center text-xs font-medium text-fg-muted">
            Sin criterios: los empates se resolverán por orden alfabético.
          </li>
        )}
      </ul>

      {inactivos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xs font-bold uppercase tracking-wide text-fg-subtle">
            Agregar:
          </span>
          {inactivos.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => onChange([...activos, m.key])}
              className="inline-flex items-center gap-1 rounded-pill border border-dashed border-border px-3 py-1.5 text-xs font-bold text-fg-muted transition-colors hover:bg-sunken"
            >
              <Plus className="size-3.5" />
              {m.etiqueta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sección de criterios de desempate. Reusada en wizard y edición. */
function SeccionDesempate({ control }: { control: Control<ReglasInput> }) {
  return (
    <section className="surface-card rounded-2xl p-5 sm:p-6">
      <SeccionHeader
        titulo="Criterios de desempate"
        sub="Si dos quedan con los mismos puntos, se ordenan por estos criterios, en este orden. Arrástralos o usa las flechas. Si aún empatan, manda el orden alfabético."
      />
      <FormField
        control={control}
        name="criterios_desempate"
        render={({ field }) => (
          <ListaDesempate
            activos={(field.value ?? []) as CriterioDesempate[]}
            onChange={field.onChange}
          />
        )}
      />
    </section>
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

      {/* Criterios de desempate */}
      <SeccionDesempate control={control} />

      {/* Bonos */}
      <section className="surface-card rounded-2xl p-5 sm:p-6">
        <SeccionHeader
          titulo="Bono por ronda perfecta"
          sub="Se obtiene cuando aciertas todos los equipos que avanzan en una ronda (16avos, octavos, cuartos, semifinales, etc.). Si fallas al menos un equipo, no se otorga el bono de esa ronda."
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
                etiqueta={`Premio ${p.lugar}`}
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
