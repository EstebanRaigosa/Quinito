# Material You — Sistema de Diseño

Sistema de diseño del mockup `01-material-you` de la app Polla (quinielas del Mundial 2026), implementado sobre la especificación **Material Design 3 (Material You)** de Google.

---

## Filosofía

**Material You** es un sistema de diseño adaptativo centrado en la expresión personal y la coherencia entre plataformas. En este mockup lo aplicamos a un contexto deportivo de alta legibilidad.

Tres principios que guían cada decisión:

1. **Semilla de color única.** Toda la paleta se deriva de un solo color semilla (verde-teal `#006B5E`), aplicando el algoritmo de paleta tonal de Material You. Esto garantiza coherencia cromática en light y dark sin excepciones manuales.
2. **Roles semánticos, no valores hardcodeados.** El código referencia tokens como `--md-primary` o `--md-on-surface`, nunca valores hexadecimales directos. Al cambiar el tema (light ↔ dark), todos los componentes responden automáticamente.
3. **Motion con intención.** Las curvas de movimiento "emphasized" y "standard" de MD3 transmiten física real: la deceleration enfatizada (`cubic-bezier(0.05, 0.7, 0.1, 1)`) crea la sensación de que los elementos "aterrizan" al llegar a su destino.

---

## Paleta y roles de color

La paleta se organiza en cuatro grupos de roles: primario, secundario, terciario y error. Cada rol tiene cuatro tokens: color base, color "on" (texto/icono sobre él), variante container y "on-container".

### Modo claro (semilla `#006B5E`)

| Token | Valor | Rol |
|---|---|---|
| `--md-primary` | `#006B5E` | Acciones primarias, CTAs, tabs activos |
| `--md-on-primary` | `#FFFFFF` | Texto/icono sobre primary |
| `--md-primary-container` | `#7EF8E2` | Fondos de chips, steppers, badges primarios |
| `--md-on-primary-container` | `#00201B` | Texto sobre primary-container |
| `--md-secondary` | `#4A6360` | Acciones secundarias |
| `--md-on-secondary` | `#FFFFFF` | Texto sobre secondary |
| `--md-secondary-container` | `#CCE8E4` | Nav indicator activo, chips seleccionados |
| `--md-on-secondary-container` | `#051F1D` | Texto sobre secondary-container |
| `--md-tertiary` | `#7E5700` | Acento dorado/cobre (torneos, premios) |
| `--md-on-tertiary` | `#FFFFFF` | Texto sobre tertiary |
| `--md-tertiary-container` | `#FFDEA8` | Badges warning, podio |
| `--md-on-tertiary-container` | `#281800` | Texto sobre tertiary-container |
| `--md-error` | `#BA1A1A` | Errores, validaciones fallidas |
| `--md-on-error` | `#FFFFFF` | Texto sobre error |
| `--md-error-container` | `#FFDAD6` | Fondo de mensajes de error |
| `--md-on-error-container` | `#410002` | Texto sobre error-container |

#### Superficies (light)

| Token | Valor | Uso |
|---|---|---|
| `--md-surface` | `#F4FBF9` | Fondo base de la app |
| `--md-on-surface` | `#161D1C` | Texto principal |
| `--md-surface-variant` | `#DBE5E2` | Superficies alternativas |
| `--md-on-surface-variant` | `#3F4947` | Texto de apoyo, labels |
| `--md-surface-container-lowest` | `#FFFFFF` | Superficies de menor jerarquía |
| `--md-surface-container-low` | `#EEF5F3` | Cards, login card, panel headers |
| `--md-surface-container` | `#E8EFED` | Nav bar, tab bar, match header |
| `--md-surface-container-high` | `#E2EAE7` | Dialog |
| `--md-surface-container-highest` | `#DCE4E2` | Text fields filled, chip tracks |
| `--md-outline` | `#6F7977` | Bordes de inputs y chips |
| `--md-outline-variant` | `#BFC9C6` | Separadores, bordes sutiles |
| `--md-background` | `#F4FBF9` | Fondo de página |
| `--md-inverse-surface` | `#2B3230` | Fondo del snackbar |
| `--md-inverse-on-surface` | `#EBF3F0` | Texto en el snackbar |
| `--md-inverse-primary` | `#60DBC6` | Acción en el snackbar |
| `--md-scrim` | `rgba(0,0,0,0.32)` | Overlay de dialog |

