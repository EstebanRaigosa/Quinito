# Compatibilidad móvil — iPhone/Safari + Android

Especificaciones técnicas para que una página web (especialmente PWA o app móvil-first)
funcione correctamente en **iOS Safari** sin romper **Android/Chrome**.

Documento generalizado a partir de lo aprendido en proyectos reales. Aplicable a cualquier
stack (Vue, React, Svelte, vanilla); los ejemplos usan CSS/JS estándar.

> **Regla de oro:** iOS Safari es el navegador más restrictivo y con más bugs propios.
> Si algo funciona en Safari, casi siempre funciona en Android. Diseña y prueba para
> Safari primero, valida que Android no se rompa.

---

## 0. Principios

1. **Safari primero.** El motor WebKit de iOS tiene comportamientos únicos (viewport,
   `position: fixed`, backdrop-filter, zoom de inputs) que no existen en Chrome.
2. **Detección por capacidad, no por user-agent**, salvo cuando WebKit obliga a una
   rama distinta. Para CSS, usa `@supports (-webkit-touch-callout: none)` como proxy
   fiable de "es Safari/iOS".
3. **Nunca uses reglas genéricas con `!important`** del tipo `opacity: 1 !important` o
   `display: block !important`: rompen transiciones y layouts flex.
4. **Prueba en dispositivo real**, no solo en el simulador. Muchos bugs de Safari
   (barra de direcciones dinámica, teclado, safe-area) solo aparecen en hardware.

---

## 1. Viewport y meta tags

En el `<head>`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0,
  maximum-scale=5.0, user-scalable=yes, viewport-fit=cover,
  shrink-to-fit=no, interactive-widget=resizes-visual" />

<!-- iOS PWA / standalone -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="mobile-web-app-capable" content="yes" />

<!-- Evita que iOS convierta números en enlaces de teléfono -->
<meta name="format-detection" content="telephone=no" />
```

Claves:
- **`viewport-fit=cover`** es obligatorio para que funcionen los `env(safe-area-inset-*)`.
- **`interactive-widget=resizes-visual`** mejora el manejo del teclado virtual.
- No bloquees el zoom del usuario (`user-scalable=no`) por accesibilidad; usa
  `maximum-scale=5.0`.

### 1.1 En Next.js (App Router): NO pongas estos meta en `<head>` a mano

En el App Router los meta tags de viewport y PWA se declaran con la **Metadata API**,
no con `<meta>` crudos en el `<head>` (se ignoran o se duplican):

```tsx
// app/layout.tsx
import type { Viewport, Metadata } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",            // habilita env(safe-area-inset-*)
  interactiveWidget: "resizes-visual", // manejo del teclado virtual
  colorScheme: "light dark",       // controles nativos coherentes en dark mode (§15)
  themeColor: [                    // color de la status bar / barra del notch en standalone
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#0b1f17" },
  ],
};

export const metadata: Metadata = {
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Polla" },
  formatDetection: { telephone: false },
};
```

- `interactiveWidget`, `colorScheme` y `viewportFit` **sí** son campos tipados de
  `Viewport`; úsalos así, no como `<meta>` crudo.
- `shrink-to-fit=no` no tiene campo tipado (y es legacy de iOS 9–10, normalmente
  innecesario hoy). Si de verdad lo necesitas, agrégalo vía un `<meta>` adicional.
- `themeColor` por esquema de color es lo que pinta la franja del notch / status bar en la
  PWA instalada; coordínalo con el modo oscuro (ver §15).

---

## 2. Altura real del viewport (el bug clásico de `100vh`)

Safari móvil **incluye la barra de direcciones** en `100vh`, así que `100vh` es más alto
que la pantalla visible y provoca cortes y scroll fantasma. Usa cascada de fallbacks:

```css
.full-screen {
  min-height: 100vh;                  /* fallback navegadores viejos */
  min-height: 100dvh;                 /* dynamic viewport height (moderno) */
  min-height: -webkit-fill-available; /* Safari iOS */
}
```

Unidades de viewport dinámico (usar según el caso):
- `dvh` — altura dinámica (se ajusta al mostrar/ocultar la barra). **Por defecto.**
- `svh` — altura pequeña (barra visible). Útil para garantizar que algo siempre se vea.
- `lvh` — altura grande (barra oculta).

Aplicar en: pantallas de carga, modales full-screen, layouts raíz, pantallas de auth,
landing, cualquier sección que ocupe toda la pantalla.

**Ojo con el teclado:** `dvh` **no** resuelve por sí solo el caso del teclado virtual
abierto en iOS (a veces lo incluye en el cálculo, a veces no, según versión). Para
pantallas con inputs (auth, formulario de predicción), no confíes solo en `dvh`: combina
con el manejo de `visualViewport` descrito en §4.1.

---

## 3. Safe-area insets (notch, Dynamic Island, home indicator)

Todo elemento pegado a un borde de pantalla debe respetar las zonas seguras:

```css
.bottom-nav  { padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px)); }
.header-fixo { padding-top:    env(safe-area-inset-top, 0px); }
.lateral     { padding-left:   env(safe-area-inset-left, 0px);
               padding-right:  env(safe-area-inset-right, 0px); }
