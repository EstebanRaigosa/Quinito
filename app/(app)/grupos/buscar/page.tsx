"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search, Users } from "lucide-react";
import { toast } from "sonner";
import {
  buscarGrupo,
  unirseAGrupo,
  type GrupoPreview,
} from "@/lib/queries/buscar-grupo";
import { formatearMonto } from "@/lib/utils/texto";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarGrupo } from "@/components/grupos/AvatarGrupo";
import { PageContainer } from "@/components/shared/PageContainer";

const LARGO = 6;

function CodigoOtp({
  value,
  onChange,
  invalido,
  onEnter,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  invalido?: boolean;
  onEnter?: () => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  function setChar(i: number, char: string) {
    const limpio = char.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const next = [...value];
    next[i] = limpio.slice(-1) ?? "";
    onChange(next);
    if (limpio && i < LARGO - 1) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !value[i] && i > 0) {
      refs.current[i - 1]?.focus();
    }
    if (e.key === "Enter") onEnter?.();
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const texto = e.clipboardData
      .getData("text")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, LARGO);
    const next = Array.from({ length: LARGO }, (_, i) => texto[i] ?? "");
    onChange(next);
    refs.current[Math.min(texto.length, LARGO - 1)]?.focus();
  }

  return (
    <div
      className="flex justify-center gap-2 sm:gap-2.5"
      onPaste={onPaste}
      role="group"
      aria-label="Código de invitación de 6 caracteres"
    >
      {Array.from({ length: LARGO }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i] ?? ""}
          onChange={(e) => setChar(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={1}
          aria-label={`Carácter ${i + 1} del código`}
          aria-invalid={invalido || undefined}
          className={cn(
            "h-14 w-11 rounded-xl border-2 bg-sunken text-center text-2xl font-extrabold uppercase text-fg-strong transition-colors sm:h-16 sm:w-12",
            "focus-visible:border-primary focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-soft",
            invalido
              ? "border-destructive"
              : value[i]
                ? "border-primary"
                : "border-input",
          )}
        />
      ))}
    </div>
  );
}

export default function BuscarGrupoPage() {
  const router = useRouter();
  const [chars, setChars] = useState<string[]>(Array(LARGO).fill(""));
  const [buscando, setBuscando] = useState(false);
  const [grupo, setGrupo] = useState<GrupoPreview | null>(null);
  const [noEncontrado, setNoEncontrado] = useState(false);
  const [uniendo, setUniendo] = useState(false);

  const codigo = chars.join("");
  const completo = codigo.length === LARGO;

  function actualizarCodigo(v: string[]) {
    setChars(v);
    // Limpia los estados de resultado al editar el código.
    if (noEncontrado) setNoEncontrado(false);
    if (grupo) setGrupo(null);
  }

  async function buscar() {
    if (!completo) {
      toast.error("Completa el código de 6 caracteres");
      return;
    }
    setBuscando(true);
    setNoEncontrado(false);
    setGrupo(null);
    const encontrado = await buscarGrupo(codigo);
    if (encontrado) setGrupo(encontrado);
    else setNoEncontrado(true);
    setBuscando(false);
  }

  async function unirme() {
    if (!grupo) return;
    setUniendo(true);
    const r = await unirseAGrupo(grupo.id);
    if (!r.ok) {
      toast.error("No se pudo unir al grupo. Intenta de nuevo.");
      setUniendo(false);
      return;
    }
    toast.success(
      r.yaEra ? `Ya eras parte de ${grupo.nombre}` : `Te uniste a ${grupo.nombre}`,
    );
    router.push(`/grupos/${grupo.id}`);
    router.refresh();
  }

  return (
    <PageContainer ancho="estrecho">
      <div className="mb-8 animate-fade-up text-center">
        <span className="mx-auto mb-4 grid size-16 animate-pop place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
          <Search className="size-7" strokeWidth={2.2} />
        </span>
        <h1 className="t-h1">Únete a un grupo</h1>
        <p className="t-body-sm mx-auto mt-1.5 max-w-xs text-fg-muted">
          Pídele al admin del grupo el código de 6 caracteres y escríbelo aquí.
        </p>
      </div>

      <div className="surface-card animate-fade-up space-y-5 rounded-2xl p-5 [animation-delay:80ms] sm:p-6">
        <div className="space-y-2">
          <span className="overline block text-center">
            Código de invitación
          </span>
          <CodigoOtp
            value={chars}
            onChange={actualizarCodigo}
            invalido={noEncontrado}
            onEnter={buscar}
          />
        </div>

        <Button
          onClick={buscar}
          disabled={buscando || !completo}
          className="w-full"
          size="lg"
        >
          {buscando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Buscar grupo
        </Button>

        {noEncontrado && (
          <p
            role="alert"
            className="t-body-sm animate-fade-up rounded-xl bg-destructive-soft px-3.5 py-3 text-center font-medium text-destructive"
          >
            No encontramos ningún grupo con el código{" "}
            <strong className="font-extrabold tracking-wide">{codigo}</strong>.
            Revísalo e intenta de nuevo.
          </p>
        )}

        {grupo && (
          <div className="animate-scale-in space-y-4 rounded-xl border border-primary/30 bg-primary-soft/40 p-4">
            <div className="flex items-start gap-3">
              <AvatarGrupo
                nombre={grupo.nombre}
                size="lg"
                className="ring-2 ring-app"
              />
              <div className="min-w-0 flex-1">
                <h3 className="t-h4 truncate text-fg-strong">{grupo.nombre}</h3>
                {grupo.descripcion && (
                  <p className="t-caption mt-0.5 line-clamp-2">
                    {grupo.descripcion}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    <Users className="size-3" /> {grupo.total_participantes}{" "}
                    jugadores
                  </Badge>
                  <Badge variant={grupo.valor_apuesta > 0 ? "primary" : "success"}>
                    {grupo.valor_apuesta > 0
                      ? `${formatearMonto(grupo.valor_apuesta)} / persona`
                      : "Gratis"}
                  </Badge>
                </div>
              </div>
            </div>

            <Button
              onClick={unirme}
              disabled={uniendo}
              className="w-full"
              size="lg"
            >
              {uniendo ? (
                <Loader2 className="size-4 animate-spin" />
              ) : !grupo.ya_es_miembro ? (
                <ArrowRight className="size-4" />
              ) : null}
              {grupo.ya_es_miembro ? "Ir al grupo" : "Unirme al grupo"}
            </Button>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
