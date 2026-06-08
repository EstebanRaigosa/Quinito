# iOS Glass — Sistema de Diseño

Sistema de diseño del mockup `02-ios-glass` de la app Polla (quinielas del Mundial 2026), inspirado en las **Human Interface Guidelines (HIG) de Apple** y los materiales translúcidos (**glassmorphism**) introducidos en iOS 7 y perfeccionados en iOS 15+.

---

## Filosofía

**iOS Glass** replica la experiencia visual y táctil de una app nativa de iPhone. Las decisiones de diseño siguen tres principios de las HIG:

1. **Claridad.** La información es el elemento principal. Los materiales glass y los fondos con gradiente existen para dar profundidad, nunca para competir con el contenido. El texto siempre legible; los blur effects siempre complementan.
2. **Deferencia.** La interfaz se retira: bordes de 0.5px, separadores semitransparentes y superficies glass ayudan al usuario a centrarse en los datos del partido, no en la UI.
3. **Profundidad.** Las capas de material (thin → thick) comunican jerarquía. El nav bar está sobre el contenido (capa más alta), las cards están sobre el fondo (capa media), el fondo tiene su propio gradiente (capa base).

El glassmorphism no es decorativo: cada superficie glass tiene una función de jerarquía. La opacidad parcial revela el contexto detrás, reforzando la sensación de capas en lugar de pantallas planas.

---

## Paleta y roles de color

### Sistema de colores iOS

El sistema iOS distingue tres grupos: colores de acento (vivid), colores de label (texto semántico) y colores de fill/background. Cada grupo tiene variantes light y dark.

#### Colores de acento

| Token | Light | Dark | Rol |
|---|---|---|---|
| `--color-accent` | `#007AFF` | `#0A84FF` | Azul sistema — acciones primarias, links, segmented control activo, foco |
| `--color-accent-hover` | `#0066D6` | `#409CFF` | Estado hover del acento |
| `--color-accent-muted` | `rgba(0,122,255,0.12)` | `rgba(10,132,255,0.18)` | Fondos de badge azul, sidebar item activo |
| `--color-green` | `#34C759` | `#30D158` | Éxito, estado pagado, switch activo, predicciones correctas |
| `--color-red` | `#FF3B30` | `#FF453A` | Error, peligro, estado "en vivo", salir del grupo |
| `--color-orange` | `#FF9500` | `#FF9F0A` | Advertencias, estados intermedios |
| `--color-yellow` | `#FFCC00` | `#FFD60A` | Premio dorado (podio 1er lugar) |
| `--color-teal` | `#5AC8FA` | `#64D2FF` | Información, estados neutros |
| `--color-indigo` | `#5856D6` | `#5E5CE6` | Gradiente del logo/branding |
| `--color-purple` | `#AF52DE` | `#BF5AF2` | Acento secundario de identidad |
| `--color-pink` | `#FF2D55` | `#FF375F` | Alertas de alto impacto |

#### Colores de label (texto semántico)

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--color-label` | `#000000` | `#FFFFFF` | Texto principal — máximo contraste |
| `--color-label-secondary` | `rgba(60,60,67,0.60)` | `rgba(235,235,245,0.60)` | Subtítulos, valores secundarios |
| `--color-label-tertiary` | `rgba(60,60,67,0.30)` | `rgba(235,235,245,0.30)` | Placeholders de fase, overlines |
| `--color-label-quaternary` | `rgba(60,60,67,0.18)` | `rgba(235,235,245,0.18)` | Texto deshabilitado muy sutil |
| `--color-placeholder` | `rgba(60,60,67,0.30)` | `rgba(235,235,245,0.30)` | Placeholder de inputs |
| `--color-separator` | `rgba(60,60,67,0.29)` | `rgba(84,84,88,0.65)` | Líneas divisoras semitransparentes (0.5px) |
| `--color-separator-opaque` | `#C6C6C8` | `#38383A` | Separadores opacos (handle de sheet, checkbox) |

