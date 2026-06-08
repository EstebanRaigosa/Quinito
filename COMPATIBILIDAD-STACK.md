# Compatibilidad del stack — iOS Safari / iPhone + Android

Issues conocidos y mitigaciones **por tecnología del stack** (runtime), para garantizar que la
PWA y la web funcionen en iOS Safari y Android Chrome. Target: **iOS 15+, Android 10+**.

> Documento compañero de [`COMPATIBILIDAD-MOVIL.md`](./COMPATIBILIDAD-MOVIL.md): ese cubre la
> capa **CSS/WebKit** (viewport, safe-area, modales, scroll lock, teclado). Este cubre la capa
> **librería/framework** (Next.js, PWA, Supabase, TanStack Query, etc.). Cada hallazgo se
> verificó contra issues/docs oficiales (2025–2026); las referencias están al final de cada
> sección.

> **Nota de método:** muchos comportamientos de iOS PWA **standalone** son reportes empíricos
> en issues, no garantías de Apple, y **cambian entre versiones menores de iOS**. Trátalos
> como riesgo a **probar en iPhone real** (no simulador), no como hecho fijo.

---

## 0. Decisiones clave (TL;DR — léelo aunque no leas el resto)

Decisiones transversales que conviene fijar **desde el setup** (Fase 0):

| # | Decisión | Por qué | Sección |
|---|----------|---------|---------|
| 1 | **Tailwind 3.4.x — NO migrar a v4** mientras el target sea iOS 15 | v4 exige Safari 16.4+ (`@property`, `oklch`, `color-mix`); rompe en iOS 15 | §3 |
| 2 | **serwist** (no next-pwa) para la capa PWA | next-pwa sin mantenimiento; serwist es el recomendado por Next para App Router | §2 |
| 3 | **`Sheet` (Radix Dialog), no `Drawer` (vaul)** en la PWA standalone | vaul tiene bugs de pointer/scroll sin fix en standalone iOS | §4 |
| 4 | **Login por OTP de 6 dígitos**, no magic link, dentro de la PWA | iOS no hace deep-link a la PWA: el magic link abre Safari y pierde la sesión | §8 |
| 5 | **El storage local es caché descartable. Supabase es la fuente de verdad** | Safari evicta storage por inactividad; standalone aísla storage de Safari | §2,§6,§7,§8 |
| 6 | **`visibilitychange` + `pageshow`** son el "volví a la app" universal | iOS congela timers/sockets en background; hay que re-sincronizar al volver | §1,§6,§8 |
| 7 | **Nunca bloquear pinch-zoom**; inputs siempre `font-size ≥ 16px` | accesibilidad (WCAG AA, CLAUDE.md §3.6) y evitar zoom involuntario de iOS | §4,§5 |
| 8 | **`America/Bogota` en TODO render de fecha** (server y cliente) | evita hydration mismatch en Safari + cumple CLAUDE.md §3.5 | §1,§6,§7 |
| 9 | **La privacidad de predicciones cruza caché y Realtime**, no solo RLS | caché persistida o Realtime sobre la tabla cruda pueden filtrar PII pre-cierre | §2,§8 |
| 10 | **Probar en iPhone físico en modo PWA instalada** antes de cerrar features | es el entorno que más diverge del simulador y de Safari pestaña | todas |

---

## 1. Next.js 14+ (App Router)

### Issues confirmados
- **Auto-detección de iOS rompe la hidratación (CRÍTICO aquí).** iOS convierte números,
  fechas y emails en enlaces `<a>` automáticamente → el DOM cambia tras el SSR → *hydration
  mismatch*. En Polla esto dispara con **marcadores (`2-1`)**, horas de partido y **códigos de
  invitación**. Fix: meta `format-detection` global.
  ```tsx
  // app/layout.tsx → metadata
  export const metadata: Metadata = {
    formatDetection: { telephone: false, date: false, email: false, address: false },
  };
  ```
- **`themeColor` deprecado en `metadata`** desde Next 14 → va en el export `viewport`
  (ya reflejado en COMPATIBILIDAD-MOVIL §1.1). Si se deja en `metadata`, se omite el meta.
