# Polla — Stadium Bold Mockup

Mockup funcional de la app "Polla" (quinielas del Mundial 2026) con el sistema de diseño **Stadium Bold**.

## Cómo abrirlo

1. Navega a la carpeta `03-stadium-bold/`.
2. Haz doble clic en `index.html`.
3. Se abre en el navegador con `file://` — no necesita servidor ni npm.

Funciona en Chrome, Edge, Firefox y Safari (incluyendo iOS Safari).

## Pantallas disponibles

Navega por las rutas de hash para ver cada pantalla:

| Hash URL | Pantalla |
|---|---|
| `#/login` | Login / Registro (tabs Ingresar / Registrarse, Google Auth, validación inline) |
| `#/dashboard` | Dashboard — Mis Grupos, acciones Crear y Buscar |
| `#/crear` | Wizard Crear Grupo (3 fases con stepper) |
| `#/buscar` | Buscar / Unirse por código (prueba con `PLLA26`) |
| `#/grupo/g-oficina` | Vista de Grupo con 6 tabs |
| `#/grupo/g-oficina/prediccion/1` | Detalle predicción partido #1 (México vs Sudáfrica) |
| `#/grupo/g-oficina/prediccion/7` | Detalle predicción partido #7 (Brasil vs Marruecos — en vivo) |
| `#/grupo/g-oficina/prediccion/34` | Detalle predicción partido #34 (Ecuador vs Curazao — programado) |

## Flujos de demo

### Autenticación
- Login: cualquier email válido + contraseña ≥6 caracteres → navega al dashboard
- Registro: completa todos los campos + acepta términos → navega al dashboard
- Google: botón "Continuar con Google" → navega al dashboard (mock)

### Crear grupo (wizard 3 fases)
1. **Fase 1 — Datos:** escribe un nombre (3–50 chars), descripción opcional, torneo fijo.
2. **Fase 2 — Reglas:** ajusta puntos y premios. La suma de premios (1er + 2do + 3er lugar) debe ser exactamente 100% para avanzar — se valida en vivo.
3. **Fase 3 — Partidos:** todos seleccionados por defecto. Checkboxes de fase con estado `indeterminate`. Al crear → toast con código `PLLA26` → navega al grupo.

### Buscar y unirse
- Código `PLLA26` (o cualquier texto no vacío) → muestra preview del grupo.
- Botón "Unirme" → toast + navega al grupo.

### Vista de grupo — 6 tabs
1. **Mis Predicciones:** stepper +/- para partidos abiertos → Guardar persiste en localStorage.
2. **Tabla de Posiciones:** podio top-3 + clasificación completa con tu fila resaltada.
3. **Partidos:** todos los partidos con filtro por fase (chips), marcador real cuando aplica.
4. **Reglas:** puntos, bonos, pozo y reparto de premios.
5. **Participantes:** lista con avatar, rol, estado de pago y puntaje.
6. **Configuración:** editar nombre/descripción (toast al guardar), copiar código, salir del grupo.

### Detalle de predicción
- Toca cualquier tarjeta de partido para ir al detalle.
- Scoreboard del partido (marcador real si está finalizado o en vivo).
- Panel "Todos los usuarios": distribución ganador (%) + top marcadores en barras.
- Panel "Predicciones de mi grupo": secretas si abierta, lista nominal si cerrada.

## Características técnicas

- **Sin build, sin servidor.** Funciona con `file://`.
- **JS vanilla** con IIFE, sin `type="module"`.
- **Hash routing** (`location.hash`).
- **Dark/light toggle** persistido en `localStorage`.
- **Predicciones persistidas** en `localStorage`.
- **Mobile-first** (375px base), bottom nav en mobile, sidebar en ≥1024px.
- **iOS-safe:** `100dvh`, `env(safe-area-inset-*)`, inputs `font-size: 16px`, tap targets 44px.
- **Accesible:** labels, `aria-label`, `role`, `aria-selected`, `aria-live`, foco visible, contraste AA.

## Estructura de archivos

```
03-stadium-bold/
├── index.html              Entry SPA
├── app.js                  Router + render de todas las pantallas
├── data.js                 Datos y lógica mock (window.POLLA) — no modificar
├── README.md               Este archivo
└── design-system/
    ├── tokens.css          Variables CSS del sistema (colores, tipo, spacing, radii, motion)
    ├── components.css      Clases de componentes (botones, scoreboard, badges, nav, etc.)
    └── README.md           Documentación del sistema de diseño Stadium Bold
```

## Sistema de diseño: Stadium Bold

Ver `design-system/README.md` para la documentación completa.

En resumen:
- **Anton** para titulares y números de marcador
- **Oswald** para labels, tabs y botones
- **Inter** para cuerpo
- Paleta oscura "noche de estadio" + acento verde lima + magenta
- Scoreboard cards, sticker badges, diagonales, barras de distribución
- Alto contraste, energía de hincha, 100% funcional y accesible