#### Fills (fondos interactivos)

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--color-fill` | `rgba(120,120,128,0.20)` | `rgba(120,120,128,0.36)` | Estado pressed, ios-stepper fondo |
| `--color-fill-secondary` | `rgba(120,120,128,0.16)` | `rgba(120,120,128,0.32)` | Segmented control fondo, stepper |
| `--color-fill-tertiary` | `rgba(118,118,128,0.12)` | `rgba(118,118,128,0.24)` | Sidebar hover, prediccion-form fondo |
| `--color-fill-quaternary` | `rgba(116,116,128,0.08)` | `rgba(116,116,128,0.18)` | Fills de menor jerarquía |

#### Backgrounds

| Token | Light | Dark | Uso |
|---|---|---|---|
| `--color-bg-primary` | `#FFFFFF` | `#000000` | Fondo base / sheet content |
| `--color-bg-secondary` | `#F2F2F7` | `#1C1C1E` | Fondo agrupado (Inset List) |
| `--color-bg-tertiary` | `#FFFFFF` | `#2C2C2E` | Fondo de cards internas |
| `--color-bg-grouped` | `#F2F2F7` | `#000000` | Equivalente al grouped table view |
| `--color-bg-grouped-secondary` | `#FFFFFF` | `#1C1C1E` | Fondo de sheet |

#### Gradiente de fondo

| Token | Light | Dark |
|---|---|---|
| `--bg-gradient` | `linear-gradient(160deg, #e8f5e9 0%, #f2f2f7 40%, #e3f2fd 100%)` | `linear-gradient(160deg, #0d1f0e 0%, #000000 40%, #0a1520 100%)` |

El gradiente evoca el verde del pasto (fase de grupos) y el azul del cielo nocturno del estadio (dark mode). Se aplica con `background-attachment: fixed` en el body para que no se mueva con el scroll.

---

## Materiales Glass

El sistema usa cuatro capas de material y tres filtros de blur, más cuatro tokens específicos para componentes de UI:

### Materiales base (opacidad del fondo)

| Token | Light | Dark | Uso típico |
|---|---|---|---|
| `--material-thin` | `rgba(255,255,255,0.60)` | `rgba(28,28,30,0.65)` | Overlays muy ligeros |
| `--material-regular` | `rgba(255,255,255,0.72)` | `rgba(28,28,30,0.78)` | Nav bar (usada en `--glass-nav-bg`) |
| `--material-thick` | `rgba(255,255,255,0.84)` | `rgba(28,28,30,0.88)` | Superficies de alto opaco |
| `--material-chrome` | `rgba(246,246,246,0.82)` | `rgba(24,24,26,0.85)` | Cromo / headers de sistema |

### Filtros de blur

| Token | Valor CSS | Uso |
|---|---|---|
| `--material-blur` | `blur(20px) saturate(180%)` | Nav bar, tab bar, sidebar, toasts |
| `--material-blur-heavy` | `blur(30px) saturate(200%)` | Overlays de alta jerarquía (sheet, modal) |
| `--material-blur-light` | `blur(12px) saturate(160%)` | Cards, inset-list groups |

### Tokens de componente

| Token | Light | Dark | Usado en |
|---|---|---|---|
| `--glass-nav-bg` | `rgba(242,242,247,0.72)` | `rgba(28,28,30,0.78)` | `.glass-navbar`, `.sidebar` |
| `--glass-tab-bg` | `rgba(242,242,247,0.80)` | `rgba(18,18,20,0.85)` | `.glass-tabbar` |
| `--glass-card-bg` | `rgba(255,255,255,0.68)` | `rgba(44,44,46,0.70)` | `.card`, `.inset-list__group`, inputs |
| `--glass-card-border` | `rgba(255,255,255,0.85)` | `rgba(255,255,255,0.08)` | Bordes de cards y grupos |

Siempre que uses `backdrop-filter`, incluye el prefijo `-webkit-backdrop-filter` para compatibilidad con Safari.

---

## Tipografía

La fuente principal es **SF Pro** a través de la font stack del sistema Apple:

```css
--font-system:  -apple-system, "SF Pro Text", "SF Pro Display", system-ui, "Inter", sans-serif;
--font-display: -apple-system, "SF Pro Display", system-ui, "Inter", sans-serif;
```

En dispositivos no-Apple (Chrome/Windows/Android), la carga de **Inter** desde Google Fonts actúa como fallback equivalente.

### Escala tipográfica iOS (Dynamic Type equivalente)

