# Handoff: Polla Design System v1.0

## Overview
Sistema de diseño completo para **Polla** — plataforma web/mobile de quinielas. Este paquete entrega los fundamentos visuales (color, tipografía, espaciado), 12+ componentes documentados con todos sus estados, y dos pantallas de ejemplo (formulario de creación y dashboard) en una paleta tierra cálida con acento dorado mostaza, modo claro y oscuro, y la fuente Mulish como única familia tipográfica.

## About the Design Files
Los archivos HTML/CSS de este bundle son **referencias de diseño** — prototipos que muestran la apariencia e interacciones objetivo, no código de producción para copiar tal cual. La tarea es **recrear estos diseños en el stack que vayas a usar** (React, Vue, SwiftUI, Flutter, etc.) siguiendo los patrones establecidos de tu codebase. Si aún no hay codebase, elige el framework más apropiado para el proyecto e implementa allí.

`tokens.css` y `components.css` SÍ son consumibles directamente como CSS si tu stack lo permite — funcionan como punto de partida. El HTML de documentación es sólo referencia.

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía, espaciado, radios, sombras y estados son finales. Recrea la UI pixel-perfect usando los componentes/librerías de tu codebase. Los tokens están listos para mapear a tu sistema (Tailwind config, MUI theme, NativeWind, design tokens en Swift, etc.).

## Estructura del bundle

```
design_handoff_polla/
├── README.md                  ← este archivo
├── tokens.css                 ← variables CSS (colores, type, spacing, radii, shadows, modos)
├── components.css             ← clases reutilizables de componentes
├── tokens.json                ← mismos tokens en JSON para usar en JS/Swift/cualquier lenguaje
├── Polla Design System.html   ← documentación visual (abrir en navegador)
└── INTEGRATION.md             ← guía de integración paso a paso
```

## Sistema · resumen

### Paleta
Cinco escalas tierra de 50–950 + cuatro semánticos:

| Escala | Rol | Token raíz |
|---|---|---|
| **Clay** | Tierra principal · superficies oscuras, texto | `--clay-*` |
| **Mustard** | Acción primaria · botones, focos, highlights | `--mustard-*` |
| **Sage** | Acento secundario · datos, success suave | `--sage-*` |
| **Sand** | Neutros cálidos · superficies app | `--sand-*` |
| **Stone** | Neutros UI más fríos · bordes | `--stone-*` |
| Rust / Bronze / Moss / Slate | Danger / Warning / Success / Info | semánticos |

Tokens semánticos como `--primary`, `--bg-app`, `--fg-default`, `--border-default` resuelven al modo activo (`[data-theme="light|dark"]`). **Nunca uses los crudos (`--clay-700`) en componentes** — usa siempre los semánticos.

### Tipografía
- Familia única: **Mulish** (Google Fonts), pesos 300–900
- Jerarquía por peso/tamaño, no por mezcla de fuentes
- Niveles: `display-1/2`, `h1–h6`, `lede`, `body`, `body-sm`, `caption`, `overline`
- Tracking negativo en titulares (`-0.015 a -0.03em`)
- `font-feature-settings: "ss01", "cv01", "cv02"`

### Espaciado · 4px base
`--space-1` (4) → `--space-24` (96). Pasos: 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24.

### Radios
xs 4 · sm 6 · **md 10** (default) · lg 14 · xl 20 · 2xl 28 · pill ∞

### Sombras
xs · sm · md · lg · xl — todas pigmentadas con `clay-950` en lugar de negro puro.

### Modos
- Light por default (`:root`)
- Dark via `[data-theme="dark"]` en `<html>`
- Toggle: `document.documentElement.dataset.theme = 'dark'|'light'`

## Componentes documentados

Cada uno incluye **default, hover, active, focus, disabled** + 3–5 variantes de tamaño + ejemplos de uso.

| Componente | Variantes |
|---|---|
| **Button** | primary, secondary, outline, ghost, soft, danger, danger-outline, link, icon-only · xs/sm/md/lg/xl |
| **Input** | text, textarea, select · default/hover/focus/error/disabled · sm/md/lg + input-group con prefix/suffix |
| **Checkbox / Radio / Toggle** | con choice-row label |
| **Card** | default, elevated, interactive, flat |
| **Badge** | default, primary, secondary, accent, success, warning, danger, info, outline, solid · sm/md/lg |
| **Avatar circular** | xs–xl + status dot + stack |
| **Avatar Notion (cuadrado)** | tints + sólidos + iconos + foto + picker emoji/color |
| **Personajes ilustrados** | 8 personajes SVG con peinados/accesorios/expresiones modulares |
| **Alert** | info, success, warning, danger inline |
| **Toast** | success, danger con acción |
| **Tabs** | underline + pill |
| **Breadcrumbs** | con separador chevron |
| **Sidebar nav** | con icono, contador y estado active |
| **Table** | con checkbox, avatar, badges, acciones por fila |
| **Modal** | con header, body, footer y backdrop blur |
| **Progress** | barra horizontal sm/md/lg + spinner |
| **Tooltip** | con flecha |
| **Iconografía** | Lucide-style 24×24, stroke 2px, round caps |

