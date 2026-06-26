import { Trophy } from "lucide-react";
import { Flag } from "@/components/shared/Flag";
import { cn } from "@/lib/utils";
import type { Equipo, FaseTorneo, Partido } from "@/lib/types/dominio";
import { ETIQUETA_FASE } from "@/lib/types/dominio";

// Rondas de la llave, de la primera (más lejana a la final) hacia la final. El
// tercer lugar va aparte: sus alimentadores son los PERDEDORES de semis y
// rompería la geometría de pares de la llave.
const ORDEN_BRACKET: FaseTorneo[] = [
  "dieciseisavos",
  "octavos",
  "cuartos",
  "semifinales",
  "final",
];

/** Números de partido que alimentan a `p` (placeholders `G<n>` / `P<n>`). */
function feedersDe(p: Partido): number[] {
  const nums: number[] = [];
  for (const ph of [p.placeholder_local, p.placeholder_visitante]) {
    const m = ph?.match(/^[GP](\d+)$/);
    if (m) nums.push(Number(m[1]));
  }
  return nums;
}

/** Etiqueta legible para un lado que aún no tiene equipo (placeholder). */
function etiquetaPlaceholder(ph: string | null): string {
  if (!ph) return "Por definir";
  const pos = ph.match(/^([1-3])([A-L])$/);
  if (pos) return `${pos[1]}° ${pos[2]}`;
  const gan = ph.match(/^G(\d+)$/);
  if (gan) return `Gana #${gan[1]}`;
  const per = ph.match(/^P(\d+)$/);
  if (per) return `Pierde #${per[1]}`;
  if (/^3[A-L]+$/.test(ph)) return "Mejor 3°";
  return ph;
}

export function BracketTorneo({ partidos }: { partidos: Partido[] }) {
  const tercerLugar = partidos.find((p) => p.fase === "tercer_lugar") ?? null;

  const porNumero = new Map<number, Partido>();
  const porFase = new Map<FaseTorneo, Partido[]>();
  for (const p of partidos) {
    if (p.fase === "fase_grupos" || p.fase === "tercer_lugar") continue;
    porNumero.set(p.numero_partido, p);
    const arr = porFase.get(p.fase);
    if (arr) arr.push(p);
    else porFase.set(p.fase, [p]);
  }

  const fases = ORDEN_BRACKET.filter((f) => porFase.has(f));
  if (fases.length === 0) {
    return (
      <section className="surface-card space-y-2 rounded-2xl p-4">
        <h2 className="t-h3 text-fg-strong">Llave de eliminatorias</h2>
        <p className="t-body-sm text-fg-muted">
          Este torneo no tiene fase eliminatoria configurada.
        </p>
      </section>
    );
  }

  // Orden de cada columna por recorrido en profundidad del árbol (desde la final
  // hacia las hojas): a cada partido le asignamos el índice de la hoja más a la
  // izquierda de su subárbol. Así, en cada columna, los dos alimentadores de un
  // nodo quedan SIEMPRE adyacentes, sin depender de la numeración de partidos.
  const orden = new Map<number, number>();
  let contador = 0;
  const visitar = (m: Partido): number => {
    const hijos = feedersDe(m)
      .map((n) => porNumero.get(n))
      .filter((x): x is Partido => Boolean(x));
    if (hijos.length === 0) {
      const idx = contador++;
      orden.set(m.numero_partido, idx);
      return idx;
    }
    let min = Number.POSITIVE_INFINITY;
    for (const h of hijos) min = Math.min(min, visitar(h));
    orden.set(m.numero_partido, min);
    return min;
  };
  const referidos = new Set<number>();
  for (const p of porNumero.values())
    for (const n of feedersDe(p)) referidos.add(n);
  const raices = [...porNumero.values()].filter(
    (p) => !referidos.has(p.numero_partido),
  );
  const raiz = raices.find((p) => p.fase === "final") ?? raices[0];
  if (raiz) visitar(raiz);

  const ordenar = (lista: Partido[]) =>
    [...lista].sort(
      (a, b) =>
        (orden.get(a.numero_partido) ?? 0) - (orden.get(b.numero_partido) ?? 0),
    );

  /** Todos los partidos del subárbol que alimenta a `num` (incluido). */
  const subarbol = (num: number, acc: Set<number>) => {
    const m = porNumero.get(num);
    if (!m || acc.has(num)) return;
    acc.add(num);
    for (const n of feedersDe(m)) subarbol(n, acc);
  };

  // ¿Se puede partir en dos lados? Solo si la raíz es la final con 2
  // alimentadores: uno arma el lado izquierdo y el otro el derecho (la final
  // queda al centro). Si no, llave de un solo lado.
  const raizFeeders = raiz
    ? feedersDe(raiz)
        .map((n) => porNumero.get(n))
        .filter((x): x is Partido => Boolean(x))
    : [];
  const dosLados = !!raiz && raiz.fase === "final" && raizFeeders.length === 2;

  return (
    <section className="surface-card space-y-4 rounded-2xl p-4">
      <header className="flex items-center gap-2">
        <Trophy className="size-5 text-accent" />
        <h2 className="t-h3 text-fg-strong">Llave de eliminatorias</h2>
      </header>
      <p className="t-body-sm text-fg-muted">
        Se arma sola con la clasificación: cada cruce muestra los equipos reales
        conforme se resuelven (incluidos los mejores terceros). Desliza
        horizontalmente para recorrer las rondas.
      </p>

      <div className="overflow-x-auto scroll-touch pb-2">
        {dosLados
          ? (() => {
              const fasesSinFinal = fases.filter((f) => f !== "final");
              const izq = new Set<number>();
              const der = new Set<number>();
              subarbol(raizFeeders[0].numero_partido, izq);
              subarbol(raizFeeders[1].numero_partido, der);

              const colsIzq = fasesSinFinal.map((f) =>
                ordenar((porFase.get(f) ?? []).filter((p) => izq.has(p.numero_partido))),
              );
              // Lado derecho: mismas rondas en orden inverso (la semfinal pegada
              // al centro, los dieciseisavos al extremo).
              const colsDer = [...fasesSinFinal]
                .reverse()
                .map((f) =>
                  ordenar(
                    (porFase.get(f) ?? []).filter((p) => der.has(p.numero_partido)),
                  ),
                );

              return (
                <div className="bracket">
                  {colsIzq.map((col, i) => (
                    <Columna
                      key={`i-${col[0]?.fase ?? i}`}
                      col={col}
                      conector={i < colsIzq.length - 1 ? "right" : "none"}
                    />
                  ))}
                  <Columna col={[raiz]} conector="center" />
                  {colsDer.map((col, i) => (
                    <Columna
                      key={`d-${col[0]?.fase ?? i}`}
                      col={col}
                      conector={i > 0 ? "left" : "none"}
                    />
                  ))}
                </div>
              );
            })()
          : (
              <div className="bracket">
                {fases.map((f, i) => (
                  <Columna
                    key={f}
                    col={ordenar(porFase.get(f) ?? [])}
                    conector={i < fases.length - 1 ? "right" : "none"}
                  />
                ))}
              </div>
            )}
      </div>

      {tercerLugar && (
        <div className="space-y-1.5">
          <h3 className="bracket-col-title text-left">Tercer lugar</h3>
          <div className="max-w-[12rem]">
            <NodoBracket partido={tercerLugar} />
          </div>
        </div>
      )}
    </section>
  );
}