| Token | Tamaño | Line-height | Uso típico |
|---|---|---|---|
| `--fs-large-title` | 32px (2rem) | 38px | Large Title al inicio de pantallas sin scroll |
| `--fs-title1` | 28px (1.75rem) | 34px | Títulos de sección grandes, marcador de partido |
| `--fs-title2` | 22px (1.375rem) | 28px | Títulos de card, nombre de grupo |
| `--fs-title3` | 20px (1.25rem) | 25px | Subtítulos de pantalla, empty state title |
| `--fs-headline` | 17px (1.0625rem) | 22px | **Semibold** — títulos de celda, navbar title, btn large |
| `--fs-body` | 17px (1.0625rem) | 22px | Body principal, inputs, texto de párrafo |
| `--fs-callout` | 16px (1rem) | 21px | Sidebar items, botones estándar |
| `--fs-subhead` | 15px (0.9375rem) | 20px | Texto secundario en cards, dist-bar labels |
| `--fs-footnote` | 13px (0.8125rem) | 18px | Inset list header/footer, labels de input, hints |
| `--fs-caption1` | 12px (0.75rem) | 16px | Badges, fase de partido, fecha en tarjetas |
| `--fs-caption2` | 11px (0.6875rem) | 13px | Tab bar labels, elementos de menor jerarquía |

Clases utilitarias: `.font-headline`, `.font-body`, `.font-subhead`, `.font-footnote`, `.font-caption` aplican tamaño + line-height del nivel correspondiente.

El logo de la app usa `--font-display` a 3rem (48px) con peso 800 y gradiente `--color-accent → --color-indigo` como clip de texto.

---

## Radios de esquina (shape)

| Token | Valor | Uso |
|---|---|---|
| `--radius-xs` | 4px | Foco visible (`outline`), elementos mínimos |
| `--radius-sm` | 8px | Sidebar items, ios-stepper, ios-checkbox |
| `--radius-md` | 10px | Segmented control, ios-stepper, btn small |
| `--radius-lg` | 14px | Sidebar nav items activos |
| `--radius-xl` | 16px | Cards (`.card`), inputs (`.ios-field__input`), btn full width |
| `--radius-2xl` | 20px | Sheet (modal desde abajo, esquinas superiores) |
| `--radius-full` | 9999px | Botones, chips, badges, avatares, ios-switch, toast |

---

## Sombras

El sistema usa sombras suaves multicapa que escalan en superficie e intensidad. Las sombras en dark mode son significativamente más intensas (mayor opacidad) porque los fondos oscuros difuminan menos las sombras naturalmente.

