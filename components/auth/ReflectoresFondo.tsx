import { cn } from "@/lib/utils";

/**
 * Fondo decorativo elaborado para el flujo de auth (detrás del recuadro).
 * Capas: mesh de luces verdes, haces de reflector, líneas de cancha, hexágonos
 * flotantes (guiño al balón), partículas bokeh, un barrido de luz, viñeta y
 * glow central que hace flotar el recuadro. Puramente decorativo; respeta
 * `prefers-reduced-motion`.
 */
export function ReflectoresFondo({ className }: { className?: string }) {
  // Partículas bokeh (deterministas; `d` = clase de delay literal para Tailwind).
  const particulas = [
    { x: 140, y: 180, r: 6, o: 0.5, b: true, d: "[animation-delay:0ms]" },
    { x: 320, y: 420, r: 3, o: 0.6, b: false, d: "[animation-delay:400ms]" },
    { x: 520, y: 120, r: 4, o: 0.45, b: true, d: "[animation-delay:800ms]" },
    { x: 760, y: 300, r: 5, o: 0.4, b: true, d: "[animation-delay:1200ms]" },
    { x: 980, y: 200, r: 3, o: 0.6, b: false, d: "[animation-delay:1600ms]" },
    { x: 1160, y: 380, r: 7, o: 0.35, b: true, d: "[animation-delay:600ms]" },
    { x: 1290, y: 150, r: 4, o: 0.5, b: false, d: "[animation-delay:1000ms]" },
    { x: 220, y: 640, r: 5, o: 0.4, b: true, d: "[animation-delay:1400ms]" },
    { x: 640, y: 720, r: 3, o: 0.55, b: false, d: "[animation-delay:200ms]" },
    { x: 1040, y: 660, r: 6, o: 0.4, b: true, d: "[animation-delay:1800ms]" },
    { x: 420, y: 540, r: 2.5, o: 0.6, b: false, d: "[animation-delay:900ms]" },
    { x: 880, y: 500, r: 3, o: 0.5, b: false, d: "[animation-delay:1300ms]" },
  ];

  // Hexágonos flotantes (guiño al balón).
  const hexagonos = [
    { x: 180, y: 300, s: 70, rot: 8, o: 0.1, d: "[animation-delay:0ms]" },
    { x: 1180, y: 250, s: 90, rot: -12, o: 0.09, d: "[animation-delay:1500ms]" },
    { x: 1080, y: 640, s: 56, rot: 18, o: 0.1, d: "[animation-delay:700ms]" },
    { x: 300, y: 600, s: 44, rot: -6, o: 0.12, d: "[animation-delay:2200ms]" },
  ];

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <radialGradient id="orbLime" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#6EE7B7" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orbVerde" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="orbGold" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FDE68A" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="haz" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>
          <filter id="blurXL" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="60" />
          </filter>
          <filter id="blurL" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="22" />
          </filter>
          <filter id="blurS">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* Mesh de luces verdes */}
        <g filter="url(#blurXL)">
          <circle cx="180" cy="120" r="320" fill="url(#orbLime)" />
          <circle cx="1280" cy="220" r="300" fill="url(#orbVerde)" />
          <circle cx="1180" cy="820" r="360" fill="url(#orbLime)" />
          <circle cx="240" cy="760" r="300" fill="url(#orbVerde)" />
          <circle cx="720" cy="80" r="240" fill="url(#orbGold)" />
        </g>

        {/* Haces de reflector desde arriba */}
        <g filter="url(#blurL)" opacity="0.5">
          <polygon points="300,-80 460,-80 640,560 60,560" fill="url(#haz)" />
          <polygon points="1100,-80 1260,-80 1420,600 800,600" fill="url(#haz)" />
          <polygon points="700,-80 780,-80 900,520 560,520" fill="url(#haz)" opacity="0.7" />
        </g>

        {/* Líneas de cancha (muy sutiles) */}
        <g stroke="#FFFFFF" strokeWidth="2" fill="none" opacity="0.06">
          <circle cx="720" cy="450" r="180" />
          <circle cx="720" cy="450" r="4" fill="#FFFFFF" stroke="none" />
          <path d="M0 450 H1440" />
          <path d="M-40 250 a260 200 0 0 1 0 400" />
          <path d="M1480 250 a260 200 0 0 0 0 400" />
        </g>

        {/* Hexágonos flotantes (guiño al balón) */}
        {hexagonos.map((h, i) => {
          const pts = Array.from({ length: 6 }, (_, k) => {
            const ang = (Math.PI / 3) * k - Math.PI / 2;
            return `${(h.x + h.s * Math.cos(ang)).toFixed(1)},${(h.y + h.s * Math.sin(ang)).toFixed(1)}`;
          }).join(" ");
          return (
            <polygon
              key={`hex-${i}`}
              points={pts}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              opacity={h.o}
              transform={`rotate(${h.rot} ${h.x} ${h.y})`}
              className={cn("animate-float motion-reduce:animate-none", h.d)}
            />
          );
        })}

        {/* Partículas bokeh */}
        <g fill="#ECFDF5">
          {particulas.map((p, i) => (
            <circle
              key={`p-${i}`}
              cx={p.x}
              cy={p.y}
              r={p.r}
              opacity={p.o}
              filter={p.b ? "url(#blurS)" : undefined}
              className={cn("animate-pulse motion-reduce:animate-none", p.d)}
            />
          ))}
        </g>
      </svg>

      {/* Barrido de luz tipo reflector */}
      <div className="absolute inset-y-0 -left-1/4 w-1/3 animate-shine bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl motion-reduce:hidden" />

      {/* Viñeta: oscurece bordes para resaltar el centro */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_38%,_rgba(5,46,22,0.66))]" />

      {/* Glow central: hace flotar el recuadro */}
      <span className="absolute left-1/2 top-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mustard-100/12 blur-[150px]" />
    </div>
  );
}