```

Áreas típicas: barra de navegación inferior, footers de modales, headers sticky,
botones flotantes (FAB), pantallas de carga, toasts.

**Trampa con shorthands:** un `padding: 0 !important` (shorthand) sobrescribe los
longhands `padding-bottom: env(...)` que no lleven `!important`. Si combinas safe-area
con un shorthand, usa longhands con `!important`:

```css
padding-bottom: max(1rem, env(safe-area-inset-bottom)) !important;
```

---

## 4. Modales y overlays (la mayor fuente de bugs en iOS)

`position: fixed` dentro de un contenedor con `transform`, `filter` o `overflow` se
comporta mal en Safari: el elemento se recorta o se posiciona respecto al ancestro
equivocado.

**Patrón recomendado: un único componente `ModalWrapper` reutilizable** que:

- Renderiza el overlay **al nivel raíz** del DOM (teleport/portal a `<body>`), nunca
  anidado dentro de tarjetas con transform.
- Tiene una **rama específica para iOS** que aplica `position: fixed` + safe-area +
  scroll táctil sin depender de utilidades genéricas tipo `fixed inset-0`.
- Soporta `align="center" | "bottom"` (bottom-sheet en móvil).
- El contenedor de la tarjeta usa `display: flex; flex-direction: column` si tiene
  scroll interno, con el cuerpo scrolleable en el medio y acciones al final.
- Aplica scroll lock (ver §5).

Reglas concretas:
- **Nunca** crees `<div class="fixed inset-0 ...">` a mano para cada modal: centraliza.
- Footers de modal: `padding-bottom: max(1.25rem, env(safe-area-inset-bottom))`.
- Un único scroll por modal (cuerpo + acciones), evita pies fijos salvo excepción
  justificada.
- Habilita scroll táctil suave: `-webkit-overflow-scrolling: touch`.

### 4.1 Teclado virtual que tapa inputs (VisualViewport API)

En iOS el teclado **no redimensiona el layout**: flota encima y tapa el input enfocado y
el botón de submit. Es el bug típico de un formulario donde escribes y el botón "Guardar"
queda debajo del teclado (ej. el formulario de predicción de marcador).

El meta `interactive-widget=resizes-visual` (§1) ayuda pero no basta en iOS. Complementa
con JS usando `window.visualViewport`:

```js
// Al enfocar un input dentro de un modal o pantalla con teclado
input.addEventListener("focus", () => {
  // Espera a que el teclado termine de animar
  setTimeout(() => {
    input.scrollIntoView({ block: "center", behavior: "smooth" });
  }, 300);
});