| Token | Light | Dark |
|---|---|---|
| `--shadow-xs` | `0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)` | `0 1px 3px rgba(0,0,0,.30)` |
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,.10), 0 1px 3px rgba(0,0,0,.06)` | `0 2px 8px rgba(0,0,0,.40)` |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.08)` | `0 4px 16px rgba(0,0,0,.50)` |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,.16), 0 4px 12px rgba(0,0,0,.10)` | `0 8px 32px rgba(0,0,0,.60)` |
| `--shadow-xl` | `0 16px 48px rgba(0,0,0,.20), 0 8px 20px rgba(0,0,0,.12)` | `0 16px 48px rgba(0,0,0,.70)` |

Usos: `shadow-xs` en inset-list groups y cards base; `shadow-sm` en cards hover; `shadow-md` en cards presionadas y toasts; `shadow-lg` en toasts sobre contenido; `shadow-xl` reservado para sheets y modales.

---

## Spacing

Sistema basado en múltiplos de 4px, compatible con el grid de 8pt de Apple:

| Token | Valor |
|---|---|
| `--space-1` | 4px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |

Alturas fijas de barras del sistema:

| Token | Valor | Descripción |
|---|---|---|
| `--nav-height` | 44px | Altura de la navigation bar (inline, sin safe area) |
| `--tabbar-height` | 49px | Altura del tab bar (inline, sin safe area) |
| `--min-tap` | 44px | Tap target mínimo iOS HIG |

---

## Motion

| Token | Valor | Descripción |
|---|---|---|
| `--duration-fast` | 120ms | Feedback inmediato: pressed, hover |
| `--duration-normal` | 220ms | Transiciones estándar: segmented control, sidebar items |
| `--duration-slow` | 350ms | Animaciones de presentación: sheet entrada |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Rebote suave — botones (scale), segmented control activo, sheet entrada |
| `--ease-ios` | `cubic-bezier(0.4, 0, 0.2, 1)` | Curva iOS estándar — transiciones de color y opacidad |

El `ease-spring` produce un leve overshoot (supera el 100% de la escala antes de volver) que da la sensación táctil característica de iOS.

---

## Componentes documentados

### Glass Navbar (`.glass-navbar`)

Barra superior fija con `backdrop-filter: var(--material-blur)` y fondo `--glass-nav-bg`. Altura total: `--nav-height + env(safe-area-inset-top)`.

Sub-elementos:
- `.glass-navbar__inner`: contenedor flex de 44px.
- `.glass-navbar__title`: 17px semibold, centrado, texto truncado.
- `.glass-navbar__back`: botón de retroceso en azul acento, con label de texto (estilo iOS "< Volver"), `min-width/height: 44px`.
- `.glass-navbar__action`: botón de acción a la derecha, también en azul.
- `.large-title`: título grande (32px, peso 700) que aparece debajo de la navbar cuando el contenido no ha hecho scroll.

### Glass Tab Bar (`.glass-tabbar`)

Tab bar inferior fijo con glass material. Altura: `--tabbar-height + env(safe-area-inset-bottom)`. Padding top de 8px para empujar los ítems hacia arriba del safe area.

- `.glass-tabbar__items`: flex row con `justify-content: space-around`.
- `.glass-tabbar__item`: mínimo `--min-tap` de alto, label de 10px y SVG de 24px. Color inactivo: `--color-label-secondary`. Activo: `--color-accent`.

Oculto en ≥1024px (`display: none`).

### Sidebar desktop (`.sidebar`)

Aparece en ≥1024px como sidebar fijo de 280px con glass material (mismo fondo que navbar). El `.main-content` agrega `margin-left: 280px`.

- `.sidebar__logo`: área de marca con separador inferior.
- `.sidebar__nav`: lista de ítems con `gap: 2px`.
- `.sidebar__item`: ítem de navegación con `border-radius: --radius-lg`, hover con `--color-fill-tertiary`, activo con `--color-accent-muted` y texto `--color-accent`.
- `.sidebar__footer`: pie con separador superior para controles secundarios (toggle de tema, avatar).

### Inset List (`.inset-list`)

Equivale al `UITableView` grouped de iOS (estilo "Ajustes"). Estructura:

```
.inset-list
  .inset-list__section
    .inset-list__header        ← Label overline (footnote, uppercase)
    .inset-list__group         ← Card glass con backdrop-filter-light
      .inset-list__row         ← Celda con separador a 0.5px izquierdo-flush
        .inset-list__row-icon
        .inset-list__row-content
          .inset-list__row-title
          .inset-list__row-subtitle
        .inset-list__row-value
        .inset-list__chevron
    .inset-list__footer        ← Nota inferior en footnote
