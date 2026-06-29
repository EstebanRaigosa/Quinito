"use client";

import { useEffect, useRef, useState } from "react";
import { Award, Sparkles } from "lucide-react";
import type { FaseTorneo } from "@/lib/types/dominio";
import { ETIQUETA_FASE } from "@/lib/types/dominio";
import { marcarBonosCelebrados } from "@/app/(app)/grupos/[id]/actions";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Flag } from "@/components/shared/Flag";

/** País que clasificó y el usuario acertó en una fase. */
export type PaisAcertado = { nombre: string; codigo_iso: string | null };

/** Bono de fase ganado, con los países que clasificaron (todos acertados). */
export type BonoFaseCelebracion = {
  fase: FaseTorneo;
  puntos: number;
  equipos: PaisAcertado[];
};

type Props = {
  /** Id de la polla: se usa para marcar los bonos como celebrados en la BD. */
  grupoId: string;
  /**
   * Bonos de fase ganados por el usuario y AÚN no celebrados (la página los filtra
   * por `celebrado_en is null`). Si hay alguno, se festeja y se marca en la BD.
   */
  bonos: BonoFaseCelebracion[];
};

/** Orden de avance: para elegir la fase MÁS avanzada si hay varias sin celebrar. */
const ORDEN_FASE: Partial<Record<FaseTorneo, number>> = {
  dieciseisavos: 1,
  octavos: 2,
  cuartos: 3,
  semifinales: 4,
  final: 5,
};

