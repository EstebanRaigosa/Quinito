"use client";

import { useEffect, useRef, useState } from "react";
import { Trophy, Timer, Hourglass, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dentroVentanaAnuncio } from "@/lib/utils/ventana-anuncios";

/** Bono de una fase eliminatoria que la polla apuesta (monto según sus reglas). */
export type BonoEliminacion = {
  /** Etiqueta legible de la fase (ej. "Octavos de final"). */
  etiqueta: string;
  /** Puntos del bono todo-o-nada configurado para esa fase. */
  monto: number;
};

type Props = {
  /** Id de la polla: el contador de vistas se guarda por usuario y por polla. */
  grupoId: string;
  /** Fases de eliminación que apuesta la polla, con su bono configurado. */
  bonos: BonoEliminacion[];
};

/**
 * Versión del contenido. Súbela si cambia el copy y querés que el aviso se
 * vuelva a mostrar a quienes ya lo cerraron.
 */
const VERSION = "v1";

// La ventana de visibilidad (rango de fechas en hora de Bogotá) vive en
// `lib/utils/ventana-anuncios.ts` — fuente única compartida con el avisito del
// nuevo orden del detalle, para no duplicar las fechas.

/** Máximo de veces que se le muestra el aviso a un mismo usuario (navegador). */
const MAX_VECES = 2;

/**
 * Prefijo de la clave de localStorage; se completa con el id de la polla. El
 * contador de vistas es POR usuario (navegador) y POR polla: guarda CUÁNTAS
 * veces se le ha mostrado en ESA polla; tras `MAX_VECES` no se vuelve a mostrar.
 */
const CLAVE_PREFIJO = `pll:modal-eliminacion:${VERSION}`;