```

El separador entre celdas se implementa con `::after` posicionado en `left: --space-4` (flush derecho) para no llegar al borde del card, replicando el comportamiento de UITableView.

Modificador `.inset-list__row--no-action`: cursor default, sin feedback de press.

### Segmented Control (`.segmented-control`)

Equivale al `UISegmentedControl`. Fondo `--color-fill-secondary`, radio `--radius-md`, padding de 2px.

- `.segmented-control__option`: opción individual, flex-1, `min-height: 32px`.
- `.segmented-control__option.active`: fondo `--color-bg-primary` con sombra `0 1px 4px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.06)` y peso 600 — replica la apariencia del segment seleccionado nativo.

Variante `.segmented-control--scroll`: overflow-x auto para tabs con muchas opciones.

### iOS Switch (`.ios-switch`)

Replica el `UISwitch` nativo. Track de 51×31px con `--radius-full`. Thumb blanco de 27×27px con sombra `0 2px 6px rgba(0,0,0,0.25)`. Al activar: track pasa a `--color-green`, thumb se desplaza 20px con `--ease-spring`.

### Botones

| Clase | Fondo | Texto | Uso |
|---|---|---|---|
| `.btn--filled` | `--color-accent` | Blanco | CTA principal |
| `.btn--tonal` | `--color-accent-muted` | `--color-accent` | Acción secundaria suave |
| `.btn--outlined` | Transparente | `--color-accent` | Acción alternativa con borde 1.5px |
| `.btn--plain` | Transparente | `--color-accent` | Acción de texto (sin fondo) |
| `.btn--destructive` | `--color-red` | Blanco | Acciones irreversibles (salir del grupo) |

Modificadores de tamaño:
- `.btn--lg`: `min-height: 50px`, `--fs-headline`, padding horizontal `--space-6`.
- `.btn--sm`: `min-height: 32px`, `--fs-footnote`, `--radius-md`.
- `.btn--icon`: 44×44px, `--radius-full`.
- `.btn--full`: 100% ancho, `--radius-xl`.

Estado press en todos los botones: `transform: scale(0.97)` con `--ease-spring`. Disabled: `opacity: 0.38`, `transform: none`.

### Sheet (`.sheet-overlay` + `.sheet`)

Modal deslizante desde la parte inferior (iOS bottom sheet). El overlay usa `backdrop-filter: blur(4px)` para difuminar el contenido detrás.

- `.sheet`: `--radius-2xl` en esquinas superiores, `max-height: 85dvh`, scroll interno con `-webkit-overflow-scrolling: touch`.
- `.sheet__handle`: pastilla gris de 36×5px centrada en la parte superior del sheet (indicador de arrastre).
- Animación de entrada: `translateY(100%) → translateY(0)` con `--duration-slow` y `--ease-spring`.

### Cards (`.card`)

Superficie glass base: `--glass-card-bg`, `backdrop-filter: --material-blur-light`, borde 0.5px `--glass-card-border`, `--radius-xl`, `--shadow-sm`.

Modificador `.card--pressable`: `transform: scale(0.97)` al press con `--ease-spring`.

### Input Fields iOS (`.ios-field`)

```
.ios-field
  .ios-field__label     ← Footnote uppercase (como un section header)
  .ios-field__input     ← Glass card con focus ring
  .ios-field__error     ← Footnote rojo
  .ios-field__hint      ← Footnote secundario
```

El input glass tiene `border: 0.5px solid --color-separator` en reposo; al focus agrega `border-color: --color-accent` + `box-shadow: 0 0 0 3px --color-accent-muted`. Estado error con `border-color: --color-red` + ring rojo. `font-size: --fs-body` (17px = 1.0625rem ≥ 16px, previene zoom iOS).

### iOS Stepper (`.ios-stepper`)

Componente para ingresar goles. Fondo `--color-fill-secondary`, borde 0.5px `--color-separator`, `--radius-md`.

- `.ios-stepper__btn`: 40×36px, color `--color-accent`, press con fondo `--color-fill`.
- `.ios-stepper__value`: mínimo 36px de ancho, `--fs-headline` (17px semibold), con bordes laterales de 0.5px.

Modificador disabled en botón: `color: --color-label-quaternary`.

### Progress Steps wizard (`.progress-steps`)

Indicador de progreso de 3 pasos estilo iOS (puntos que crecen):

- Punto inactivo: 8×8px, `--color-fill`.
- Punto activo (`.active`): 24px de ancho (pill), `--color-accent`.
- Punto completado (`.done`): 8×8px, `--color-accent`, opacity 0.5.

La transición de ancho crea el efecto de "pill que se encoge/expande" con `--duration-normal --ease-ios`.

### Badges y Píldoras

| Clase | Fondo | Texto |
|---|---|---|
| `.badge--green` | `rgba(52,199,89,0.15)` | `--color-green` |
| `.badge--red` | `rgba(255,59,48,0.15)` | `--color-red` |
| `.badge--orange` | `rgba(255,149,0,0.15)` | `--color-orange` |
| `.badge--blue` | `--color-accent-muted` | `--color-accent` |
| `.badge--gray` | `--color-fill-secondary` | `--color-label-secondary` |
| `.badge--yellow` | `rgba(255,204,0,0.20)` | `#B8860B` (light) / `--color-yellow` (dark) |
| `.badge--points` | `--color-accent` | Blanco |

Altura 12px de font (caption1), peso 600, `--radius-full`.

### Avatar