// Opcional: ajustar un footer de acciones al alto del viewport visible
window.visualViewport?.addEventListener("resize", () => {
  const teclado = window.innerHeight - (window.visualViewport?.height ?? 0);
  document.documentElement.style.setProperty("--teclado-alto", `${teclado}px`);
});
```

- Coloca botones de acción importantes **sobre** el campo cuando sea posible, o usa
  `scrollIntoView` al enfocar.
- No fijes footers de submit al borde inferior con `position: fixed; bottom: 0` en
  pantallas con teclado: quedan tapados. Mejor dentro del flujo scrolleable.

**Modales centrados (Dialog) y teclado — IMPLEMENTADO.** Un modal centrado con
`top:50%` + `translateY(-50%)` se ancla al *layout viewport*, que el teclado no encoge
(`100dvh` tampoco): el teclado le tapa la mitad inferior. El `DialogContent`
(`components/ui/dialog.tsx`) usa el hook `useViewportModal` (`lib/hooks/useViewportModal.ts`),
que escucha `visualViewport` (`resize`/`scroll`) y reposiciona el modal al **centro del área
visible** (`top = offsetTop + height/2`) ajustando además su `max-height`, de modo que
queda **siempre por encima del teclado** con su contenido scrolleable. Degrada limpio: sin
teclado el cálculo coincide con el centrado original; sin `visualViewport`/SSR no aplica
estilos. **No revertir** a centrado puro por CSS en modales con inputs (OnboardingNombre,
EliminarGrupo).

---

## 5. Bloqueo de scroll del fondo (scroll lock)

Cuando un modal está abierto, el fondo no debe hacer scroll. **iOS y Android necesitan
estrategias distintas:**

```js
// Pseudocódigo de un composable/hook useBodyScrollLock(isOpen)
function lock() {
  if (isIOS) {
    // iOS: NO uses position:fixed en body (rompe elementos fixed internos)
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  } else {
    // Android/desktop: guarda scrollY y fija el body
    scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
  }
}
function unlock() { /* revierte estilos y restaura window.scrollTo(0, scrollY) */ }
```

Puntos críticos:
- En iOS **no fijes el `<body>` con `position: fixed`**: causa que Safari recorte
  elementos `position: fixed` que están dentro del flujo. Usa `overflow: hidden` +
  `touch-action: none`.
- Usa un **contador global** (`lockCount`) para soportar modales anidados: solo
  desbloquea cuando el último se cierra.
- Restaura la posición de scroll exacta al cerrar.

---

## 6. Touch, taps y botones

iOS tiene un delay histórico de 300ms y un área táctil mínima. Bajo
`@supports (-webkit-touch-callout: none)`:

```css
@supports (-webkit-touch-callout: none) {
  button, a, [role="button"] {
    touch-action: manipulation;              /* elimina el delay de 300ms */
    -webkit-tap-highlight-color: rgba(0,0,0,0); /* o un color de marca tenue */
    min-height: 44px;                        /* mínimo recomendado por Apple */
    min-width: 44px;
  }
  /* El tap debe ir al botón, no a sus hijos (íconos, spans) */
  button * , a * { pointer-events: none; }
}
```

- Área táctil **mínima 44×44 px**.
- Listeners `touchstart`/`touchmove` deben declararse `{ passive: true }` si **no**
  llaman a `preventDefault()` (mejora el rendimiento del scroll y evita warnings).
- Usa `preventDefault()` solo cuando realmente bloqueas el gesto.

---

## 7. Renderizado y composición GPU

A veces un elemento `position: fixed` simplemente **no aparece** en Safari hasta que
algo lo repinta. Fuerza una capa de composición:

```css
.forzar-render {
  -webkit-transform: translate3d(0, 0, 0);
  transform: translate3d(0, 0, 0);
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
}
```

- **NO** uses `opacity: 1 !important` ni `display: block !important` en reglas iOS
  genéricas: rompen transiciones de framework (Vue/React) y layouts flex.
- `will-change` con moderación: cada uso crea una capa de composición y consume memoria.

---

## 8. Backdrop-filter (blur) — caro en iOS

`backdrop-filter: blur()` es muy costoso en GPU móvil y causa lag/parpadeos en Safari.

```css
/* Default (Android/desktop): blur normal */
.panel { backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }

/* iOS: reducir o reemplazar por fondo sólido */
@supports (-webkit-touch-callout: none) {
  .panel {
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    background: rgba(20, 40, 30, 0.97) !important; /* opaco equivalente */
  }
}
```

Regla práctica: en iOS, máximo `blur(4px)`; en paneles grandes opacos, sustituir el
blur por un fondo sólido al 95–97% de opacidad.

---

## 9. Inputs y el zoom automático de iOS

iOS Safari hace **zoom automático** al enfocar cualquier input con `font-size < 16px`.
Esto descoloca el layout. Solución:

```css
@supports (-webkit-touch-callout: none) {
  input, textarea, select { font-size: 16px; }
}
```

- Mantén `font-size >= 16px` en **todos** los campos enfocables.
- **No apliques `appearance: none` a `<select>` de forma global:** rompe la flecha del
  picker nativo de iOS. Úsalo solo en selects con estilo custom completo.
- Para inputs numéricos usa `inputmode` (`numeric`, `decimal`, `tel`) en vez de
  `type="number"` cuando quieras teclado adecuado sin spinners. Para marcadores de
  partido, `inputmode="numeric"` + `pattern="[0-9]*"` da el teclado correcto sin spinners.
- Evita `autocomplete="off"` indiscriminado; iOS lo ignora y rompe autofill útil.
- Usa `enterkeyhint` (`"next"`, `"done"`, `"send"`) para etiquetar la tecla de retorno del
  teclado en formularios de varios campos.

**Autofill amarillo (rompe el dark mode):** iOS/WebKit pinta un fondo amarillo al
autocompletar. No es estilizable directamente; el truco es:

```css
input:-webkit-autofill,
input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--color-texto);
  transition: background-color 9999s ease-in-out 0s; /* oculta el amarillo */
}
```

**Inputs `disabled` ilegibles:** Safari los pinta muy lavados. Importante porque el
formulario de predicción se deshabilita cuando el partido aún no tiene equipos
(placeholders como `'2A'`): debe seguir siendo legible.

```css
input:disabled, textarea:disabled, select:disabled {
  opacity: 1;                               /* iOS baja la opacidad por defecto */
  -webkit-text-fill-color: var(--color-texto-tenue);
}
```

---

## 10. Animaciones

```css
/* Respeta la preferencia del usuario */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- En keyframes con movimiento, usa `translate3d(0,0,0)` en inicio y fin para GPU, y
  añade prefijos `-webkit-` en transform/keyframes.