- **bfcache de Safari sirve contenido viejo al volver con "atrás"** tras backgrounding
  (confirmado por Vercel, afecta App y Pages Router). El scroll y el estado no sobreviven bien.
  Fix: en vistas de datos en vivo (tabla de posiciones, predicciones tras cierre), engancha
  `pageshow` con `event.persisted === true` y **refetcha/invalida** las queries.
- **Streaming SSR / `<Suspense>` no pinta progresivamente en Safari** si el shell inicial es
  < ~1024 bytes (Safari bufferea). En apps reales rara vez pasa, pero usa `loading.tsx` con
  **skeletons sustanciales** (no spinners mínimos) y verifica en iPhone.
- **Server Actions + cookies + `redirect()`**: la cookie del POST puede ser sobrescrita por la
  del GET streameado. Para auth, gestiona cookies con `@supabase/ssr` server-side (ver §8), no
  con cookie+redirect atómico.

### A vigilar / dudoso
- `<Link prefetch>` requiriendo **doble tap** en iOS (issue cerrado sin repro, ligado a
  14.2.x) → si aparece en una ruta, `prefetch={false}` puntual. Verificar en la versión fijada.
- `basePath`/`trailingSlash`: si se usan, el `start_url`/`scope` del manifest y el registro del
  SW deben respetar el prefijo, o el standalone abre fuera de scope y pierde sesión.
- `next/image`: iOS 15 **no soporta AVIF** → lista `['image/avif','image/webp']` y negocia por
  `Accept` (iOS recibe WebP). Siempre `sizes`/`fill` o `width/height`. Safari 15 muestra borde
  gris al cargar (corregido 16.4) → considera `placeholder="blur"`.

### Recomendaciones
- Meta `format-detection` en el layout raíz (crítico por marcadores/códigos).
- `next/font` vía la API (nada de `@font-face`/`<link>` manuales); dejar `display:'swap'`.
- No usar `useEffect` para fetching (ya prohibido en CLAUDE.md) — reduce superficie de mismatch.
- Auditar `useEffect` que dependan de `usePathname`/`useSearchParams`: se re-disparan al volver
  de bfcache en mobile.

> Refs: next.js#43914 (auto-link iOS), #90080 (bfcache), #52444 (Suspense streaming),
> #57680 (themeColor), #61611 (Server Action cookies); docs generateViewport / next/image.

---

## 2. PWA — serwist / Service Worker / Manifest (la pieza de mayor riesgo en Safari)

### Decisión: serwist
`next-pwa` original está **sin mantenimiento**; serwist (sucesor basado en Workbox, con
`@serwist/next`) es el recomendado por la doc de Next para App Router en 2026. Alinea con
CLAUDE.md ("serwist preferido"). Para solo manifest + apple-icon, Next 14 ya basta sin librería.

### Issues confirmados
- **Evicción de storage por inactividad (ITP).** Safari **pestaña** borra Cache/IndexedDB/
  localStorage/SW tras inactividad (la cifra "7 días" ya no está documentada por WebKit; asume
  storage volátil). **Matiz clave:** las PWA **instaladas** (Home Screen) son favorecidas para
  *persistent mode* y quedan **muy mitigadas** de la evicción. → Promueve instalar la PWA y
  llama `navigator.storage.persist()` al boot.
- **Standalone aísla todo de Safari.** Cookies, localStorage, IndexedDB y la instancia de SW
  **no se comparten** entre Safari y la PWA instalada. Si el usuario se logueó en Safari, al
  instalar **debe re-loguearse**.
- **iOS mata la PWA en background** → al volver recarga desde cero (estado en memoria perdido).
  Persiste el estado crítico de UI (ej. predicción a medio llenar) en storage, no solo memoria.
- **Actualización del SW:** `skipWaiting`+`clientsClaim` ciegos = "la app se puso rara hasta que
  la cerré". Haz update **opt-in**: detecta SW en `waiting`, muestra toast "Nueva versión —
  Recargar", y solo entonces `skipWaiting` (escucha `controllerchange` para recargar).
  `@serwist/window` lo facilita.
