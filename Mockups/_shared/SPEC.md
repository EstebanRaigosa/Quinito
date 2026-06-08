# SPEC funcional — Mockups Polla (Mundial 2026)

> Los 3 mockups implementan **exactamente las mismas pantallas y comportamiento**.
> Solo cambia el sistema de diseño (la piel). Esta spec es la fuente de verdad funcional.
> Basado en `REQUIREMENTS.md` del proyecto.

## Reglas técnicas duras (no negociables)

- **Sin build, sin servidor, sin npm.** Debe funcionar abriendo `index.html` con doble clic (`file://`).
- HTML + CSS + **JavaScript vanilla**. Prohibido `type="module"` (rompe en file://). Usar `<script>` clásicos.
- Fuentes e iconos por CDN están permitidos (Google Fonts, etc.). Si usas iconos, inline SVG es lo más robusto.
- **Reutilizar `data.js`** (cópialo a tu carpeta como `data.js`). Toda la data y lógica (estados, puntajes,
  estadísticas) sale de `window.POLLA`. No reinventes la lógica; solo renderiza.
- **Mobile-first** real: probar mentalmente a 375px. Bottom-nav en mobile, sidebar/rail en desktop (≥1024px).
- iOS-safe: usar `100dvh` (no `100vh`), `env(safe-area-inset-*)`, inputs con `font-size ≥ 16px` (evita zoom),
  tap targets ≥ 44px.
- **Dark / light toggle** funcional, persistido en `localStorage`.
- Español es-CO en todos los textos. Fechas/horas ya vienen formateadas por los helpers.
- Accesible: labels en inputs, `aria-label` en botones-icono, foco visible, contraste AA.

## Arquitectura sugerida (SPA con hash routing)

Un solo `index.html` + `data.js` + `app.js` (+ tu `design-system/`). Router por `location.hash`:

```
#/login                      Login / Registro
#/dashboard                  Dashboard (Mis Grupos + acciones)
#/crear                      Wizard crear grupo (3 fases, estado en memoria)
#/buscar                     Buscar / unirse por código
#/grupo/g-oficina            Vista de grupo (tabs)
#/grupo/g-oficina/prediccion/1   Detalle de predicción de un partido (#n)
```

Estado en memoria (objeto JS) + `localStorage` para tema y predicciones editadas. No requiere backend.

## Pantallas y comportamiento

### 1. Login / Registro (`#/login`)
- Branding del producto "Polla".
- Tabs **Iniciar sesión** / **Crear cuenta** (switch funcional).
- Botón destacado **"Continuar con Google"** (con logo G) arriba, separador "o", luego campos.
- Iniciar sesión: email + contraseña + link "¿Olvidaste tu contraseña?".
- Crear cuenta: nombre, email, contraseña, confirmar contraseña, checkbox términos.
- Cualquier submit → navega a `#/dashboard` (es mock; no valida credenciales reales, pero sí valida formato/required con feedback inline).

### 2. Dashboard (`#/dashboard`)
- Saludo al usuario (`POLLA.USUARIO.nombre`).
- Dos acciones primarias: **Crear Grupo** (→ `#/crear`) y **Buscar Grupo** (→ `#/buscar`).
- Sección **"Mis Grupos"**: tarjetas desde `POLLA.MIS_GRUPOS`. Cada tarjeta: nombre, torneo,
  nº participantes, posición actual (ej. "Vas 2º"), badge de estado (Activo/Próximo/Finalizado),
  acción "Ver grupo" → `#/grupo/<id>` (todas navegan al grupo demo `g-oficina`).
- Empty state contemplado (aunque haya datos, deja el patrón listo).

### 3. Wizard Crear Grupo (`#/crear`) — 3 fases con stepper visual (1/3, 2/3, 3/3)
- **Fase 1 — Datos:** nombre (3–50, requerido), descripción (opcional, máx 280, con contador).
  Torneo fijo "Mundial 2026" (mostrado, no editable). "Siguiente" deshabilitado si inválido.
- **Fase 2 — Reglas de puntuación:** todos los campos numéricos de `POLLA.REGLAS` con sus **tooltips**
  (textos en REQUIREMENTS §4.3 RF-CREAR-02) y defaults. Incluir valor_apuesta (COP) y los 3 premios %.
  **Validación cruzada en vivo:** premio_1 + premio_2 + premio_3 = 100 (mostrar suma y error si ≠100).
- **Fase 3 — Seleccionar Partidos:** lista TODOS los partidos agrupados por fase
  (usar `POLLA.FASES` + `POLLA.partidosPorFase`). Cada fase con checkbox "padre" (selecciona/deselecciona
  toda la fase, con estado indeterminate). **Todos seleccionados por defecto.** Cada partido: checkbox,
  bandera+nombre local, bandera+nombre visitante, fecha (`fechaCorta`), hora (`horaCorta`). Eliminatorias:
  mostrar etiquetas placeholder (`etiquetaEquipo`, ej. "2A", "Ganador P73").
- **Confirmar:** botón "Crear grupo" → genera código de 6 chars (puede ser fijo "PLLA26"), toast de éxito,
  navega a `#/grupo/g-oficina`.
- Botones Atrás/Siguiente entre fases, indicador de progreso.

### 4. Buscar / Unirse (`#/buscar`)
- Input "Ingresa el código del grupo" + botón **Buscar**.
- Si el código = `PLLA26` (o cualquiera no vacío para el demo) → muestra **preview**: nombre, torneo,
  descripción, nº participantes, valor apuesta. Botón **"Unirme al grupo"** → toast + `#/grupo/g-oficina`.
- Si vacío → error inline. (Opcional: estado "ya perteneces" informativo.)

### 5. Vista de Grupo (`#/grupo/g-oficina`) — tabs
Header del grupo: nombre, torneo, nº participantes, código de invitación con botón **copiar** (clipboard + toast).
Tabs (todas funcionales):

1. **Mis Predicciones** (default): lista de partidos del grupo (usa `POLLA.PARTIDOS`).
   Por partido mostrar tarjeta con local/visitante (bandera+nombre), fecha/hora, estado
   (`estadoPartido`: programado/en_vivo/finalizado) y:
   - Si `programado` y `prediccionAbierta` y `equiposDefinidos`: **2 inputs numéricos** (goles local /
     visitante) editables + guardar (persistir en localStorage). Stepper +/- es buen detalle.
   - Si `!equiposDefinidos`: deshabilitado con mensaje "Los equipos de este partido se conocerán al
     finalizar la fase anterior."
   - Si cerrado/en vivo/finalizado: mostrar la predicción del usuario (`miPrediccion`) bloqueada; si
     finalizado, marcador real (`resultadoReal`) + badge de puntos (`misPuntos`).
   - Tocar una tarjeta abre el **detalle de predicción** (#/.../prediccion/n) con los paneles de stats.

2. **Tabla de Posiciones:** leaderboard desde `POLLA.tablaPosiciones(GRUPO_DEMO)`. Avatar (iniciales+color),
   nombre, puntos, aciertos, posición. Resaltar la fila del usuario (`u-yo`). Podio top-3 visual es un plus.

3. **Partidos:** lista completa con marcador real (si aplica) + predicción del usuario + puntos. Filtros
   por fase (chips) es un plus. Reutiliza helpers.

4. **Reglas:** vista solo lectura de `POLLA.REGLAS` (tabla/tarjetas): puntos por tipo de acierto, bonos por
   fase, valor apuesta (formateado COP), reparto de premios % con su monto estimado del pozo
   (pozo = valor_apuesta × participantes que pagaron).

5. **Participantes:** lista de `GRUPO_DEMO.participantes`: avatar, nombre, rol (admin/jugador badge),
   estado de pago, puntaje acumulado (de la tabla de posiciones).

6. **Configuración** (solo admin — el usuario ES admin): editar nombre/descripción del grupo (mock, con
   toast al guardar) + copiar código de invitación + zona de "salir del grupo".

### 6. Detalle de predicción de partido (`#/grupo/g-oficina/prediccion/<n>`)
Replica las imágenes del briefing (RF-GRUPO-02.x):
- Cabecera del partido (equipos, fecha/hora, estadio, estado).
- Form de predicción (mismo comportamiento de bloqueo que arriba).
- **Panel "Todos los usuarios"** (`estadisticasGlobales(m)`): bloque **Ganador** (3 barras horizontales con %
  local/empate/visitante) + bloque **Resultados más comunes** (top marcadores como barras horizontales
  ordenadas desc con su %).
- **Panel "Predicciones de mi grupo"**:
  - Si la apuesta sigue **abierta**: mensaje *"Las predicciones de tus amigos son secretas. Estarán
    disponibles luego de que se cierre la apuesta."* (Opcional: si ≥5 participantes ya predijeron, mostrar
    agregados anónimos del grupo con `estadisticasGrupo` — formato igual al global.)
  - Si **cerrada** (`prediccionesNominales` ≠ null): **lista nominal** con avatar + nombre + marcador
    predicho; si finalizado, badge de puntos. Ordenada por puntos desc (o alfabética si en vivo).
- Componente reusable de **barra de distribución** (`%`) usado en ambos paneles.

## Datos disponibles (`window.POLLA`)
`EQUIPOS, GRUPOS_TORNEO, PARTIDOS, FASES, FASES_KO, USUARIO, REGLAS, PARTICIPANTES, GRUPO_DEMO, MIS_GRUPOS`
y helpers: `estadoPartido, prediccionAbierta, equiposDefinidos, resultadoReal, etiquetaEquipo, banderaEquipo,
nombreCortoEquipo, miPrediccion, prediccionDe, calcularPuntos, misPuntos, tablaPosiciones,
estadisticasGlobales, estadisticasGrupo, prediccionesNominales, fechaCorta, horaCorta, fechaPartido,
partidosPorFase, partidoPorN, proximoPartido`.

Hora "ahora" simulada: 2026-06-20 16:00 COL (hay partidos finalizados, en vivo y programados → todos los
estados son demostrables).

## Entregable por carpeta
```
<carpeta-mockup>/
├── index.html              ← entry SPA
├── data.js                 ← copia de _shared/data.js (NO modificar la lógica)
├── app.js                  ← router + render de todas las pantallas
├── README.md               ← cómo abrirlo + qué muestra
└── design-system/
    ├── tokens.css          ← variables del sistema (color, type, spacing, radii, shadow, modos)
    ├── components.css       ← clases de componentes del sistema
    └── README.md           ← documentación del sistema de diseño (filosofía, tokens, componentes, do/don't)
```
(Puedes dividir app.js en varios .js si prefieres, todos cargados con `<script>` clásicos en orden.)

## Criterio de "110% funcional"
Navegación completa entre TODAS las pantallas, wizard que avanza/retrocede con estado, validación de premios
en vivo, checkboxes de fase con padre indeterminate, predicciones editables que persisten, tabs que cambian,
paneles de estadísticas renderizados con barras reales, copiar código, dark/light. Cero pantallas en blanco,
cero links muertos. Si algo no aplica, muestra empty state, no lo dejes roto.