- Animaciones 3D (`transform-style: preserve-3d`): simplifica a `flat` en iOS si dan
  problemas de z-index/flicker.

---

## 11. Overscroll y pull-to-refresh

```css
@supports (-webkit-touch-callout: none) {
  body { overscroll-behavior-y: contain; } /* evita el "rebote" y pull-to-refresh */
}
```

En overlays fijos que deben bloquear el fondo, intercepta el scroll del touch:

```html
<div @touchmove.stop.prevent> ... overlay ... </div>
```

---

## 12. Otros detalles de WebKit a vigilar

- **`100%` de altura en cadena:** para que `height: 100%` funcione, todos los ancestros
  (`html`, `body`, contenedor raíz) deben tener altura definida. En móvil-first es más
  robusto usar flex + `min-height: 100dvh` en la raíz.
- **`gap` en flex:** soportado en Safari moderno; si target incluye iOS < 14.1, usar
  márgenes como fallback.
- **`:active` no se dispara** en iOS salvo que el elemento (o `body`) tenga un handler
  táctil; añade `cursor: pointer` o un listener vacío si necesitas estilos `:active`.
- **Sticky headers:** `position: sticky` funciona, pero falla dentro de contenedores con
  `overflow` distinto de `visible` o con `transform`.
- **Fechas:** Safari es estricto parseando. `new Date("2024-01-01 15:00")` (con espacio)
  o formatos no-ISO dan `Invalid Date`. Usa ISO completo con `T` y zona (`2024-01-01T15:00:00Z`)
  o una librería. Para mostrar, fuerza **siempre** `America/Bogota` con
  `Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota' })` o `date-fns-tz` (regla 3.5
  del proyecto). Cuentas regresivas ("cierra en 2h") con diffs de `Date.now()`, nunca con
  parsing frágil de strings.
- **`<img>` y `object-fit`:** ok, pero `loading="lazy"` solo está activo por defecto desde
  **Safari 16.4+** (antes, tras flag); degrada elegante (carga igual, sin diferir).
- **Fuentes:** define `font-display: swap` para evitar texto invisible (FOIT) en iOS.

---

## 13. PWA en iOS (los requisitos que Safari no comparte con Android)

iOS no respeta el `manifest.json` igual que Chrome. Para una PWA instalable y sin pantalla
blanca hay que añadir cosas específicas de Apple:

- **`apple-touch-icon` (obligatorio):** iOS **ignora los iconos del `manifest.json`** para
  la pantalla de inicio. Necesitas un PNG de 180×180:
  ```html
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  ```
  En Next.js basta con poner `apple-icon.png` en `app/` y el framework genera el `<link>`.
- **Splash screens (`apple-touch-startup-image`):** sin ellas, al abrir la PWA instalada se
  ve pantalla **blanca** mientras carga. Requieren un `<link>` por resolución de iPhone con
  su media query. Genéralas con `pwa-asset-generator` (son muchas para mantener a mano).
- **Web Push:** en iOS solo funciona desde **16.4+** y **únicamente con la PWA agregada a
  la pantalla de inicio** (no en Safari normal). Si se usa para avisar "cierra el partido
  en 1h" o "ya hay resultado", diseña el fallback (correo / in-app) para quien no la instaló.