function Columna({
  col,
  conector,
}: {
  col: Partido[];
  conector: "right" | "left" | "center" | "none";
}) {
  if (col.length === 0) return null;
  return (
    <div
      className={cn(
        "bracket-col",
        conector === "right" && "bracket-col--feeds-right",
        conector === "left" && "bracket-col--feeds-left",
        conector === "center" && "bracket-col--center",
      )}
    >
      <h3 className="bracket-col-title">{ETIQUETA_FASE[col[0].fase]}</h3>
      <div className="bracket-col-body">
        {col.map((p, i) => (
          <div
            key={p.id}
            className={cn(
              "bracket-cell",
              i % 2 === 0 ? "bracket-cell--top" : "bracket-cell--bottom",
            )}
          >
            <NodoBracket partido={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

function NodoBracket({ partido }: { partido: Partido }) {
  const finalizado = partido.estado === "finalizado";
  const avanza = partido.equipo_avanza_id;
  return (
    <div className="w-full overflow-hidden rounded-lg border border-border bg-surface">
      <span className="block bg-sunken px-2 py-0.5 text-2xs font-bold tabular-nums text-fg-muted">
        #{partido.numero_partido}
      </span>
      <LadoBracket
        equipo={partido.equipo_local}
        placeholder={partido.placeholder_local}
        goles={partido.goles_local}
        penales={partido.penales_local}
        gana={finalizado && !!avanza && partido.equipo_local?.id === avanza}
      />
      <div className="h-px bg-border" />
      <LadoBracket
        equipo={partido.equipo_visitante}
        placeholder={partido.placeholder_visitante}
        goles={partido.goles_visitante}
        penales={partido.penales_visitante}
        gana={finalizado && !!avanza && partido.equipo_visitante?.id === avanza}
      />
    </div>
  );
}

function LadoBracket({
  equipo,
  placeholder,
  goles,
  penales,
  gana,
}: {
  equipo: Equipo | null;
  placeholder: string | null;
  goles: number | null;
  penales: number | null;
  gana: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1",
        gana && "bg-primary-soft",
      )}
    >
      {equipo ? (
        <Flag code={equipo.codigo_iso} size={16} round />
      ) : (
        <span className="size-4 shrink-0 rounded-full border border-dashed border-border" />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs",
          gana && "font-bold text-primary",
          !gana && equipo && "font-semibold text-fg-strong",
          !equipo && "font-medium italic text-fg-muted",
        )}
      >
        {equipo ? equipo.nombre : etiquetaPlaceholder(placeholder)}
      </span>
      {goles !== null && (
        <span
          className={cn(
            "shrink-0 text-xs tabular-nums",
            gana ? "font-bold text-primary" : "text-fg-muted",
          )}
        >
          {goles}
          {penales !== null && <span className="text-2xs"> ({penales})</span>}
        </span>
      )}
    </div>
  );
}
