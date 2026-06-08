# Mockups funcionales — Polla (Mundial 2026)

Tres mockups **110% funcionales** de la app de quinielas, cada uno con un **sistema de diseño distinto**.
Comparten exactamente las mismas pantallas y lógica (datos del Mundial 2026, wizard, predicciones,
estadísticas, tabla de posiciones); solo cambia la **piel visual**.

## Cómo abrirlos

Cada mockup funciona **abriendo su `index.html` con doble clic** (no requiere servidor ni build).

> Si tu navegador bloquea algo por `file://`, sirve la carpeta con un servidor estático:
> `cd Mockups && python3 -m http.server 8765` y abre `http://localhost:8765/01-material-you/index.html`.

## 🔑 Acceso demo (credenciales quemadas)

En el login de los **tres** mockups ya vienen **precargadas**:

| Campo   | Valor             |
|---------|-------------------|
| Usuario | `admin@polla.co`  |
| Clave   | `Mundial2026`     |

Solo pulsa **Iniciar sesión** para entrar. (El usuario demo es admin del grupo "Polla de la Oficina 2026".)

## Los tres mockups

| # | Carpeta | Sistema de diseño | Vibe |
|---|---------|-------------------|------|
| 1 | [`01-material-you/`](./01-material-you/) | **Material Design 3 (Material You)** | Color tonal dinámico, FAB, navigation rail/bar, superficies con tinte por elevación. Semilla verde "césped". |
| 2 | [`02-ios-glass/`](./02-ios-glass/) | **iOS / Cupertino + Glassmorphism** | HIG de Apple: large titles, listas inset agrupadas, segmented controls, barras con vidrio esmerilado, acento azul del sistema. |
| 3 | [`03-stadium-bold/`](./03-stadium-bold/) | **Stadium Bold** (propio) | Editorial deportivo, noche de estadio, tipografía display en mayúsculas, acentos neón, tarjetas tipo marcador. |

Cada carpeta incluye su **`design-system/`** documentado (`tokens.css`, `components.css`, `README.md`).

## Qué pantallas tienen (todas funcionales)

- **Login / Registro** (tabs, Google, credenciales demo precargadas, validación).
- **Dashboard** — "Mis Grupos" + acciones Crear / Buscar.
- **Wizard Crear Grupo** (3 fases): datos → reglas (con tooltips y validación de premios = 100%) → selección
  de partidos por fase (checkbox padre con estado indeterminado, todos seleccionados por defecto).
- **Buscar / Unirse** por código.
- **Vista de Grupo** con 6 tabs: Mis Predicciones · Tabla de Posiciones · Partidos · Reglas · Participantes ·
  Configuración (admin).
- **Detalle de predicción** con panel **"Todos los usuarios"** (ganador % + resultados más comunes) y
  **"Predicciones de mi grupo"** (secretas antes del cierre / lista nominal después).
- **Dark / light** togglable y persistido.

## Datos y lógica

Todo sale de **`_shared/data.js`** (copiado idéntico en cada mockup como `data.js`, expuesto en
`window.POLLA`): los 12 grupos A–L, los **104 partidos** del calendario oficial, el grupo demo con sus
participantes, y los helpers de estado/puntajes/estadísticas según `REQUIREMENTS.md`.

> **Fecha simulada:** 2026-06-20 16:00 (COL). Por eso hay partidos **finalizados** (con marcador real y
> puntos), **en vivo** y **programados** (predicción abierta) al mismo tiempo — para demostrar todos los
> estados.

## Estructura

```
Mockups/
├── README.md            ← este índice
├── _shared/
│   ├── data.js          ← dataset + lógica canónica (fuente)
│   └── SPEC.md          ← especificación funcional común
├── 01-material-you/     ← index.html · app.js · data.js · README.md · design-system/
├── 02-ios-glass/        ← idem
└── 03-stadium-bold/     ← idem
```