- **Detección de standalone:** `window.navigator.standalone === true` (propiedad solo-iOS)
  o `window.matchMedia('(display-mode: standalone)').matches`. Útil para mostrar el banner
  "Agrega Polla a tu inicio" solo cuando corre en Safari y no instalada.
- **`statusBarStyle`:** `default` / `black` / `black-translucent`. Con `black-translucent`
  el contenido sube bajo la status bar y **dependes 100% de safe-area** (§3).

---

## 14. Auth, cookies y storage en Safari (ITP) — el punto más frágil con Supabase

Safari tiene **Intelligent Tracking Prevention (ITP)**, muy agresivo con cookies y storage.
Esto afecta directamente al login con Supabase:

- **OAuth (Google, etc.) en PWA standalone:** el redirect **abre Safari y pierde el
  contexto** de la app instalada; el usuario vuelve sin sesión o no vuelve. Es el bug #1 de
  PWAs con login social en iOS. **Pruébalo explícitamente**; si rompe, ofrece **magic link /
  OTP por correo** como alternativa en iOS.
- **Persistencia de sesión:** usa el flujo **PKCE** y maneja la sesión con cookies
  server-side (`@supabase/ssr`), no solo `localStorage`.
- **Borrado a los 7 días (ITP):** Safari puede **borrar `localStorage`/IndexedDB** de sitios
  sin interacción reciente. Si la sesión vive solo en `localStorage`, el usuario que no
  abre la app en una semana pierde sesión. Las cookies httpOnly server-side lo mitigan.
- **`redirectTo`:** usa `NEXT_PUBLIC_SITE_URL`, **no** `window.location.origin` en
  standalone (puede resolver a un origen inesperado).
- **Cookies de terceros bloqueadas:** no asumas que un iframe o subdominio distinto
  comparte sesión.

> Esta sección es transversal a seguridad: combínala con las reglas RLS y de privacidad de
> predicciones del proyecto (CLAUDE.md §3.4). Un fallo de sesión en iOS no debe degradar a
> un estado donde se filtren datos.

---

## 15. Modo oscuro

- Declara `color-scheme: light dark` para que inputs, scrollbars y controles **nativos** de
  iOS se rendericen acorde y no se vean rotos. En Next.js usa el campo `colorScheme` del
  `viewport` (§1.1); en CSS plano, `:root { color-scheme: light dark; }`.
- Coordina `themeColor` por esquema (§1.1) para la franja del notch / status bar.
- Prueba el autofill en oscuro (§9): el fondo amarillo de WebKit destroza el contraste.

---

## 16. Subida de imágenes desde iPhone (HEIC)

Si hay avatares o foto de grupo: la cámara del iPhone entrega **`.heic`/`.heif`**, que el
navegador no muestra en `<img>` y muchos backends no procesan.

- Restringe con `accept="image/jpeg,image/png,image/webp"` (iOS suele convertir a JPEG al
  elegir desde "Fotos", pero no siempre desde "Archivos").
- O convierte en cliente con Canvas / `heic2any` antes de subir.
- `<input type="file" accept="image/*" capture="environment">` abre cámara directa; sin
  `capture`, deja elegir de la galería.
- Valida tipo MIME **en el servidor** además del `accept` (el `accept` es solo UX).

---

## 17. Oportunidades nativas y debugging

- **Web Share API** (`navigator.share`): excelente soporte en iOS. Ideal para compartir el
  **código de invitación** de un grupo. Detecta con `if (navigator.share)` y deja fallback
  a copiar al portapapeles (`navigator.clipboard.writeText`).
- **`aspect-ratio`:** soportado desde **Safari 15**, sin problema para el target del
  proyecto (iOS 15+, CLAUDE.md §3.3).
- **`:has()`:** llegó en **Safari 15.4**; **no existe en iOS 15.0–15.3**. En la práctica la
  mayoría de dispositivos iOS 15 están en 15.4+, pero si tu piso real incluye 15.0–15.3, no
  lo uses como única vía de layout sin fallback.
- **Remote debugging real:** Safari de macOS → menú *Develop* → *[tu iPhone]* → inspecciona
  la página/PWA en el dispositivo. Sin Mac: BrowserStack / LambdaTest. Es la única forma de
  cazar los bugs que no aparecen en simulador.

---

## Checklist antes de dar por terminado un cambio