// Confeti determinista (sin Math.random → mismo resultado en SSR y cliente).
const COLORES_CONFETI = ["#6EE7B7", "#22C55E", "#2DD4BF", "#FFFFFF", "#FACC15"];
const CONFETI = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 5.9 + 3) % 96}%`,
  delay: `${(i % 6) * 80}ms`,
  duracion: `${1500 + (i % 4) * 260}ms`,
  color: COLORES_CONFETI[i % COLORES_CONFETI.length],
  ancho: 5 + (i % 3),
  alto: 8 + (i % 4) * 2,
  esBalon: i % 4 === 0,
  tamBalon: 14 + (i % 3) * 4,
}));

/** Lluvia de confeti + balones que cae sobre la cabecera al abrir. */
function ConfetiCelebracion() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 motion-reduce:hidden"
    >
      {CONFETI.map((c, i) =>
        c.esBalon ? (
          <span
            key={i}
            className="absolute top-0 animate-confeti select-none leading-none"
            style={{
              left: c.left,
              fontSize: c.tamBalon,
              animationDelay: c.delay,
              animationDuration: c.duracion,
            }}
          >
            ⚽
          </span>
        ) : (
          <span
            key={i}
            className="absolute top-0 animate-confeti rounded-[2px]"
            style={{
              left: c.left,
              width: c.ancho,
              height: c.alto,
              background: c.color,
              animationDelay: c.delay,
              animationDuration: c.duracion,
            }}
          />
        ),
      )}
    </div>
  );
}

// Estallidos de fuegos artificiales: posición + color por estallido; cada uno
// lanza PARTICULAS en círculo hacia (--fx, --fy). Determinista (sin random).
const RADIO = 26;
const PARTICULAS = 10;
const ESTALLIDOS = [
  { top: "20%", left: "18%", color: "#FACC15", delay: 0 },
  { top: "24%", left: "80%", color: "#6EE7B7", delay: 420 },
  { top: "58%", left: "64%", color: "#2DD4BF", delay: 820 },
  { top: "62%", left: "28%", color: "#FFFFFF", delay: 1180 },
];

/** Fuegos artificiales: estallidos que se repiten mientras la modal está abierta. */
function FuegosArtificiales() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 motion-reduce:hidden"
    >
      {ESTALLIDOS.map((e, ei) => (
        <span
          key={ei}
          className="absolute"
          style={{ top: e.top, left: e.left }}
        >
          {Array.from({ length: PARTICULAS }, (_, pi) => {
            const ang = (pi / PARTICULAS) * Math.PI * 2;
            const fx = `${Math.round(Math.cos(ang) * RADIO)}px`;
            const fy = `${Math.round(Math.sin(ang) * RADIO)}px`;
            return (
              <span
                key={pi}
                className="absolute block size-1.5 animate-estallido rounded-full"
                style={
                  {
                    background: e.color,
                    boxShadow: `0 0 6px ${e.color}`,
                    animationDelay: `${e.delay}ms`,
                    "--fx": fx,
                    "--fy": fy,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </span>
      ))}
    </div>
  );
}

/**
 * Celebración (1 vez por fase, por usuario y por polla) que aparece al ENTRAR a
 * la polla cuando el usuario GANÓ el bono todo-o-nada de una fase eliminatoria
 * (acertó a todos los que clasificaron). Muestra el monto del bono y los países
 * acertados. Detecta las fases con bono aún no celebradas contra `localStorage`;
 * si hay varias, festeja la más avanzada y marca todas como vistas. No depende de
 * fechas: aparece justo tras ganar el bono. Animación 100% CSS (keyframes del DS):
 * fuegos artificiales, confeti, medalla con impacto y monto con brillo. Respeta
 * `prefers-reduced-motion`.
 *
 * Modo prueba: `?probar-bono` la muestra siempre (ignora el storage) y NO persiste.
 */
export function ModalBonoFase({ grupoId, bonos }: Props) {
  const [bono, setBono] = useState<BonoFaseCelebracion | null>(null);
  // Garantiza una sola ejecución por montaje (evita reabrir tras cerrar si el
  // componente re-renderiza con el mismo array de bonos).
  const procesado = useRef(false);

  useEffect(() => {
    if (procesado.current) return;

    let prueba = false;
    try {
      prueba = new URLSearchParams(window.location.search).has("probar-bono");
    } catch {
      prueba = false;
    }

    const masAvanzado = (lista: BonoFaseCelebracion[]) =>
      [...lista].sort(
        (a, b) => (ORDEN_FASE[b.fase] ?? 0) - (ORDEN_FASE[a.fase] ?? 0),
      )[0];

    if (prueba) {
      // Previsualización: muestra el bono más avanzado disponible (o uno demo),
      // sin marcar nada en la BD.
      const demo =
        masAvanzado(bonos) ??
        ({
          fase: "octavos",
          puntos: 8,
          equipos: [
            { nombre: "Argentina", codigo_iso: "ARG" },
            { nombre: "Brasil", codigo_iso: "BRA" },
            { nombre: "Francia", codigo_iso: "FRA" },
            { nombre: "España", codigo_iso: "ESP" },
          ],
        } as BonoFaseCelebracion);
      procesado.current = true;
      const t = setTimeout(() => setBono(demo), 150);
      return () => clearTimeout(t);
    }

    // `bonos` ya viene filtrado a los pendientes (celebrado_en is null). Si hay
    // varios (entró tras varias rondas), festejamos el más avanzado.
    if (bonos.length === 0) return;
    procesado.current = true;
    const elegido = masAvanzado(bonos)!;

    const t = setTimeout(() => {
      setBono(elegido);
      // Persiste en la BD que ya se celebró → 1 vez por usuario en todos sus
      // dispositivos. Marca TODOS los pendientes de esta polla.
      void marcarBonosCelebrados(grupoId);
    }, 500);
    return () => clearTimeout(t);
  }, [bonos, grupoId]);

  const esFinal = bono?.fase === "final";
  const equipos = bono?.equipos ?? [];

  return (
    <Dialog open={!!bono} onOpenChange={(v) => !v && setBono(null)}>
      <DialogContent
        hideClose
        className="flex max-w-sm flex-col gap-0 overflow-hidden p-0"
      >
        {/* ── Cabecera de celebración: degradado de marca + fuegos + confeti ── */}
        <div className="relative shrink-0 overflow-hidden rounded-t-2xl bg-gradient-to-br from-[var(--clay-900)] via-[var(--clay-800)] to-[var(--mustard-700)] px-6 pb-7 pt-8 text-center">
          <FuegosArtificiales />
          <ConfetiCelebracion />

          {/* Glow decorativo sutil */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full bg-mustard-400/25 blur-3xl motion-reduce:hidden"
          />

          {/* Medalla: rayos que giran + halo que pulsa + disco con impacto */}
          <div className="relative mx-auto mb-3 grid size-16 place-items-center">
            <span
              aria-hidden
              className="absolute size-40 overflow-hidden rounded-full [-webkit-mask-image:radial-gradient(circle,_black_30%,_transparent_70%)] [mask-image:radial-gradient(circle,_black_30%,_transparent_70%)] motion-reduce:hidden"
            >
              <span className="absolute inset-0 animate-giro-lento bg-[repeating-conic-gradient(from_0deg,_rgba(255,255,255,0.07)_0deg_9deg,_transparent_9deg_22deg)] [will-change:transform]" />
            </span>
            <span
              aria-hidden
              className="absolute size-16 animate-pulse rounded-full bg-mustard-400/30 blur-md motion-reduce:animate-none"
            />
            <span className="relative grid size-16 animate-impacto-pop place-items-center rounded-full bg-white/10 ring-1 ring-inset ring-white/25">
              <Award
                className="size-8 text-mustard-300 motion-safe:animate-float"
                aria-hidden
              />
            </span>
          </div>

          <p className="overline mb-1 animate-fade-up text-mustard-300 [animation-delay:140ms]">
            Bono de fase · Todo o nada
          </p>
          <DialogTitle className="animate-pop text-2xl font-black leading-tight text-white [animation-delay:80ms]">
            {esFinal
              ? "¡Bono de la final!"
              : `¡Bono de ${bono ? ETIQUETA_FASE[bono.fase] : ""}!`}
          </DialogTitle>

          {/* Monto grande con brillo que lo recorre. */}
          <div className="relative mx-auto mt-3 inline-flex animate-pop items-center gap-1.5 overflow-hidden rounded-pill bg-white/12 px-5 py-2 ring-1 ring-inset ring-white/25 [animation-delay:200ms]">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shine motion-reduce:hidden"
            />
            <Sparkles className="relative size-5 text-mustard-300" aria-hidden />
            <span className="relative text-4xl font-black leading-none tabular-nums text-white">
              +{bono?.puntos ?? 0}
            </span>
            <span className="relative self-end pb-0.5 text-base font-bold text-white/80">
              pts
            </span>
          </div>
        </div>

        {/* ── Cuerpo: copy + países acertados ── */}
        <div className="px-6 pb-2 pt-5 text-center">
          <DialogDescription className="animate-fade-up text-sm text-fg-muted [animation-delay:320ms]">
            {esFinal ? (
              <>
                Acertaste al{" "}
                <strong className="font-semibold text-fg-strong">campeón</strong>.
                ¡Te llevas el bono completo!
              </>
            ) : (
              <>
                Acertaste a{" "}
                <strong className="font-semibold text-fg-strong">
                  todos los que clasificaron
                </strong>
                . ¡Te llevas el bono completo!
              </>
            )}
          </DialogDescription>
        </div>

        {/* Países acertados: aparecen en cascada bajo el copy. */}
        {equipos.length > 0 && (
          <div className="px-5 pb-2">
            <p className="t-caption mb-2 text-center font-bold uppercase tracking-wide text-fg-subtle">
              {equipos.length === 1
                ? "Acertaste quién pasó"
                : `Acertaste a los ${equipos.length} que pasaron`}
            </p>
            <ul className="flex max-h-40 flex-wrap justify-center gap-1.5 overflow-y-auto scroll-touch">
              {equipos.map((eq, i) => (
                <li
                  key={`${eq.codigo_iso}-${i}`}
                  className="inline-flex animate-fade-up items-center gap-1.5 rounded-pill bg-success-soft px-2.5 py-1 text-xs font-bold text-success"
                  style={{ animationDelay: `${380 + i * 45}ms` }}
                >
                  <Flag code={eq.codigo_iso} size={16} />
                  <span className="truncate">{eq.nombre}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Cierre (con safe-area iOS) ── */}
        <div className="shrink-0 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <Button
            onClick={() => setBono(null)}
            className="w-full animate-fade-up [animation-delay:520ms]"
          >
            ¡Qué maravilla, ome!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
