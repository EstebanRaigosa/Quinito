import { Handshake } from "lucide-react";

/**
 * Ficha circular para la opción "Empate" en las barras de estadística. Mismo
 * tamaño/forma que <Flag round> para que empate se lea como una opción más
 * junto a los dos equipos (no como una fila suelta sin ícono).
 */
export function IconoEmpate({ size = 18 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-sunken text-fg-muted"
      style={{
        width: size,
        height: size,
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <Handshake style={{ width: size * 0.6, height: size * 0.6 }} />
    </span>
  );
}