Tamaños: `.avatar--sm` (28px, caption2), `.avatar` (36px, footnote), `.avatar--lg` (48px, subhead), `.avatar--xl` (64px, title3). Color de fondo asignado dinámicamente por JS. Texto en blanco, peso 700.

### Partido Card (`.partido-card`)

Estructura para tarjetas de partido:
- `.partido-card__header`: fase (caption1 uppercase) + fecha (caption1 tertiary).
- `.partido-card__match`: flex row con dos `.partido-card__equipo` y `.partido-card__vs` central.
- `.partido-card__bandera`: 36px.
- `.partido-card__nombre`: footnote, truncado.
- `.partido-card__marcador`: title1 (28px) bold, letter-spacing -1px.
- `.partido-card__estado`: caption1 bold con padding pill. Variante `--vivo`: rojo 15% alpha con animación `pulse-dot` (1.5s).

### Prediccion Form (`.prediccion-form`)

Contenedor de los steppers de goles. Fondo `--color-fill-tertiary`, `--radius-xl`, borde 0.5px `--color-separator`. Filas centradas con dos steppers y un separador ` — ` en medio.

### Barra de distribución (`.dist-bar`)

Track: `--color-fill-secondary`, 8px alto, `--radius-full`. Fill animado con `0.6s --ease-ios`.

Variantes de fill:
- `.dist-bar__fill--green`: `--color-green` (local gana)
- `.dist-bar__fill--red`: `--color-red` (visitante gana)
- `.dist-bar__fill--orange`: `--color-orange` (empate o tercera opción)
- Sin modificador: `--color-accent`

Label: subhead, secondary. Porcentaje: subhead, peso 600, 44px mínimo, alineado a la derecha.

### Toast (`.toast`)

Pastilla flotante centrada, `--radius-full`, `backdrop-filter: --material-blur`, fondo `rgba(50,50,52,0.92)`. Entra con `toast-in` (`translateY(16px) scale(0.92) → (0, 1)` en `--ease-spring`). Sale con `toast-out` con `opacity: 0`.

Variantes de icono: `.toast--success svg` verde, `.toast--error svg` rojo.

El `.toast-container` se posiciona a `--tabbar-height + safe-area-bottom + --space-4` sobre la tab bar.

### iOS Checkbox (`.ios-checkbox`)

Checkbox circular de 22×22px, borde 2px `--color-separator-opaque`. Al marcarse (`.checked`) y al estado indeterminate (`.indeterminate`): fondo `--color-accent`, SVG blanco de 13px. Transición con `--duration-fast`.

### Podio

`.podium__item--1 .podium__bar`: 64px, `rgba(255,204,0,0.25)` (dorado).
`.podium__item--2 .podium__bar`: 44px, `rgba(120,120,128,0.20)` (plateado).
`.podium__item--3 .podium__bar`: 32px, `rgba(180,120,60,0.20)` (bronce).

Los rangos del rank badge: oro `#FFD700` texto `#5a4200`, plata `#C0C0C0` texto `#333`, bronce `#CD7F32` texto blanco.

### Chip / Filtro (`.chip`)

Fondo `--color-fill-secondary`, texto `--color-label-secondary`, `--radius-full`. Activo (`.active`): fondo `--color-accent`, texto blanco. Press: `transform: scale(0.96)`.

### Separador con texto (`.divider-text`)

Líneas de 0.5px `--color-separator` a los lados, texto en subhead `--color-label-secondary`. Se usa en login para separar el botón de Google de los campos.

### Clases utilitarias de color y tipografía

```css
.text-label       /* --color-label */
.text-secondary   /* --color-label-secondary */
.text-tertiary    /* --color-label-tertiary */
.text-accent      /* --color-accent */
.text-green       /* --color-green */
.text-red         /* --color-red */
```

```css
.font-headline    /* 17px semibold */
.font-body        /* 17px regular */
.font-subhead     /* 15px regular */
.font-footnote    /* 13px regular */
.font-caption     /* 12px regular */
```

---

## Do / Don't