- [ ] ¿Las alturas full-screen usan `dvh` / `-webkit-fill-available` con fallback `vh`?
- [ ] ¿Los bordes pegados a pantalla respetan `env(safe-area-inset-*)`?
- [ ] ¿`viewport-fit=cover` está en el meta viewport?
- [ ] ¿Los modales usan el wrapper centralizado con rama iOS? Si no, ¿hay justificación y
      se aplicaron las reglas manualmente (fixed correcto, safe-area, scroll táctil)?
- [ ] ¿El scroll lock usa la estrategia correcta por plataforma (iOS sin `position:fixed`
      en body)?
- [ ] ¿Todos los inputs/selects tienen `font-size >= 16px`?
- [ ] ¿Los botones tienen mínimo 44×44 px de área táctil y `touch-action: manipulation`?
- [ ] ¿Los listeners touch que no usan `preventDefault` son `passive`?
- [ ] ¿El `backdrop-filter` tiene fallback sólido para iOS?
- [ ] ¿Sin `opacity: 1 !important` ni `display: block !important` en CSS genérico?
- [ ] ¿`prefers-reduced-motion` respetado?
- [ ] (Next.js) ¿Viewport/PWA declarados con la **Metadata API**, no con `<meta>` a mano?
- [ ] ¿Inputs visibles con el **teclado abierto** (VisualViewport / `scrollIntoView`)?
- [ ] ¿Autofill e inputs `disabled` legibles en claro **y** oscuro?
- [ ] (PWA) ¿`apple-touch-icon` y splash screens presentes (sin pantalla blanca)?
- [ ] (Auth) ¿Login con Supabase probado en **PWA standalone** de iOS (OAuth/magic link)?
- [ ] ¿La sesión sobrevive sin depender solo de `localStorage` (cookies SSR / PKCE)?
- [ ] ¿Subida de imágenes maneja **HEIC** del iPhone?
- [ ] ¿`color-scheme` declarado para controles nativos en dark mode?
- [ ] ¿Fechas en ISO completo y mostradas en `America/Bogota`?
- [ ] ¿Probado en iPhone real (no solo simulador) **y** en Android sin regresiones?

---

## Resumen de bugs WebKit más costosos (orden de prioridad)

| # | Bug | Síntoma | Fix |
|---|-----|---------|-----|
| 1 | `100vh` incluye barra direcciones | Corte inferior, scroll fantasma | `100dvh` + `-webkit-fill-available` |
| 2 | `position: fixed` recortado en modales | Modal invisible o mal posicionado | Wrapper con teleport + rama iOS |
| 3 | Scroll lock con `position:fixed` en body | Elementos fixed recortados | iOS: `overflow:hidden` + `touch-action:none` |
| 4 | Zoom al enfocar input | Layout descolocado | `font-size: 16px` en campos |
| 5 | Safe-area ignorada | Contenido bajo notch/home indicator | `viewport-fit=cover` + `env(safe-area-*)` |
| 6 | `backdrop-filter` lag | Parpadeo, baja FPS | Reducir blur o fondo sólido en iOS |
| 7 | Delay de 300ms en tap | Botones "lentos" | `touch-action: manipulation` |
| 8 | OAuth en PWA standalone | Vuelve sin sesión / no vuelve | PKCE + cookies SSR; magic link fallback |
| 9 | ITP borra storage a 7 días | Sesión perdida | Cookies httpOnly server-side, no solo `localStorage` |
| 10 | Teclado tapa input/submit | Botón "Guardar" inalcanzable | VisualViewport + `scrollIntoView` |
| 11 | PWA sin `apple-touch-icon` | Pantalla blanca / icono feo | `apple-touch-icon` + splash screens |
| 12 | Cámara iPhone sube HEIC | Imagen no se muestra/procesa | Convertir o `accept` restringido |

---

## Estado implementado — NO ROMPER (registro de invariantes)

> Resultado de la auditoría profunda iOS/Safari + Android (jun 2026). Esto **ya
> está implementado y verificado**. Antes de "simplificar" o refactorizar
> cualquiera de estos puntos, entendé por qué está así: revertirlo reintroduce
> un bug real de iPhone/Android. Si de verdad hay que cambiarlo, actualizá
> también este registro.