### Modo oscuro

| Token | Valor (dark) | Diferencia clave |
|---|---|---|
| `--md-primary` | `#60DBC6` | Invierte: el tono claro del teal pasa a ser primario |
| `--md-primary-container` | `#005045` | Container más oscuro |
| `--md-on-primary-container` | `#7EF8E2` | Texto claro sobre container oscuro |
| `--md-tertiary` | `#F9BA4A` | Dorado más saturado |
| `--md-surface` | `#0E1514` | Fondo muy oscuro |
| `--md-on-surface` | `#DCE4E2` | Texto claro |
| `--md-surface-container-lowest` | `#09100E` | Negro profundo |
| `--md-surface-container-low` | `#161D1C` | Cards en dark |
| `--md-surface-container` | `#1A2120` | Nav y tabs en dark |
| `--md-surface-container-highest` | `#2F3735` | Inputs en dark |
| `--md-outline` | `#899390` | Bordes más claros en dark |
| `--md-outline-variant` | `#3F4947` | Separadores en dark |
| `--md-background` | `#0E1514` | Fondo de página en dark |
| `--md-scrim` | `rgba(0,0,0,0.5)` | Overlay más opaco en dark |
| `--md-shadow` | `rgba(0,0,0,0.6)` | Sombras más pronunciadas |

### State layers

Los estados interactivos se implementan con pseudoelemento `::after` sobre el color actual del componente:

| Estado | Opacidad |
|---|---|
| Hover | `0.08` |
| Focus | `0.12` |
| Pressed | `0.12` |
| Dragged | `0.16` |

---

## Tipografía

Fuente principal: **Roboto** (Google Fonts), con `Inter` y `system-ui` como fallback.

```css
--font-family: 'Roboto', 'Inter', system-ui, sans-serif;
```

### Escala de tipo (type scale MD3)

La escala cubre cinco roles tipográficos, cada uno con tamaño, peso, line-height y letter-spacing definidos como tokens.

#### Display
| Token de tamaño | Valor | Peso | Line-height | Tracking |
|---|---|---|---|---|
| `--typescale-display-large-size` | 57px | 400 | 64px | -0.25px |
| `--typescale-display-medium-size` | 45px | 400 | 52px | 0px |
| `--typescale-display-small-size` | 36px | 400 | 44px | 0px |

#### Headline
| Token de tamaño | Valor | Peso | Line-height |
|---|---|---|---|
| `--typescale-headline-large-size` | 32px | 400 | 40px |
| `--typescale-headline-medium-size` | 28px | 400 | 36px |
| `--typescale-headline-small-size` | 24px | 400 | 32px |

Uso en la app: `headline-small` se usa para el marcador de predicción bloqueada (`pred-score-display`).

#### Title
| Token de tamaño | Valor | Peso | Tracking |
|---|---|---|---|
| `--typescale-title-large-size` | 22px | 400 | 0px |
| `--typescale-title-medium-size` | 16px | 500 | 0.15px |
| `--typescale-title-small-size` | 14px | 500 | 0.1px |

Uso: `title-large` en nombres de marca y código de invitación; `title-medium` en valores de reglas; `title-small` en tabs y section headings.

#### Body
| Token de tamaño | Valor | Peso | Tracking |
|---|---|---|---|
| `--typescale-body-large-size` | 16px | 400 | 0.5px |
| `--typescale-body-medium-size` | 14px | 400 | 0.25px |
| `--typescale-body-small-size` | 12px | 400 | 0.4px |

Importante: `body-large` es el tamaño mínimo para inputs en iOS (evita el zoom automático).

#### Label
| Token de tamaño | Valor | Peso | Tracking |
|---|---|---|---|
| `--typescale-label-large-size` | 14px | 500 | 0.1px |
| `--typescale-label-medium-size` | 12px | 500 | 0.5px |
| `--typescale-label-small-size` | 11px | 500 | 0.5px |

Uso: `label-large` en botones y labels de reglas; `label-medium` en nav bar; `label-small` en badges, overlines y phase-labels.