## Interacciones & comportamiento

- **Transiciones**: 120ms / 180ms / 280ms con `cubic-bezier(0.22, 0.61, 0.36, 1)`
- **Focus ring**: 3px sólido, color primario al 35% de opacidad (`--ring`); danger ring para inputs inválidos
- **Hover en cards interactive**: eleva sombra xs → md
- **Active**: `transform: translateY(0.5–1px)` en botones
- **Disabled**: `opacity 0.5`, `pointer-events: none`
- **Backdrop modal**: `rgba(20,16,10,0.5)` + `backdrop-filter: blur(4px)`

## Accesibilidad

- Contraste AA+ en todos los pares texto/fondo de tokens semánticos
- `:focus-visible` siempre con ring visible
- Labels asociados a inputs; `aria-invalid` para errores
- `aria-selected` en tabs, `aria-current="page"` en breadcrumbs
- Botones icon-only requieren `aria-label`
- Touch targets: hit target mínimo 32px (size sm), default 40px

## Estado / data en componentes

Componentes que requieren estado al implementarse:
- **Toggle / Checkbox / Radio**: controlled component, `checked` + `onChange`
- **Tabs**: índice activo + handler de cambio
- **Modal**: `isOpen` + `onClose`; bloqueo de scroll en body al abrir
- **Toast**: stack queue + auto-dismiss (5s default)
- **Tooltip**: visible on hover + focus, delay 300ms
- **Avatar picker**: emoji seleccionado + tint + tab activo
- **Form**: validación + errores por campo

## Pantallas de ejemplo

### 1. Crear quiniela (formulario)
- Card elevated, max-width 720px
- Badge "Paso 2 de 4" arriba
- H3 título + lede subtítulo
- Grid de 2 columnas con campos `field`
- Input-group para cuota con prefix `$` y suffix `MXN`
- Radios horizontales para visibilidad
- Toggle con label compuesto
- Footer con divisor + botones (back ghost, save outline, continue primary)

### 2. Dashboard
- Frame con browser bar
- Sidebar 240px con brand + nav + card flat con premio
- Content con header (título + breadcrumbs + acciones)
- Grid 3 columnas de stat cards (número grande + label + trend)
- Tabs underline
- Tabla con avatar, columnas numéricas, badges de tendencia, fila destacada con `--primary-soft`

## Tokens · referencia rápida

Ver `tokens.json` para el listado completo en formato consumible. Los más usados:

```css
/* Brand */
--primary: var(--mustard-400);          /* light */
--primary-fg: var(--clay-950);
--secondary: var(--clay-800);
--accent: var(--sage-500);

/* Surfaces */
--bg-app: var(--sand-50);
--bg-surface: #FFFDF8;
--bg-elevated: #FFFFFF;
--bg-sunken: var(--sand-100);

/* Text */
--fg-default: var(--clay-900);
--fg-muted: var(--stone-600);
--fg-on-primary: var(--clay-950);

/* Borders */
--border-subtle: var(--stone-200);
--border-default: var(--stone-300);

/* Focus */
--ring: 0 0 0 3px rgba(209, 168, 42, 0.35);
```

## Assets

- **Fuente**: Mulish, cargada desde Google Fonts (`https://fonts.googleapis.com/css2?family=Mulish:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap`)
- **Iconos**: estilo Lucide (24×24, stroke 2px, round caps). Se recomienda usar la librería [lucide.dev](https://lucide.dev) o [phosphoricons.com](https://phosphoricons.com) en código real
- **Personajes ilustrados**: 8 SVG inline generados programáticamente; ver función `buildCharacter()` en `Polla Design System.html` para replicar el generador
- **Fotos avatar (ejemplos)**: pravatar.cc — sustituir por tu CDN/storage en producción

## Próximos pasos sugeridos

1. Copiar `tokens.css` y `components.css` a tu proyecto, importarlos en el entry global
2. Mapear los tokens a tu sistema preferido (Tailwind theme extend, MUI palette, CSS-in-JS, NativeWind, etc.) — usa `tokens.json`
3. Implementar componentes base (Button, Input, Card) primero en tu framework
4. Validar contraste en pantallas reales con datos de producción
5. Definir convenciones de naming alineadas (ej. `Button` no `BtnPrimary`)

## Files

```
tokens.css                  → variables CSS, modos light/dark
components.css              → clases reutilizables
tokens.json                 → tokens en JSON
Polla Design System.html    → documentación visual interactiva
INTEGRATION.md              → guía de integración por framework
```