### Fundaciones globales
- **`app/globals.css` tiene un bloque `@supports (-webkit-touch-callout: none)`** (proxy de iOS) con: `touch-action: manipulation` + `button *,a * { pointer-events:none }` (§6, mata el delay de 300 ms y hace que el tap caiga en el botón), `overscroll-behavior-y: contain` (§11) y **anulación de `backdrop-filter`** en `.backdrop-blur*` (§8 — los fondos translúcidos ya usan opacidad alta `/95`). **No re-habilitar blur en iOS.**
- **`input/textarea/select:disabled { opacity:1; -webkit-text-fill-color: var(--fg-muted) }`** (§9). Por eso los primitivos `Input`/`Textarea` usan `disabled:bg-muted` y **NO** `disabled:opacity-*` (la capa utilities pisa la regla base y deja el input ilegible en iOS). Lo mismo el `<select>` de admin.
- **Cascada de altura**: `body`/`.min-h-dvh`/`.h-dvh` = `100vh → 100dvh → -webkit-fill-available`. Utilidad `.scroll-touch` (`-webkit-overflow-scrolling:touch`) en contenedores con overflow.
- **`prefers-reduced-motion`** resetea `animation-duration`, `transition-duration`, `animation-delay` e `iteration-count` (si no, las entradas escalonadas dejan contenido invisible su delay completo).
- **Keyframes** (`tailwind.config.ts`) usan `translate3d`/`scale3d` (GPU iOS).
- **Inputs ≥16px** global (sin zoom). Autofill neutralizado en dark.

### Viewport / PWA (`app/layout.tsx`, `app/manifest.ts`, `app/sw.ts`)
- `viewport`: `viewportFit:"cover"`, `interactiveWidget:"resizes-visual"`, `maximumScale:5`, `userScalable:true`, `colorScheme:"light dark"`, `themeColor` por esquema. Todo por Metadata API (no `<meta>` crudos).
- `formatDetection: { telephone,date,email,address: false }` — **crítico**: sin esto iOS convierte marcadores ("2-1") y códigos en enlaces y rompe la hidratación.
- `apple-icon.png` (180) + **12 splash screens** (`AppleSplashLinks.tsx` + `public/splash/`) → sin pantalla blanca al abrir la PWA instalada. `manifest`: `start_url:"/"` (no `/dashboard`, protegida), íconos PNG 192/512/maskable.
- **`app/sw.ts`: runtimeCaching CURADO, NUNCA `defaultCache`.** Solo cachea estáticos inmutables (fuentes, `_next/static`, imágenes). Navegaciones/RSC/datos van **siempre a la red** → no cachea predicciones nominales (PII, regla de oro §3.4). **No volver a `defaultCache`.**
- `BotonInstalarPWA`: detección de standalone por `display-mode` + `navigator.standalone`; no depende de `beforeinstallprompt` en iOS.

### Layout móvil
- **Footers de formularios full-screen** (wizard, editar reglas) van `sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] md:bottom-auto` para **no quedar tapados por el `BottomNav` fijo** (`z-[200]`). El `main` reserva `pb-[calc(4.25rem+env(safe-area-inset-bottom))]`.
- **Elementos `sticky` superiores** (tabs de grupo, encabezados de fecha) van `top-[calc(3.5rem+env(safe-area-inset-top))] md:top-0` — el header móvil es `h-14 + pt-safe`. Usar `top-14` los mete bajo el notch.
- **Contenido scrolleable interno de Sheets**: `pb-[max(2rem,env(safe-area-inset-bottom))]` (no `pb-8` fijo) para respetar el home indicator.
- **Sticky NUNCA dentro de un ancestro con `transform`** (incluye `animate-*` con `transform`): rompe el sticky en iOS. Patrón: animar un wrapper interno, no el ancestro del sticky.
- **Tap targets ≥44px**: botones cerrar de Dialog/Sheet (`size-11`), toggles de contraseña, tabs (`h-11 sm:h-10` + trigger `h-full`), `ThemeToggle` (`min-h-11`), checkbox "seleccionar fase" (envuelto en `<label>` de 44px). `PageContainer` usa `pl/pr-[max(1rem,env(safe-area-inset-*))]` (landscape con notch).
- **Modales centrados sobre el teclado**: `DialogContent` (`components/ui/dialog.tsx`) usa `useViewportModal` (`lib/hooks/useViewportModal.ts`) para reposicionarse al centro del `visualViewport` cuando sube el teclado (queda **encima**, no tapado). Ver §4.1. **No revertir** a centrado puro CSS en modales con inputs.