### Clases utilitarias

`components.css` expone una clase por cada nivel: `.type-display-large`, `.type-display-medium`, `.type-display-small`, `.type-headline-large` … `.type-label-small`. Cada clase aplica los cuatro tokens (size, weight, line-height, letter-spacing) del nivel correspondiente.

---

## Shape (forma de esquinas)

| Token | Valor | Uso típico |
|---|---|---|
| `--shape-none` | 0px | Sin radio |
| `--shape-xs` | 4px | Text fields filled (esquinas superiores), snackbar |
| `--shape-sm` | 8px | Stepper indicator, badge rows |
| `--shape-md` | 12px | Cards, match-card, nav rail items, config sections |
| `--shape-lg` | 16px | FAB estándar, nav indicator |
| `--shape-xl` | 28px | Login card, preview card, dialog, botón de código |
| `--shape-full` | 9999px | Botones, chips, badges, avatares, switches, invite-code |

Las clases utilitarias `.rounded-none` a `.rounded-full` mapean directamente a estos tokens.

---

## Elevación y sombras

MD3 define 6 niveles de elevación implementados como sombras CSS:

| Token | Sombra CSS | Uso |
|---|---|---|
| `--elevation-0` | none | Sin sombra (base) |
| `--elevation-1` | `0 1px 2px rgba(0,0,0,.3), 0 1px 3px 1px rgba(0,0,0,.15)` | Card hover, btn filled hover |
| `--elevation-2` | `0 1px 2px rgba(0,0,0,.3), 0 2px 6px 2px rgba(0,0,0,.15)` | Login card, preview card, top app bar scrolled |
| `--elevation-3` | `0 4px 8px 3px rgba(0,0,0,.15), 0 1px 3px rgba(0,0,0,.3)` | FAB, snackbar, dialog |
| `--elevation-4` | `0 6px 10px 4px rgba(0,0,0,.15), 0 2px 3px rgba(0,0,0,.3)` | FAB hover |
| `--elevation-5` | `0 8px 12px 6px rgba(0,0,0,.15), 0 4px 4px rgba(0,0,0,.3)` | Nivel máximo |

Las clases utilitarias `.shadow-0` a `.shadow-3` mapean a `--elevation-0` … `--elevation-3`.

Adicionalmente, cada nivel tiene un alpha de tinte tonal (`--tonal-tint-0` a `--tonal-tint-5`: 0% a 14%) para superficies donde la tinta del color primario se mezcla con la superficie al elevarla.

---

## Spacing

Sistema de espaciado basado en múltiplos de 4px:

| Token | Valor |
|---|---|
| `--spacing-1` | 4px |
| `--spacing-2` | 8px |
| `--spacing-3` | 12px |
| `--spacing-4` | 16px |
| `--spacing-5` | 20px |
| `--spacing-6` | 24px |
| `--spacing-8` | 32px |
| `--spacing-10` | 40px |
| `--spacing-12` | 48px |
| `--spacing-16` | 64px |

---

## Motion

MD3 define curvas de movimiento basadas en física, no en transformaciones lineales:

| Token | Curva | Uso |
|---|---|---|
| `--motion-easing-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Transiciones generales de color, opacidad |
| `--motion-easing-standard-accel` | `cubic-bezier(0.3, 0, 1, 1)` | Elementos que salen de pantalla |
| `--motion-easing-standard-decel` | `cubic-bezier(0, 0, 0, 1)` | Elementos que entran a pantalla |
| `--motion-easing-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | Transiciones de estado enfatizadas |
| `--motion-easing-emphasized-accel` | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Elementos que salen con énfasis |
| `--motion-easing-emphasized-decel` | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Elementos que aterrizan (snackbar, dialog, barras de distribución) |

Duraciones:

| Token | Valor | Uso |
|---|---|---|
| `--motion-duration-short1` | 50ms | State layers (hover/press instantáneo) |
| `--motion-duration-short2` | 100ms | Cambios de borde, color de input |
| `--motion-duration-medium1` | 200ms | Fade de tab content, snackbar, dialog scale |
| `--motion-duration-medium2` | 300ms | Cambio de tema body |
| `--motion-duration-long1` | 450ms | Barras de distribución (`dist-bar-fill`) |
| `--motion-duration-long2` | 500ms | Transiciones largas |

