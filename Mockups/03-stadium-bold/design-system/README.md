# Stadium Bold — Sistema de Diseño

## Filosofía

**Stadium Bold** es una identidad visual editorial deportiva / broadcast. Piensa en el tablero de anotaciones de un estadio, los gráficos de televisión de un partido internacional, o el álbum de cromos del Mundial. Alto contraste, energía de hincha, legible incluso desde las gradas.

Tres principios que nunca negociamos:

1. **Bold primero.** Todo lo importante es grande, pesado, en mayúsculas. Si algo merece atención, lo declamas; no lo susurras.
2. **Contraste AA siempre.** La vibración de la paleta no es excusa para sacrificar legibilidad. Cada combinación de texto/fondo cumple WCAG 2.1 AA (4.5:1 mínimo para texto, 3:1 para elementos UI grandes).
3. **Funcional > decorativo.** Los motivos visuales (diagonales, líneas de cancha, stickers) amplifican la información; no compiten con ella.

---

## Paleta y roles

### Base — "Noche de estadio"

| Token | Valor (dark) | Uso |
|---|---|---|
| `--bg-base` | `#050a0e` | Fondo principal de la app |
| `--bg-surface` | `#0a1520` | Tarjetas, paneles |
| `--bg-raised` | `#0f2035` | Superficies elevadas, tooltips |
| `--bg-muted` | `#1a3050` | Deshabilitados, inputs inactivos |

### Acentos

| Token | Color | Rol |
|---|---|---|
| `--accent-primary` / `--c-lime-400` | `#a3e635` | Acciones primarias, CTAs, links activos, datos importantes |
| `--accent-secondary` / `--c-magenta-400` | `#f43f5e` | Alertas, puntos negativos, peligro |
| `--accent-gold` / `--c-gold-400` | `#facc15` | Premios, podio, top 1 |
| `--accent-live` / `--c-live-400` | `#38bdf8` | Indicador EN VIVO, partidos en curso |
| `--c-lime-neon` | `#b4ff00` | Acentos especiales, sombras de brillo |

### Semánticos de texto

| Token | Valor dark | Uso |
|---|---|---|
| `--text-primary` | `#f0f7fc` | Texto principal |
| `--text-secondary` | `#8ab0cc` | Texto de apoyo |
| `--text-muted` | `#5a86a8` | Labels, placeholders, metadatos |
| `--text-accent` | `#a3e635` | Acentos de texto (lime) |
| `--text-danger` | `#f43f5e` | Errores, advertencias |
| `--text-live` | `#38bdf8` | Estado "en vivo" |

### Modo Light ("Día de partido")

Misma paleta, fondo claro (`#f0f5fa`, tarjetas blancas). Los acentos se oscurecen ligeramente para mantener contraste: lime → `#65a30d`, magenta → `#be123c`. Los scoreboard mantienen fondo oscuro (`#0a1828`) para preservar la identidad del marcador.

---

## Tipografía

### Display — Anton
- Fuente: **Anton** (Google Fonts)
- Uso: Titulares grandes, nombres de grupos, marcadores de goles, números de clasificación
- Estilo: MAYÚSCULAS, tracking ajustado (-0.02 a -0.025em), sin negrita adicional (Anton ya es bold por diseño)
- Ejemplo de uso: `.text-display`, `.scoreboard-score-num`, `.page-title`

### Subtítulos — Oswald
- Fuente: **Oswald** (Google Fonts), peso 600–700
- Uso: Labels de sección, tabs, botones, overlines, nombres de equipo
- Estilo: MAYÚSCULAS, tracking wide (0.05–0.2em)
- Ejemplo: `.font-heading`, `.tab-item`, `.btn`, `.form-label`

### Cuerpo — Inter
- Fuente: **Inter** (Google Fonts)
- Uso: Descripciones, párrafos, metadatos, hints
- Estilo: Regular/Medium, case normal
- Ejemplo: `.font-body`, descripciones de grupo, tooltips

### Escala de tipo

| Clase | Tamaño | Uso típico |
|---|---|---|
| `--text-xs` | 12px | Labels overline, hints, fechas |
| `--text-sm` | 14px | Cuerpo secundario, badges |
| `--text-base` | 16px | Cuerpo principal (mín. iOS inputs) |
| `--text-lg` | 18px | Subtítulos |
| `--text-xl` | 20px | Títulos secundarios |
| `--text-2xl` | 24px | Subtítulos de sección |
| `--text-3xl` | 30px | Títulos de pantalla |
| `--text-4xl` | 36px | Estadísticas grandes |
| `--text-scoreboard` | 80px | Números de marcador (scoreboard) |