### DO
- Usa `backdrop-filter` siempre junto con `-webkit-backdrop-filter` — Safari (el navegador objetivo) requiere el prefijo.
- Usa `--glass-card-bg` con `--material-blur-light` para cards de contenido. Usa `--glass-nav-bg` con `--material-blur` para superficies de navegación — la jerarquía de blur importa.
- Mantén bordes de 0.5px (`border: 0.5px solid var(--color-separator)`) en superficies glass — el borde de 1px es demasiado pesado y rompe la ilusión de translucidez.
- Usa `--ease-spring` para interacciones táctiles directas (botones, sheets, segmented control). Usa `--ease-ios` para transiciones de estado y color.
- Asegura `font-size` mínimo de 16px en inputs para evitar el zoom automático de iOS Safari. `--fs-body` (17px) ya cumple este requisito.
- Aplica `padding-top: env(safe-area-inset-top)` en el navbar y `padding-bottom: env(safe-area-inset-bottom)` en el tab bar. Sin esto los elementos quedan bajo la Dynamic Island o el home indicator.
- Usa `100dvh` en lugar de `100vh` para que la altura se ajuste al viewport visible en iOS Safari.

### DON'T
- No uses `backdrop-filter` en elementos sin un fondo de color parcialmente opaco — sin el fondo, el blur no tiene efecto visible y puede degradar el rendimiento sin beneficio visual.
- No apliques `--material-blur-heavy` a cards de lista — ese nivel de blur está reservado para sheets modales que cubren pantalla completa.
- No pongas texto `--color-label` (negro puro) sobre un fondo glass oscuro en dark mode — el contraste se invierte. En dark, el texto principal es `--color-label` (blanco `#FFFFFF`) que sí contrasta con los fondos oscuros.
- No uses el tono `--color-yellow` para texto sobre fondo blanco en light mode — `#FFCC00` sobre `#FFFFFF` no pasa contraste AA. Solo úsalo en badges con fondo con opacidad del 20%.
- No uses `--color-red` para estados que no sean de error o peligro real — el rojo de iOS tiene una connotación fuerte (eliminar, salir, error) que no debe diluirse.
- No combines `--ease-spring` en transiciones de duración larga (≥350ms) — el rebote resulta exagerado y mareo en animaciones lentas.
- No pongas `position: sticky` en elementos dentro de un contenedor con `overflow: auto` en iOS Safari — puede fallar; usa `position: fixed` con el patrón de padding del `main-content` en su lugar.

---

## Accesibilidad

- **Contraste AA:** `--color-label` (`#000000`) sobre `--color-bg-primary` (`#FFFFFF`) da ratio 21:1. `--color-accent` (`#007AFF`) sobre `#FFFFFF` da ratio 4.55:1 — pasa AA. En dark mode, `--color-label` (`#FFFFFF`) sobre `--color-bg-primary` (`#000000`) da ratio 21:1. Verifica siempre el `--color-accent-muted` como fondo con texto de acento: puede no pasar AA en todos los contextos.
- **Foco visible:** `:focus-visible` global aplica `outline: 2px solid var(--color-accent)` con `outline-offset: 2px` y `border-radius: --radius-xs`. El azul de acento es visible sobre fondos tanto claros como oscuros.
- **Tap targets:** `--min-tap` de 44px garantizado en botones, ítems de sidebar, back button, action buttons de navbar, ios-stepper buttons y ios-checkbox. El tab bar alcanza el mínimo con el `padding-top: 8px` que da espacio vertical a los ítems.
- **Labels e ARIA:** todos los inputs tienen `<label>` asociado o `aria-label`. Los botones-icono tienen `aria-label`. Los toasts usan `aria-live="polite"` en su contenedor. El navbar tiene semántica de navegación.
- **iOS safe areas:** el `<meta viewport>` incluye `viewport-fit=cover`. El navbar, tab bar y sidebar respetan `env(safe-area-inset-top/bottom/left/right)`. El `main-content` tiene padding calculado dinámicamente.
- **Zoom de iOS:** todos los inputs usan `--fs-body` (17px / 1.0625rem) que supera el mínimo de 16px que evita el zoom automático al hacer focus en iOS Safari. Se agrega `-webkit-appearance: none; appearance: none` para desactivar el estilo nativo del input y aplicar el design system.
- **Motion:** el sistema actual no incluye guard de `prefers-reduced-motion`. Al extender el sistema, envuelve animaciones de entrada y rebote en `@media (prefers-reduced-motion: no-preference)` — las transiciones de color pueden mantenerse con duración reducida.