---

## Componentes documentados

### Botones

| Clase | Fondo | Color de texto | Uso |
|---|---|---|---|
| `.btn-filled` | `--md-primary` | `--md-on-primary` | CTA principal |
| `.btn-tonal` | `--md-secondary-container` | `--md-on-secondary-container` | Acción secundaria |
| `.btn-outlined` | Transparente | `--md-primary` | Acción alternativa con borde |
| `.btn-text` | Transparente | `--md-primary` | Acción de menor peso visual |
| `.btn-elevated` | `--md-surface-container-low` | `--md-primary` | Acción sobre superficie |
| `.btn-error` | `--md-error` | `--md-on-error` | Acciones destructivas |
| `.btn-google` | `--md-surface-container-low` | `--md-on-surface` | Autenticación con Google |

Estados en todos los botones: hover (state layer 8%), focus (12%), pressed (12%), disabled (opacity 0.38, pointer-events none). Foco visible: outline 3px `--md-primary`.

### FAB (Floating Action Button)

Tamaños: `.fab-sm` (40×40px, `--shape-md`), `.fab-md` (56×56px, `--shape-lg`), `.fab-lg` (96×96px, `--shape-xl`), `.fab-extended` (56px alto, padding horizontal).
Variantes: `.fab-primary` (primary-container) y `.fab-secondary` (secondary-container).

### Cards

| Clase | Fondo | Borde/Sombra |
|---|---|---|
| `.card-elevated` | `--md-surface-container-low` | `--elevation-1` (hover: `--elevation-2`) |
| `.card-filled` | `--md-surface-container-highest` | Sin borde ni sombra |
| `.card-outlined` | `--md-surface` | 1px `--md-outline-variant` |

Modificador `.card-clickable`: agrega state layer con `--md-on-surface` al hover/pressed.

### Chips

| Clase | Estado | Fondo / Borde |
|---|---|---|
| `.chip-filter` | Normal | Transparente, 1px `--md-outline` |
| `.chip-filter.chip-selected` | Seleccionado | `--md-secondary-container` |
| `.chip-assist` | — | `--md-surface-container-low`, 1px `--md-outline` |
| `.chip-suggestion` | — | `--md-surface-container-low`, 1px `--md-outline` |
| `.chip-input` | — | `--md-secondary-container` |

Altura fija de 32px, `--shape-sm`.

### Segmented Button

`.segmented-btn` como contenedor + `.segmented-btn-item` por opción. El ítem activo recibe `.active` y usa `--md-secondary-container`. Borde exterior `--shape-full`.

### Text Fields

Dos variantes:
- **Filled** (`.text-field-filled`): fondo `--md-surface-container-highest`, borde inferior animado (1px → 2px `--md-primary` al focus), label flotante.
- **Outlined** (`.text-field-outlined`): borde 1px `--md-outline` → 2px `--md-primary` al focus, label animado sobre el borde.

Ambas tienen soporte para `.tf-error` (borde y label en `--md-error`) y `.tf-supporting` para texto de ayuda.

**Number stepper** (`.number-stepper`): botones de 48×48px a los lados + input central con bordes laterales. Spinners nativos ocultos.

### Switch

`.switch` con `input` oculto, `.switch-track` y `.switch-thumb`. En checked: track `--md-primary`, thumb blanco desplazado a la derecha y agrandado (24px). Animación por `--motion-easing-emphasized`.

### Navigation Bar (mobile) y Navigation Rail (desktop)

- **Nav Bar** (`.nav-bar`): fijo en la parte inferior, 80px de alto + `env(safe-area-inset-bottom)`, visible en <1024px. Cada ítem (`.nav-bar-item`) tiene un indicador de 64×32px pill (`.nav-indicator`) que se rellena con `--md-secondary-container` cuando está activo.
- **Nav Rail** (`.nav-rail`): fijo en el lado izquierdo, 80px de ancho, visible en ≥1024px. Indicador de 56×32px.

Al activar el rail, el contenido principal agrega `margin-left: 80px` vía `.app-content`.