### Datos / runtime
- **Cuenta regresiva = `components/shared/CuentaRegresiva.tsx`** (cliente): late cada segundo y **re-sincroniza en `pageshow`/`visibilitychange`** (iOS congela timers en background). Recibe `ahoraInicial` del server para no romper hidratación. **No volver a renderizar countdowns estáticos en el server.**
- **`app/providers.tsx`**: `focusManager` propio que escucha `pageshow`+`visibilitychange` + `refetchOnWindowFocus:true` → refresca datos al volver de background en PWA standalone.
- **Guardado de predicción = `useMutation` con `networkMode:"online"`** (`FormularioPrediccion`): sin red, la mutación se pausa y reintenta al reconectar (no se pierde). `lib/queries` siguen siendo insert/update explícito (no `upsert`, por los grants de RLS).
- **`lib/supabase/client.ts`**: `auth.flowType:'pkce'` explícito + `realtime.worker:true`.
- **`/unirse/[codigo]` es ruta pública** en `lib/supabase/middleware.ts` (`esRutaPublica`) y el middleware propaga `?next=` al redirigir a login. No quitar.
- **Draft del wizard persistido** (`lib/stores/wizard-grupo.ts` con `persist`, `skipHydration`, serializador del `Set`): `crear/page.tsx` rehidrata al montar y limpia al salir → sobrevive a un kill de la PWA. Clave: `polla-wizard-grupo`.
- **Fechas SIEMPRE en `America/Bogota`** (`date-fns-tz`); countdowns por diff de `Date.now()`. Nunca `new Date("YYYY-MM-DD HH:MM")` (espacio = Invalid Date en Safari).

### Decisiones tomadas (no re-proponer)
- **Login por OTP/magic-link: DESCARTADO.** Se confía en email+contraseña (funciona en PWA standalone) y Google OAuth. El callback (`app/auth/callback/route.ts`) sí maneja `?code=` y `?token_hash=&type=` (para confirmación de registro y recuperación).
- **El callback (`app/auth/callback/route.ts`) redirige con `SITE_URL`, NUNCA con `origin` de `new URL(request.url)`.** Detrás de Netlify, `request.url` resuelve al host interno del deploy (`*.netlify.app`), no al dominio canónico (`pollota.com`). Redirigir a ese `origin` sacaba al usuario a `*.netlify.app` tras el OAuth de Google y la cookie de sesión —fijada en `pollota.com`— quedaba inaccesible → volvía al login. Es el mismo motivo que §14 da para el cliente (`SITE_URL` vs `window.location.origin`). El middleware (`lib/supabase/middleware.ts`) sí puede usar `request.nextUrl.clone()` porque corre en el edge con el host público y redirige con path relativo.
- **Tailwind 3.4 (NO v4)** — v4 rompe iOS 15 (ver COMPATIBILIDAD-STACK §3).
- **`<select>` nativo en admin** (sin `appearance:none`) — conserva el picker de iOS.
- **`button` size `sm` = 40px** — compromiso aceptado para acciones secundarias; las primarias usan `default` (44px).
- **Privacidad**: la pestaña **"General"** (agregados anónimos sin PII: % ganador + marcadores comunes) se muestra **siempre**, salvo cuando el grupo tiene **≤3 integrantes** y la apuesta no ha cerrado (`MIN_INTEGRANTES_AGREGADO = 4` en `EstadisticasGrupoResumen.tsx`). El umbral mira el **tamaño del grupo** (`total_participantes`, propagado por props desde `grupos/[id]/page.tsx` → `TarjetaPrediccion`/`TarjetaPartido`), **no** cuántos predijeron: con >3 integrantes se muestra aunque solo 1 haya predicho. La pestaña **"Por persona"** (nominales) **solo post-cierre** — pre-cierre muestra únicamente el aviso "secretas" (con fecha+hora del cierre y remisión a la sección **Partidos**, sin agregados duplicados). Lo NOMINAL lo garantiza RLS/vistas (`vwPrediccionesGrupoPartido` + `partido_cerrado()`), no el filtro de cliente. Sin Realtime sobre `tblPredicciones` cruda.

### Pendiente real
- Autofill de Safari en login/registro (forms controlados de RHF) podría no disparar `onChange` — bajo riesgo en Safari moderno; si aparece, migrar email/password a `register` o detectar `:-webkit-autofill` por `onAnimationStart`.
- Subida de imágenes (avatar/foto grupo) no existe aún → al agregarla, manejar **HEIC** (§16).
- **Verificación en iPhone físico** (Safari remote debugging) — cierre real; varios bugs WebKit solo se ven en hardware.