- **No hay `beforeinstallprompt` en iOS** → instrucciones manuales ("Compartir → Añadir a
  inicio") detectando iOS no-standalone. En Android sí captura el prompt nativo.
- **Splash screens iOS** requieren `apple-mobile-web-app-capable` (vía `appleWebApp.capable` en
  metadata) + una imagen por resolución. Sin ellas: pantalla blanca al abrir instalada.
- **Web Push iOS:** solo **16.4+**, **solo con PWA instalada**, y `requestPermission()` solo
  dentro de un **gesto de usuario**. Android no requiere instalación. Mismo código Web Push
  estándar (VAPID) sirve ambos (Edge Function de Supabase como backend).
- **Background Sync / Periodic Sync: NO existen en iOS** (sin roadmap). Fallback universal:
  cola en IndexedDB + replay al volver a foreground (`visibilitychange`). En Android, úsalos
  solo como *progressive enhancement* (`if ('sync' in registration)`).

### Estrategia de caché (encaja con el dominio)
- **App shell / estáticos** (JS, CSS, fuentes, iconos): `CacheFirst` / precache (Next ya hace
  cache-busting por hash).
- **Datos dinámicos** (predicciones, marcadores, tablas): `NetworkFirst` con timeout corto, o
  **mejor**: deja el cache de datos a **TanStack Query** y reserva el SW para el shell (evitas
  duplicar lógica). **No cache-first** para datos que cambian.
- **Navegaciones/RSC:** `NetworkFirst` o `StaleWhileRevalidate` con manejo explícito de las
  requests RSC (headers `RSC: 1`); **no precachear rutas dinámicas** (inviable en App Router).
- **PRIVACIDAD (regla de oro):** **nunca** cachees respuestas con predicciones nominales antes
  del cierre. Excluye esos endpoints del runtime caching (o `NetworkOnly`): caché persistida +
  dispositivo compartido podría filtrar PII. Es requisito de seguridad, no de rendimiento.

> Refs: WebKit Storage Policy blog, WebKit Web Push blog, Next.js PWA guide, next.js#74524
> (splash), PWA-POLICE/pwa-bugs, caniuse Background Sync, serwist docs.

---

## 3. Tailwind CSS 3.x

### Decisión de versión (CRÍTICA)
**Fijar `tailwindcss@^3.4` — NO subir a v4** mientras se soporte iOS 15. v4 requiere Safari
16.4+ y usa `@property`/`oklch`/`color-mix()` que **no** se transpilan a navegadores viejos. La
doc oficial dice explícitamente: *"if you need to support older browsers, stick with v3.4"*.

### Issues / gotchas confirmados
- **`h-dvh`/`h-svh`/`h-lvh` se agregaron en v3.4** (no existen en 3.0–3.3). Además **iOS 15.0–
  15.3 no soporta `dvh`** de forma fiable. → Patrón con fallback y feature query:
  ```html
  <div class="min-h-screen supports-[min-height:100dvh]:min-h-dvh">
  ```
- **Safe-area no viene de fábrica.** Mejor sin dependencia: extender `theme.spacing` con
  `'safe-b': 'env(safe-area-inset-bottom)'`, etc. → habilita `pb-safe-b`. (El plugin
  `tailwindcss-safe-area` solo si necesitas `safe-or`/`safe-offset` en bottom-nav fijo.)
  Requiere `viewport-fit=cover` (sin eso, `env()` = 0).
- **Vendor prefixes NO son automáticos en v3** — dependen de **Autoprefixer** en PostCSS. Next
  lo trae, pero **verifica** `postcss.config.js`. Crítico: `backdrop-filter` necesita
  `-webkit-backdrop-filter` en iOS; sin autoprefixer, `backdrop-blur-*` no se ve en iPhone.
- **`calc()` en arbitrary values:** el `-` necesita espacios. ✅ `calc(100dvh_-_4rem)` /
  `calc(100dvh-4rem)`; ❌ `calc(100dvh_-4rem)` (Safari lo rompe).
- **Dark mode:** usar `darkMode: 'selector'` (renombrado de `'class'` en 3.4.1). Tailwind no
  setea `color-scheme` → añádelo aparte (`:root { color-scheme: light dark }` o el campo
  `colorScheme` del viewport de Next).
- `motion-reduce`/`motion-safe` disponibles; `supports-[...]` desde v3.2.

### Recomendaciones
- **`browserslist`** en `package.json` alineado al target para que Autoprefixer emita los
  prefijos de iOS 15:
  ```jsonc
  "browserslist": ["iOS >= 15", "Safari >= 15", "Android >= 10", "Chrome >= 90", "> 0.5%", "not dead"]
  ```
- Centralizar patrones con `cn()`: shell full-height, `pb-safe-b`, glassmorphism con fallback
  opaco (`supports-[backdrop-filter]:backdrop-blur-md bg-white/70`), animaciones bajo
  `motion-safe:`.
- Inputs en `text-base` (16px), nunca `text-sm` en móvil (zoom de iOS).

> Refs: Tailwind v3.4 blog (dvh), compatibility docs (v4→Safari 16.4), PR #11317, autoprefixer,
> tailwindcss-safe-area, dark-mode docs.

---

## 4. shadcn/ui + Radix UI (+ vaul, sonner)

shadcn son plantillas sobre **Radix primitives** + **vaul** (Drawer) + **sonner** (Toast). Los
bugs viven upstream. Peor escenario: **PWA standalone**, donde iOS diverge más.

### Issues confirmados (por componente)
- **Drawer (vaul) — el más roto. Evítalo.** En standalone, los taps atraviesan el drawer a
  elementos de detrás (shadcn-ui#8507, sin fix oct-2025); input autozoom lo descuadra; el
  teclado tapa inputs; date picker nativo dentro puede crashear Safari. **→ Usa `Sheet`
  (Radix Dialog), que aísla pointer y scroll bien.**
- **Dialog / Sheet:** OK en general. Zoom de iOS al enfocar input dentro (shadcn-ui#2716) **ya
  resuelto** si tu `Input`/`Textarea` usa `text-base md:text-sm` — **verifica** que no copiaste
  una versión vieja con `text-sm`. **No** uses `maximum-scale=1` para taparlo (rompe a11y).
- **DropdownMenu** no abre con ciertos taps en iOS (radix#2580, abierto) → usa la última versión
  de Radix y prueba tap-to-open en iPhone real.
- **Select/Popover** flotante se mueve al hacer scroll en iOS. Para campos con muchas opciones
  (ej. 48 equipos del Mundial) evalúa **`<select>` HTML nativo** en móvil (wheel picker iOS,
  mejor UX táctil) frente al Select custom de Radix.
- **Toast (sonner)** no respeta `safe-area-inset-bottom` → choca con el home indicator. Estiliza
  `padding-bottom: calc(env(safe-area-inset-bottom) + 16px)` o usa `position="top-center"` en
  móvil.
- **Tooltip de Radix no abre con touch** (limitación WAI-ARIA, no bug). → En móvil usa
  **Popover** (toggletip, abre con tap) para info contextual. Nunca info crítica solo en tooltip.
- **Slider:** bloquea scroll vertical en touch (radix#570) → `touch-action: pan-y`.

### A vigilar
- **Doble scroll-lock:** Radix (`react-remove-scroll`) **ya** bloquea el scroll al abrir
  Dialog/Sheet/Drawer. **No** apliques un scroll-lock manual encima de componentes Radix
  (conflicto, scroll que no se restaura). Reserva el lock manual para overlays propios no-Radix.
- Hydration con `asChild`/`Slot` (ids): probable que no afecte; si ves mismatch, sospecha de
  `asChild` + una sola versión de React en el árbol.
- Portales dentro de ancestros con `transform`/`filter`: Radix portalea a `body` por defecto
  (lo evita); cuidado si fuerzas `container`.

### Recomendaciones (orden de auditoría)
1. **Sheet en vez de Drawer** (decisión, no opcional).
2. Confirmar `text-base md:text-sm` en inputs (login, predicción).
3. Select de equipos: nativo vs Radix, probar en iPhone.
4. DropdownMenu: probar apertura por tap.
5. Toast: safe-area o top en móvil.
6. Mantener Radix/vaul/sonner **en su última versión** (fixes de touch recientes). Muchos
   issues siguen **abiertos** → planifica los workarounds como permanentes.

> Refs: shadcn-ui#8507/#2716/#2849, vaul#174/#286/#374/#494, radix#2580/#2868/#570/Tooltip,
> react-remove-scroll#130.

---

## 5. React Hook Form 7.x (+ Zod)

> La mayoría de "problemas de RHF en iOS" son comportamientos nativos de WebKit (zoom, autofill,
> teclado, `disabled`), no de RHF. Se mitigan con CSS/atributos. Hay **un** bug propio de RHF
> (scroll-to-error).

### Issues confirmados
- **Scroll-to-error falla en iOS (bug real de RHF, #13059, v7.62).** `shouldFocusError` no
  scrollea un campo ya enfocado en Safari. → Tras submit con errores, scroll manual:
  `firstErrorRef.scrollIntoView({ behavior:'smooth', block:'center' })`. Importante en el form
  de predicción (muchos partidos; el error puede quedar tras el teclado).
- **Autofill de Safari no dispara `onChange`** → RHF puede creer el campo vacío (afecta auth).
  Fix preferente: usar **`register` (uncontrolled)** para email/password — RHF lee del DOM en el
  submit. Si la validación marca falso "requerido" tras autofill, detectar `:-webkit-autofill`
  por `onAnimationStart` → `setValue(name, value, { shouldValidate: true })`.
- **Marcadores: no usar `type="number"`** (spinners, separador decimal con punto vs coma es-CO,
  `valueAsNumber`→NaN). Usar `type="text" inputMode="numeric" pattern="[0-9]*"` y coaccionar en
  Zod: `z.coerce.number().int().min(0)`.
- **Inputs `disabled` ilegibles** (form de predicción deshabilitado cuando el partido no tiene
  equipos): WebKit baja opacidad e ignora `color`. → `input:disabled { opacity:1;
  -webkit-text-fill-color: <token legible>; color: <token>; }` (riesgo WCAG AA si no).
- **`setFocus` no funciona sin interacción previa** en iOS (no hay autofocus al montar).
- **Teclado tapa el submit** → `100dvh` + botón respetando `env(safe-area-inset-bottom)` o submit
  por Enter con `enterkeyhint`.

### Recomendaciones
```ts
useForm({
  resolver: zodResolver(schema),
  mode: "onTouched",        // mejor UX móvil: no grita rojo mientras escribe el 1er campo
  reValidateMode: "onChange",
  shouldFocusError: true,    // útil en Android; en iOS complementar con scroll manual
})
```
- Auth: `register` uncontrolled, `type="email" autoComplete="email"`, `type="password"
  autoComplete="current-password"/"new-password"` (habilita gestor de contraseñas iOS),
  `enterkeyhint` por campo.
- Marcadores: `<Input>` nativo con `register` (no `Controller`), `inputMode="numeric"`.
- Radix no-nativos (Select de equipo, Switch, Checkbox): `Controller`/`useController`.
- Perf Android gama baja (104 partidos): `register` uncontrolled, `useFieldArray` con keys
  estables (`field.id`), `useWatch` aislado en vez de `watch()` global.

> Refs: rhf#13059 (scroll-to-error iOS), react#2125 (autofill onChange), rhf discussion#1882,
> CSS-Tricks 16px/enterkeyhint, bootstrap#30890 (disabled color iOS).

---

## 6. TanStack Query v5

> El riesgo serio para una polla **no es el fetching, es la entrega garantizada de predicciones**
> ante red mentirosa (WiFi de estadio) + la evicción de storage. La caché es UX; el envío es
> *correctness* → trátalos distinto.

### Issues confirmados
- **`refetchOnWindowFocus` usa solo `visibilitychange` en v5**, que en iOS standalone **a veces
  no dispara** al volver de background → datos viejos. → `focusManager` custom que también
  escuche **`pageshow`** (cubre standalone + bfcache).
- **`onlineManager` asume `online: true`** y no usa `navigator.onLine` → **falsos positivos** en
  PWA (carga sin red desde SW; o WiFi cautivo "conectado sin internet", típico en eventos
  masivos). → No confíes en el flag para decidir si una predicción se envió; confía en el
  resultado real de la mutación + reintentos.
- **Mutaciones offline persistidas requieren `setMutationDefaults(['enviarPrediccion'],
  { mutationFn })`** registrado **antes** de hidratar, y `resumePausedMutations()` en el
  `onSuccess` del persister. Hay bugs de mutaciones atascadas en `paused` (issues #4170/#5847/
  #6825) → prueba modo-avión → reconectar y verifica que la predicción **llega**.
- **Timers congelados en background** (Safari) → `refetchIntervalInBackground: false` (default) +
  refetch explícito al `pageshow`/visible.

### Recomendaciones
```ts
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,            // evita refetch en ráfaga al volver de background
      gcTime: 1000 * 60 * 60 * 24,
      retry: 3,
      networkMode: "online",
      refetchIntervalInBackground: false,
    },
    mutations: {
      networkMode: "online",        // pausa (no falla) la mutación sin red
      retry: 5,
      retryDelay: (a) => Math.min(1000 * 2 ** a, 30_000),
    },
  },
})
```
- `focusManager`: `visibilitychange` **+** `pageshow`. `onlineManager`: default (o sondeo real;
  lo clave es no creer el flag a ciegas).
- Predicciones offline: `setMutationDefaults` + persistir mutaciones pausadas + **optimistic
  update** con rollback + **UI explícita "pendiente de enviar"** + respaldo propio en IndexedDB
  con replay al `pageshow`/`online`. Antes del cierre, una predicción "pendiente" perdida es un
  bug funcional grave.
- **Cierre de partido:** si la mutación reintenta tras el cierre, el **servidor/RLS debe
  rechazarla** — no confíes en el cliente.
- Persistencia: `query-sync-storage-persister` con **localStorage** para caché **pequeña**
  (perfil, grupos, calendario), `maxAge < 24h`. Tratar la caché como **descartable**.
- App Router: prefetch en RSC + `HydrationBoundary`; `staleTime > 0` para no refetchear al
  montar. Forzar `America/Bogota` en fechas (evita mismatch).

> Refs: TanStack docs (window-focus, onlineManager, network-mode, mutations, ssr), WebKit
> Storage blog, TanStack issues #4170/#5847/#6825, MDN pageshow.

---

## 7. Zustand 4.x (persist)

> Zustand core no toca el DOM. El riesgo está 100% en `persist` (storage + serialización) y en
> hydration SSR. Los dos que **sí** muerden: (1) hydration mismatch en App Router, (2) fechas
> serializadas como string + parser estricto de Safari.

### Issues confirmados
- **Hydration mismatch SSR/cliente.** `persist` rehidrata síncronamente al importar → server
  (sin localStorage) vs cliente (con valor persistido) → React lanza *Hydration failed*. →
  `skipHydration: true` + `useStore.persist.rehydrate()` en un `useEffect` de un
  `<StoreHydration/>` cliente en el layout; renderiza skeleton hasta `hasHydrated() === true`.
  **No leer valores persistidos en el primer render** sin guard.
- **Fechas: `JSON.parse` no revierte `Date`** → queda string. Si es `"YYYY-MM-DD HH:mm:ss"` (con
  espacio), `new Date(...)` da **`Invalid Date` en Safari** (funciona en Chrome — el clásico
  "falla solo en iPhone"). → **Nunca persistir `Date`**, solo strings ISO con `T`; convertir en
  el punto de uso con `date-fns-tz` y `America/Bogota`.
- **`createJSONStorage` no envuelve `setItem` en try/catch** → un write fallido (cuota, WebView
  raro) puede romper la acción del store. → `storage` custom con try/catch que degrade a no-op.
  (El bug histórico de modo privado de Safari ya está resuelto en iOS 15+.)
- **Standalone aísla el storage de Safari** (ver §2): el primer arranque de la PWA instalada
  estará "vacío" → debe rehidratar desde Supabase.

### Recomendaciones
- **Qué persistir:** solo UI-state/preferencias (tema, último grupo, filtros, onboarding, draft
  local de predicción no enviada). `partialize` como allowlist explícita — nunca el store entero.
- **Qué NO persistir:** ❌ sesión/auth (es de Supabase) — duplicarlo es fuga de seguridad;
  ❌ datos de dominio servidor (grupos, partidos, predicciones de otros) — eso es de TanStack
  Query; persistirlo arriesga datos viejos y **viola la privacidad de predicciones** si la caché
  sobrevive a un cambio de permiso.
- Config: `name:'polla-ui'`, `version:1` + `migrate` desde el día 1, `storage` con wrapper
  try/catch, `skipHydration:true`, cero `Date`.
- `navigator.storage.persist()` tras instalar (mitiga evicción).

> Refs: zustand#938, discussion#1382 (hydration), #1720 (Date), WebKit Storage blog,
> mdn/browser-compat-data#15401 (Safari Date.parse).

---

## 8. Supabase (Auth, Realtime, Storage, @supabase/ssr)

> Cubre lo que va **más allá** de PKCE/cookies SSR/magic-link (ya documentado): Realtime en
> background, refresh de token al volver, Storage/HEIC, deep-link standalone, RLS en Realtime.

### Issues confirmados
- **Realtime: Safari/PWA mata el WebSocket en background (alto impacto).** Los timers se
  congelan → el heartbeat (25s) se detiene → el socket cae **silenciosamente** (no hay error
  hasta que el usuario vuelve y faltan eventos). Mitigación combinada:
  1. `realtime: { worker: true }` al crear el cliente (heartbeat en Web Worker; **reduce**, no
     elimina — Safari también suspende Workers en background).
  2. **Re-suscribir explícito** en `visibilitychange`→`visible` (`removeChannel` + `subscribe`),
     no confiar en reconexión automática. Es la pieza confiable en iOS.
- **El token JWT expira en background; la 1ª request al volver falla.** `autoRefreshToken` usa
  un timer congelado por iOS. → En `visibilitychange`→`visible`, **`await
  supabase.auth.getSession()`/`refreshSession()` ANTES** de cualquier query o re-subscribe.
- **Magic link rompe el contexto PWA standalone (fundamental).** iOS no hace deep-link a la PWA:
  el link abre **Safari**, que no comparte sesión con la app instalada → el usuario queda
  logueado en Safari pero **no** en la PWA. (Con PKCE, además el link solo vale en el mismo
  browser que lo generó.) → **Login por OTP de 6 dígitos** (`signInWithOtp` + verificar código)
  dentro de la PWA; magic link/OAuth solo como fallback para navegador no instalado.
- **Storage / HEIC:** un `<input type="file" accept="image/jpeg,image/png">` hace que iOS
  **entregue JPEG** (convierte automáticamente). **Trampa:** si incluyes `image/heic` en
  `accept`, Safari 17+ puede convertir incluso PNG/JPEG **a HEIC** → archivo ilegible fuera de
  Safari. **Nunca pongas `image/heic` en `accept`.** Resize/compress client-side, tope ~5MB,
  bucket privado + signed URLs o público con image transform.
- **`getSession()` vs `getUser()` (seguridad):** en server (middleware, route handlers, server
  actions) **nunca** autorices con `getSession()` (lee cookies falsificables, no revalida). Usa
  `getUser()` o, con JWT asimétricos (default en proyectos nuevos desde oct-2025),
  `getClaims()` (verifica local con WebCrypto; cachea el JWKS a nivel módulo).

### A vigilar
- `worker: true` en iOS PWA suspendida: **probar en iPhone real** (background >30s → volver →
  ¿llegan eventos?). Trátalo como "reduce", no "resuelve".
- Cookies `SameSite`/`Secure`: `Secure` exige HTTPS; Safari es más estricto que Chrome con
  cookies cross-context. Prueba el flujo SSR en **HTTPS** (ngrok/Vercel preview), no solo
  localhost.
- `realtime-js` fue **archivado (ene-2026)**; vive ahora en el monorepo de `supabase-js`. Pin de
  versión y revisar changelog antes de upgrades mayores.

### Realtime + RLS — CRÍTICO para la privacidad de predicciones
- Para `tblPredicciones`, **NO** uses Postgres Changes sobre la tabla cruda: aunque Realtime
  aplica RLS, expone la superficie justo donde la regla de oro prohíbe revelar "qué usuario
  predijo qué" **antes del cierre**.
- Para "en vivo" pre-cierre, suscríbete **solo a agregados anónimos** (vistas
  `vwEstadisticasPartido*` o un canal `broadcast`/`presence` que emita solo conteos/%). Reserva
  los datos nominales para **después del cierre**, donde RLS ya lo permite.
- Valida con **dos usuarios reales** que un participante no reciba la predicción de otro
  pre-cierre. No confíes en el filtro del `.on()`; confía en RLS. (El Realtime Inspector local
  bypassa RLS — no lo uses para validar privacidad.)

### Config del cliente (browser)
```ts
createClient(url, anonKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true, flowType: 'pkce' },
  realtime: { worker: true },
})
```

### Android
Chrome Android es más permisivo (cookies/WebSockets) y **sí** hace deep-link a PWA instalada
(magic link puede funcionar ahí). Las mitigaciones de iOS (OTP, re-subscribe, refresh en
visibility) **no rompen Android** → aplícalas cross-platform, sin mantener dos caminos (salvo el
fallback magic-link para desktop).

> Refs: Supabase troubleshooting Realtime, realtime-js#121, supabase#6464 (token sleep),
> @supabase/ssr docs, auth-getclaims / JWT signing keys, Realtime Authorization, supabase
> discussion#12227 (magic link PWA), Safari HEIC conversion (Apple forums), heic2any.

---

## 9. Resto del stack (sin agente dedicado — bajo riesgo en runtime)

- **TypeScript / Zod:** build-time, sin superficie de compatibilidad de navegador. Único punto:
  usar `z.coerce.number()` para marcadores (ver §5) y validar fechas como ISO con `T`. La
  validación de Zod corre igual en todo navegador.
- **lucide-react:** SVGs inline; sin issues de Safari. Solo cuida el **tap target** (envolver
  iconos clicables en botón ≥ 44×44 px) y `aria-label` (CLAUDE.md §3.6). `button * { pointer-
  events: none }` para que el tap vaya al botón, no al SVG (ya en COMPATIBILIDAD-MOVIL §6).
- **date-fns-tz / Intl:** la herramienta para cumplir `America/Bogota`. Recuerda el parser
  estricto de Safari: siempre ISO con `T` (ver §7 y COMPATIBILIDAD-MOVIL §12).

---

## 10. Plan de pruebas mínimo en dispositivo

Antes de cerrar una feature, en **iPhone real (PWA instalada)** + **Android Chrome**:

1. **Background → volver:** abre la app, cambia a otra app 30–60s, vuelve. ¿Datos frescos
   (TanStack focus/pageshow)? ¿Realtime reconecta? ¿La 1ª request no falla por token expirado?
2. **Red mentirosa:** modo avión a mitad de enviar una predicción → reconectar. ¿La predicción
   llega? ¿La UI mostró "pendiente"?
3. **Auth en standalone:** login por OTP dentro de la PWA (no en Safari). ¿Sesión persiste tras
   matar y reabrir la app?
4. **Teclado:** en login y en predicción, ¿el input enfocado y el submit quedan visibles?
   ¿Ningún input hace zoom (≥16px)?
5. **Modales:** abrir Sheet/Dialog, ¿scroll del fondo bloqueado y restaurado? ¿taps no
   atraviesan? ¿safe-area en footer/toast?
6. **Instalación:** ¿apple-touch-icon e splash sin pantalla blanca? ¿banner de instalación
   (manual iOS / prompt Android)?
7. **Privacidad:** con 2 usuarios, antes del cierre, ¿ninguno ve la predicción nominal del otro
   (ni por API, ni Realtime, ni caché)?
8. **Remote debug:** Safari macOS → Develop → [iPhone] para inspeccionar la PWA en el device.

---

**Última actualización:** Fase 0 — investigación por tecnología (8 subagentes, fuentes 2025–2026).
Re-evaluar al fijar versiones de dependencias y al cerrar cada fase.