### Top App Bar

`.top-app-bar`: sticky en `top: 0`, 64px de alto, fondo `--md-surface-container`. Agrega `--elevation-2` cuando recibe `.scrolled`. Incluye `.top-app-bar-leading`, `.top-app-bar-title` y `.top-app-bar-trailing`.

### Tabs

`.tabs` como contenedor (sticky en `top: 64px`, scroll horizontal sin scrollbar). Cada `.tab` tiene 48px de alto. El tab activo recibe la clase `.active`: color `--md-primary` + borde inferior de 3px que escala desde `scaleX(0)` a `scaleX(1)`.

### Stepper (wizard)

`.stepper` con `.stepper-step` y `.step-indicator`. Estados del indicador:
- `.completed`: fondo `--md-primary`, texto `--md-on-primary`.
- `.active`: fondo `--md-primary-container`, ring de 2px `--md-primary`.
- `.pending`: fondo `--md-surface-container-highest`.

Las etiquetas (`.step-label`) solo son visibles en ≥480px.

### Badges

| Clase | Fondo | Texto |
|---|---|---|
| `.badge-primary` | `--md-primary-container` | `--md-on-primary-container` |
| `.badge-secondary` | `--md-secondary-container` | `--md-on-secondary-container` |
| `.badge-tertiary` | `--md-tertiary-container` | `--md-on-tertiary-container` |
| `.badge-error` | `--md-error-container` | `--md-on-error-container` |
| `.badge-success` | `#C8E6C9` / dark: `#1B5E20` | `#1B5E20` / dark: `#C8E6C9` |
| `.badge-activo` | `#DCEDC8` / dark: `#33691E` | `#33691E` / dark: `#DCEDC8` |
| `.badge-proximo` | `--md-secondary-container` | `--md-on-secondary-container` |
| `.badge-finalizado` | `--md-surface-container-highest` | `--md-on-surface-variant` |
| `.badge-en-vivo` | `#FFEBEE` / dark: `#B71C1C` | `#B71C1C` / dark: `#FFEBEE` |

El badge `en-vivo` tiene animación `pulse-live` (fade entre opacity 1 y 0.6, 1.5s).

### Avatar

Tamaños: `.avatar-sm` (32px), `.avatar` (40px), `.avatar-lg` (56px). Siempre circular (`--shape-full`). Color de fondo asignado dinámicamente por JS. Texto en blanco con peso 700.

### Snackbar (toast)

`.snackbar`: posicionado 80px + safe-area-bottom arriba del nav bar. Fondo `--md-inverse-surface`. Entra con `translateY(100px) → 0` usando `--motion-easing-emphasized-decel`. Clase `.show` lo hace visible. La acción usa color `--md-inverse-primary`.

### Barra de distribución (estadísticas)

`.distribution-bar` → `.dist-row` → `.dist-label` (64px fijo) + `.dist-bar-track` + `.dist-bar-fill` + `.dist-pct`.

Colores de fill:
- `.dist-bar-fill.local`: `--md-primary`
- `.dist-bar-fill.empate`: `--md-secondary`
- `.dist-bar-fill.visitante`: `--md-tertiary`

Animación de ancho con `--motion-duration-long1` + `--motion-easing-emphasized-decel`.

### Dialog / Modal

`.dialog-overlay` con scrim `--md-scrim`, centrado. `.dialog` con `--shape-xl` y `--elevation-3`. Aparece con `scale(0.9) → scale(1)` usando `--motion-easing-emphasized-decel`.

### Checkbox

`.checkbox-wrap` con `input[type="checkbox"]` nativo usando `accent-color: var(--md-primary)`. Tap target mínimo de 44px garantizado por `min-height`.

### Match Card

`.match-card` + `.match-header` + `.match-body` + `.match-footer`. Estructura estándar para todas las tarjetas de partido en "Mis Predicciones" y "Partidos".

### Leaderboard

`.lb-row` con `.lb-row.me` resaltando la fila del usuario (`color-mix` 10% de `--md-primary` sobre transparente). `.lb-pos` para el número de posición.

### Podio

