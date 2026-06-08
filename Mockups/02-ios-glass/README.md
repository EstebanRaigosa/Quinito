# Polla — iOS Glass Mockup

Mockup funcional de la app "Polla" (quinielas del Mundial 2026) con el sistema de diseño **iOS / Cupertino + Glassmorphism**.

## Cómo abrirlo

1. Navega a la carpeta `02-ios-glass/`.
2. Haz doble clic en `index.html`.
3. Se abre en el navegador con `file://` — no necesita servidor, npm ni build.

Funciona en Chrome, Edge, Firefox y Safari (incluyendo iOS Safari, que activa el backdrop-filter nativo).

## Acceso demo

Las credenciales ya vienen precargadas en el formulario de login:

| Campo | Valor |
|---|---|
| Correo | `admin@polla.co` |
| Contraseña | `Mundial2026` |

Haz clic en **Iniciar sesión** para entrar al dashboard. También puedes usar el botón "Continuar con Google" o registrar una cuenta nueva (cualquier email válido y contraseña de 6+ caracteres).

## Pantallas disponibles

Navega por las rutas de hash para ver cada pantalla:

| Hash URL | Pantalla |
|---|---|
| `#/login` | Login / Registro (Segmented Control Iniciar sesión / Crear cuenta, Google Auth, validación inline) |
| `#/dashboard` | Dashboard — saludo, Mis Grupos, acciones Crear y Buscar |
| `#/crear` | Wizard Crear Grupo (3 fases con progress steps iOS) |
| `#/buscar` | Buscar / Unirse por código (prueba con `PLLA26`) |
| `#/grupo/g-oficina` | Vista de Grupo con 6 tabs |
| `#/grupo/g-oficina/prediccion/1` | Detalle predicción partido #1 (México vs Sudáfrica — finalizado) |
| `#/grupo/g-oficina/prediccion/7` | Detalle predicción partido #7 (Brasil vs Marruecos — en vivo) |
| `#/grupo/g-oficina/prediccion/34` | Detalle predicción partido #34 (Ecuador vs Curazao — programado) |

## Flujos de demo

### Autenticación
- **Login:** introduce cualquier email válido y contraseña de 6+ caracteres → navega al dashboard.
- **Registro:** completa todos los campos y acepta los términos → navega al dashboard.
- **Google:** botón "Continuar con Google" → navega al dashboard (mock, sin OAuth real).

### Crear grupo (wizard 3 fases)
1. **Fase 1 — Datos:** escribe un nombre (3–50 caracteres), descripción opcional, torneo fijo.
2. **Fase 2 — Reglas:** ajusta puntos y premios. La suma de los 3 premios debe ser exactamente 100% para avanzar — se valida en vivo con indicador de color.
3. **Fase 3 — Partidos:** todos seleccionados por defecto. Checkboxes circulares estilo iOS con estado `indeterminate`. Al crear → toast + navega al grupo con código `PLLA26`.

### Buscar y unirse
- Código `PLLA26` (o cualquier texto no vacío) → muestra preview del grupo en una card glass.
- Botón "Unirme al grupo" → toast + navega al grupo.

### Vista de grupo — 6 tabs
1. **Mis Predicciones:** iOS stepper +/- para partidos abiertos. Guardar persiste en `localStorage`.
2. **Tabla de Posiciones:** podio top-3 con barras de colores + clasificación completa con tu fila resaltada.
3. **Partidos:** todos los partidos con filtro por fase (chips) y marcador real cuando aplica.
4. **Reglas:** puntos, bonos, pozo y reparto de premios en solo lectura.
5. **Participantes:** lista con avatar, rol, estado de pago y puntaje.
6. **Configuración:** editar nombre/descripción (toast al guardar), copiar código, salir del grupo.

### Detalle de predicción
- Toca cualquier tarjeta de partido en "Mis Predicciones" para ir al detalle.
- Cabecera con marcador del partido (real si está finalizado o en vivo).
- Panel "Todos los usuarios": distribución de ganador en barras + top marcadores.
- Panel "Predicciones de mi grupo": secretas si la apuesta sigue abierta; lista nominal si está cerrada.

## Datos y fecha simulada

Los datos y la lógica provienen de `data.js` (objeto global `window.POLLA`). La hora "ahora" simulada es **2026-06-20 16:00 COL**, lo que garantiza que hay partidos en los tres estados: finalizados, en vivo y programados — todos los estados son demostrables sin modificar nada.

No modifiques `data.js`; solo renderiza.

## Características técnicas

- **Sin build, sin servidor.** Funciona con `file://`.
- **JS vanilla** con scripts clásicos, sin `type="module"`.
- **Hash routing** (`location.hash`).
- **Dark/light toggle** persistido en `localStorage` (botón en tab bar / sidebar de escritorio).
- **Predicciones persistidas** en `localStorage`.
- **Mobile-first** (375px base): glass tab bar en mobile, sidebar glass de 280px en escritorio (≥1024px).
- **iOS-safe:** `100dvh`, `env(safe-area-inset-*)`, inputs con `font-size: 16px` mínimo, tap targets 44px.
- **Glassmorphism:** `backdrop-filter: blur(20px) saturate(180%)` en nav bar, tab bar, sidebar y cards — con fallback a fondos opacos en navegadores sin soporte.
- **Accesible:** `<label>` en todos los inputs, `aria-label` en botones-icono, `aria-live` en toasts, foco visible con ring de acento, contraste WCAG AA.

## Estructura de archivos

```
02-ios-glass/
├── index.html              Entry SPA (shell con loading screen, toast container, scripts)
├── app.js                  Router + render de todas las pantallas
├── data.js                 Datos y lógica mock (window.POLLA) — no modificar
├── README.md               Este archivo
└── design-system/
    ├── tokens.css          Variables CSS del sistema (colores iOS, materiales glass, tipografía, spacing, sombras, motion)
    ├── components.css      Clases de componentes (navbar, tabbar, sidebar, cards, botones, stepper, etc.)
    └── README.md           Documentación del sistema de diseño iOS Glass
```

## Sistema de diseño: iOS / Cupertino + Glassmorphism

Ver `design-system/README.md` para la documentación completa.

En resumen:
- **SF Pro** (via `-apple-system`) como fuente principal; **Inter** como fallback en no-Apple
- Paleta del sistema iOS con colores semánticos (`label`, `label-secondary`, `separator`, `fill`) y colores de acento (`accent` azul, `green`, `red`, `orange`, `yellow`, `teal`, `indigo`, `purple`, `pink`)
- Materiales translúcidos: `--material-thin`, `--material-regular`, `--material-thick`, `--material-chrome` con `backdrop-filter` blur + saturate
- Radios desde `--radius-xs` (4px) hasta `--radius-full` (9999px)
- Sombras suaves multicapa (`--shadow-xs` a `--shadow-xl`)
- Motion con `--ease-spring` (rebote) y `--ease-ios` (suave) para gestos y transiciones