// Confeti determinista (sin Math.random → mismo resultado en SSR y cliente, sin
// desajuste de hidratación). Cada pieza cae con su propio retraso y duración;
// 1 de cada 4 es un balón ⚽ que cae girando junto al confeti.
const COLORES_CONFETI = ["#6EE7B7", "#22C55E", "#2DD4BF", "#FFFFFF", "#FACC15"];
const CONFETI = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 4.7 + 3) % 96}%`,
  delay: `${(i % 6) * 80}ms`,
  duracion: `${1500 + (i % 4) * 260}ms`,
  color: COLORES_CONFETI[i % COLORES_CONFETI.length],
  ancho: 5 + (i % 3),
  alto: 8 + (i % 4) * 2,
  esBalon: i % 4 === 0,
  tamBalon: 14 + (i % 3) * 4,
}));

/** Lluvia de confeti + balones que cae una sola vez sobre la cabecera al abrir. */
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

/**
 * Aviso de bienvenida que se muestra hasta `MAX_VECES` veces por usuario y por
 * polla (contador en localStorage) y SOLO dentro de la ventana de anuncios
 * (`dentroVentanaAnuncio`, hora de Bogotá), al entrar a una polla del Mundial 2026 que
 * apuesta fases de eliminación directa. Explica que solo los 90′ puntúan y los
 * bonos de fase. Animación de celebración 100% CSS (keyframes del DS): confeti,
 * rayos girando, trofeo y título con entrada de impacto. Pensado para móvil y
 * con scroll si el contenido excede la pantalla. Respeta `prefers-reduced-motion`.
 */
export function ModalEliminacionDirecta({ grupoId, bonos }: Props) {
  const [abierto, setAbierto] = useState(false);
  // Modo prueba: con `?probar-modal` en la URL se muestra SIEMPRE (ignora la
  // ventana horaria y el contador) y NO persiste, para poder probarlo a
  // voluntad. Los usuarios normales nunca llevan ese parámetro.
  // En ref (no estado): solo lo consulta `cerrar`, no afecta el render.
  const modoPruebaRef = useRef(false);
  // Contador de vistas POR usuario y POR polla.
  const clave = `${CLAVE_PREFIJO}:${grupoId}:vistas`;

  useEffect(() => {
    let prueba = false;
    try {
      prueba = new URLSearchParams(window.location.search).has("probar-modal");
    } catch {
      prueba = false;
    }
    modoPruebaRef.current = prueba;

    if (!prueba) {
      // 1) Solo dentro de la ventana de anuncios (rango en hora de Bogotá).
      //    Compara INSTANTES UTC, así no depende de la zona del navegador (§3.5).
      if (!dentroVentanaAnuncio(Date.now())) return;

      // 2) ¿Ya se le mostró el máximo de veces en ESTA polla?
      let vistas = MAX_VECES;
      try {
        vistas = Number(localStorage.getItem(clave)) || 0;
      } catch {
        // Safari en modo privado puede lanzar al leer storage: no insistimos.
        vistas = MAX_VECES;
      }
      if (vistas >= MAX_VECES) return;
    }

    // Pequeño respiro para que la página pinte antes de abrir el aviso.
    const t = setTimeout(() => {
      setAbierto(true);
      // Cuenta esta aparición (salvo en modo prueba). Releemos el valor fresco
      // para no pisar un incremento concurrente.
      if (!modoPruebaRef.current) {
        try {
          const previas = Number(localStorage.getItem(clave)) || 0;
          localStorage.setItem(clave, String(previas + 1));
        } catch {
          // Si no se puede persistir, igual lo mostramos.
        }
      }
    }, prueba ? 150 : 450);
    return () => clearTimeout(t);
  }, [clave]);

  function cerrar() {
    // La aparición ya se contó al abrir; cerrar solo oculta.
    setAbierto(false);
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => !v && cerrar()}>
      {/* Layout en columnas: cabecera y footer FIJOS, scroll solo en el cuerpo.
          Así la barra de scroll queda dentro del área blanca y nunca sobre las
          esquinas redondeadas ni el gradiente de la cabecera (se veía "por fuera").
          overflow-hidden recorta esquinas + decoraciones de la cabecera. */}
      <DialogContent
        hideClose
        className="flex max-w-md flex-col gap-0 overflow-hidden p-0"
      >
        {/* ── Cabecera de celebración (FIJA): degradado ink→esmeralda de marca ── */}
        <div className="relative shrink-0 overflow-hidden rounded-t-2xl bg-gradient-to-br from-[var(--clay-900)] via-[var(--clay-800)] to-[var(--mustard-700)] px-6 pb-7 pt-8 text-center">
          <ConfetiCelebracion />

          {/* Glow decorativo sutil (sin el brillo diagonal recurrente: era ruido) */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full bg-mustard-400/25 blur-3xl motion-reduce:hidden"
          />

          {/* Trofeo: rayos que giran + halo que pulsa + disco con entrada de impacto */}
          <div className="relative mx-auto mb-3 grid size-16 place-items-center">
            {/* Rayos: la MÁSCARA radial vive en el padre estático (no se repinta);
                solo el hijo con el conic-gradient gira (transform puro → capa GPU).
                En iOS evita repintar el gradiente enmascarado en cada frame. */}
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
              <Trophy
                className="size-8 text-mustard-300 motion-safe:animate-float"
                aria-hidden
              />
            </span>
            {/* Balón que pica junto al trofeo (entra con pop y luego rebota) */}
            <span
              aria-hidden
              className="absolute -bottom-1 -right-3 z-10 animate-pop select-none text-xl leading-none [animation-delay:600ms]"
            >
              <span className="block animate-bounce motion-reduce:animate-none">⚽</span>
            </span>
          </div>

          <p className="overline mb-1 animate-fade-up text-mustard-300 [animation-delay:140ms]">
            Mundial 2026 · Eliminación directa
          </p>
          <DialogTitle className="animate-pop text-2xl font-black leading-tight text-white [animation-delay:80ms]">
            ¡Inician las fases de eliminación directa!
          </DialogTitle>
          <DialogDescription className="mt-2 animate-fade-up text-sm text-white/70 [animation-delay:280ms]">
            Predices igual que en la fase de grupos. Solo ten esto en cuenta 👇
          </DialogDescription>
        </div>

        {/* ── Cuerpo (ÚNICO con scroll). Dos secciones aireadas separadas por un
            divisor sutil — sin cajas/bordes/rings que saturen la lectura. ── */}
        <div className="min-h-0 flex-1 divide-y divide-border overflow-y-auto scroll-touch px-5">
          {/* Sección 1 · Solo cuentan los 90′ (texto original + barra gráfica) */}
          <section className="animate-fade-up py-4 [animation-delay:320ms]">
            <div className="mb-3 flex items-center gap-2">
              <Timer className="size-4 shrink-0 text-fg-muted" aria-hidden />
              <h3 className="text-sm font-bold text-fg-strong">
                Tu predicción solo cuenta para los 90 minutos
              </h3>
            </div>

            {/* Barra del partido: tramo verde (cuenta) + tramo gris (no cuenta).
                Gráfico pero sobrio: sin rings ni círculos de icono que saturen. */}
            <div
              className="flex overflow-hidden rounded-xl text-center"
              role="img"
              aria-label="Tu predicción cuenta para los 90 minutos, no para el tiempo extra ni los penales"
            >
              <div className="flex-[3] bg-success-soft px-2 py-2.5">
                <div className="flex items-center justify-center gap-1 text-success">
                  <Check className="size-4 shrink-0" aria-hidden />
                  <span className="text-sm font-black tabular-nums">90′</span>
                </div>
                <span className="text-2xs font-bold uppercase tracking-wide text-success">
                  Cuenta
                </span>
              </div>
              <div className="flex-[2] bg-sunken px-2 py-2.5">
                <div className="flex items-center justify-center gap-1 text-fg-muted">
                  <X className="size-4 shrink-0" strokeWidth={3} aria-hidden />
                  <span className="text-2xs font-bold leading-tight">
                    Tiempo extra y penales
                  </span>
                </div>
                <span className="text-2xs font-bold uppercase tracking-wide text-fg-subtle">
                  No cuenta
                </span>
              </div>
            </div>

            <p className="mt-2.5 flex items-start gap-1.5 text-xs text-fg-muted">
              <Hourglass className="mt-px size-3.5 shrink-0" aria-hidden />
              El tiempo extra y los penales solo definen qué equipo avanza a la siguiente
              fase.
            </p>
          </section>

          {/* Sección 2 · Bono adicional por fase (texto original) */}
          <section className="animate-fade-up py-4 [animation-delay:420ms]">
            <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Trophy className="size-3.5" aria-hidden />
              </span>
              <h3 className="text-sm font-bold text-fg-strong">
                Además: bono adicional por fase
              </h3>
              <Badge variant="gold">Todo o nada</Badge>
            </div>
            <p className="text-sm text-fg-muted">
              Acierta{" "}
              <strong className="font-semibold text-fg-strong">quiénes pasan</strong> a la
              siguiente fase y ganas un bono extra en cada ronda. Es{" "}
              <strong className="font-semibold text-fg-strong">todo o nada por fase</strong>:
              debes acertar a todos los que pasan.
            </p>

            {bonos.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {bonos.map((b) => (
                  <li
                    key={b.etiqueta}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-primary-soft px-2.5 py-1 text-xs font-semibold text-fg-strong"
                  >
                    {b.etiqueta}
                    <span className="font-black tabular-nums text-primary">
                      +{b.monto}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ── Cierre (FIJO abajo, siempre visible) — pb con safe-area iOS (§4) ── */}
        <div className="shrink-0 border-t border-border px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <Button
            onClick={cerrar}
            className="w-full animate-fade-up [animation-delay:620ms]"
          >
            ¡Entendido, a predecir!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