`.podium` + `.podium-item` + `.podium-block`. Alturas: bloque-1 = 70px (gradiente dorado), bloque-2 = 50px (gradiente plateado), bloque-3 = 35px (gradiente bronce).

### Componentes de detalle

- `.pts-badge`: badge de puntos ganados por partido. `.pts-badge-0` (gris), `.pts-badge-pos` (primary-container), `.pts-badge-high` (tertiary-container).
- `.invite-code-box`: fondo `--md-primary-container`, código en Roboto Mono con letter-spacing 6px.
- `.prize-bar`: barra de gradiente `--md-primary → --md-tertiary`.
- `.live-dot`: punto rojo pulsante de 8×8px.
- `.panel` + `.panel-header` + `.panel-body`: agrupadores de sección en el detalle de predicción.
- `.danger-zone`: borde y fondo leve de `--md-error` para la zona de "salir del grupo".

---

## Do / Don't

### DO
- Usa siempre tokens (`--md-primary`, `--md-surface-container-low`) en lugar de valores hex hardcodeados — así el dark mode funciona sin sobrescrituras manuales.
- Mantén el contraste WCAG AA: texto sobre `--md-primary` debe ser `--md-on-primary`; texto sobre `--md-surface-container-low` debe ser `--md-on-surface`.
- Anima con `transform` y `opacity` (GPU-friendly). Las barras de distribución animan `width` de forma intencional con `--motion-duration-long1`.
- Usa `.btn-filled` para la acción principal de cada pantalla; no pongas dos `.btn-filled` seguidos en el mismo contexto.
- Asegura `font-size: 16px` mínimo en todos los inputs para evitar el zoom automático en iOS Safari.
- Respeta `prefers-reduced-motion`: envuelve las animaciones en `@media (prefers-reduced-motion: no-preference)` si son decorativas.
- Usa `--shape-full` para botones, chips, badges y avatares; `--shape-xl` para cards grandes; `--shape-md` para cards de lista.

### DON'T
- No uses valores de color del sistema de otra marca (colores de Material 2, iOS, etc.) junto con los tokens MD3 — la paleta fue generada con la misma semilla y es coherente internamente.
- No apliques `--elevation-3` o superior a elementos de lista inline — ese nivel está reservado para overlays y FABs.
- No mezcles el role `tertiary` (dorado) con `primary` (teal) en el mismo componente — se anulan visualmente.
- No uses `.badge-en-vivo` para estados que no sean en tiempo real — el pulso crea expectativa de actualización.
- No pongas más de 2 badges por tarjeta de partido.
- No hardcodees colores de estado de pago en la app shell; usa `.payment-pill.paid` / `.payment-pill.unpaid` que ya manejan dark mode.
- No uses el snackbar para mensajes de error persistentes — es para confirmaciones breves (3–5 segundos).

---

## Accesibilidad

- **Contraste AA:** todas las combinaciones token `--md-on-X` sobre `--md-X` cumplen WCAG 2.1 AA (mínimo 4.5:1 para texto, 3:1 para UI grande). El teal `#006B5E` sobre blanco da ratio ≈ 5.0:1.
- **Foco visible:** `:focus-visible` global aplica `outline: 3px solid var(--md-primary)` con `outline-offset: 2px` y `border-radius: --shape-xs`. No se suprime el foco con `outline: none` sin reemplazarlo.
- **Tap targets:** todos los botones tienen `min-height: 40px` y `min-width: 44px`. Los ítems de nav bar tienen `min-width: 44px`. El number-stepper usa botones de 48×48px. Los checkboxes tienen `min-height: 44px`.
- **Labels e ARIA:** todos los inputs tienen `<label>` asociado. Los botones-icono tienen `aria-label`. El nav principal usa `aria-label="Navegación principal"`. El snackbar usa `role="status"` y `aria-live="polite"`.
- **iOS safe areas:** padding con `env(safe-area-inset-bottom)` en nav bar, wizard actions y page content. El `<meta viewport>` incluye `viewport-fit=cover`.
- **Motion:** las animaciones se pueden reducir envolviendo en `@media (prefers-reduced-motion: no-preference)` — el sistema actual no tiene este guard por defecto en todas las animaciones; agrégalo al extender el sistema.