---

## Motivos visuales

### Scoreboard Card (`.scoreboard`)
El componente estrella del sistema. Fondo ultra oscuro (`#0a1828`), líneas horizontales sutiles imitando el tablero de estadio, números Anton enormes para el marcador. Incluye:
- Triángulo de acento verde lima en esquina superior derecha (`.scoreboard-corner`)
- Header con estado del partido
- Body con equipos y marcador central
- Footer con información adicional

**No usar en contextos de fondo claro** — el scoreboard siempre tiene su propio fondo oscuro.

### Barras de distribución (`.stat-bar-*`)
Usadas en paneles de estadísticas. La barra del ganador local es verde lima, empate es gris, visitante es magenta. Cada barra anima su ancho al cargar (`transition: width 350ms ease-out`).

### Acento diagonal (`.card-accented::before`)
Franja de 4px en el borde izquierdo de cards, con gradiente verde lima. Herramienta visual para indicar jerarquía o estado activo de una tarjeta.

### Sticker badges (`.badge`)
Pequeños rótulos tipo pegatina con borde y fondo semi-transparente del color de estado. Texto en Oswald bold uppercase. Variantes: activo, en vivo, finalizado, próximo, admin, pagado, puntos.

### Líneas de cancha
Textura sutil en el fondo del scoreboard (`repeating-linear-gradient`) que evoca las líneas del campo. Solo visible en zonas muy oscuras; en fondos intermedios se diluye.

---

## Componentes

### Botones

| Clase | Fondo | Uso |
|---|---|---|
| `.btn-primary` | Gradiente lime | Acción principal (CTA) |
| `.btn-secondary` | Transparente, borde lime | Acción secundaria |
| `.btn-danger` | Transparente, borde magenta | Destrucción, salir |
| `.btn-ghost` | Transparente | Navegación, atrás |
| `.btn-google` | Superficie | Auth con Google |

Tamaños: `.btn-sm`, `.btn` (default), `.btn-lg`. Ancho completo: `.btn-full`.

**Estados obligatorios:**
- `:hover` → `translateY(-1px)` + sombra  
- `:active` → vuelve al plano  
- `:disabled` → `opacity: 0.45`, `pointer-events: none`  
- `:focus-visible` → outline 2px lime (global)

### Stepper de goles (`.goal-stepper`)
Compuesto por: botón menos, valor numérico (Anton), botón más. Tap targets de 44px mínimo. El valor se actualiza en DOM sin re-render completo de pantalla para mejor UX.

### Tabs (`.tabs` + `.tab-item`)
Scroll horizontal en mobile (sin scrollbar visible). Indicador de activo: borde inferior 2px lima. Oswald bold uppercase.

### Nav Bottom / Sidebar
- Mobile (<1024px): bottom nav fijo con 4 ítems, safe-area-inset-bottom
- Desktop (≥1024px): sidebar fijo 260px de ancho, con brand, ítems de nav, toggle de tema y avatar

---

## Do / Don't

### DO
- Usa Anton + mayúsculas para todo lo que sea un número o un resultado
- Mantén los fondos de cards oscuros (`--bg-surface`, `--bg-raised`) para preservar la "noche de estadio"
- Usa gradientes lime para acentos de energía positiva (goles, puntos, acciones)
- Asegura contraste AA en toda combinación de texto; comprueba con herramienta antes de aprobar
- Anima con `transform` y `opacity` (GPU-friendly); evita animar `width/height` excepto en barras de stat donde es intencional
- Inputs con `font-size: 16px` mínimo (previene zoom en iOS)
- Tap targets mínimo 44×44px

### DON'T
- No uses Anton en cuerpo de texto corrido — fatiga la lectura
- No combines el verde lima con el magenta en un mismo elemento (se anulan visualmente)
- No uses el scoreboard sobre fondos claros sin su propio `--grad-scoreboard`
- No uses gradientes en textos de cuerpo — solo en displays/acentos
- No pongas más de 2 badges por tarjeta
- No uses `color: var(--c-lime-neon)` en texto sobre fondo claro — el neon (#b4ff00) no pasa contraste AA sobre blanco
- No animes sin respetar `prefers-reduced-motion`
