# Plan de Implementación — Polla (Mundial 2026)

> Plan accionable derivado de [`REQUIREMENTS.md`](./REQUIREMENTS.md), alineado con las reglas de
> [`CLAUDE.md`](./CLAUDE.md) y las decisiones de compatibilidad de
> [`COMPATIBILIDAD-MOVIL.md`](./COMPATIBILIDAD-MOVIL.md) y [`COMPATIBILIDAD-STACK.md`](./COMPATIBILIDAD-STACK.md).
>
> **Estado actual:** Fase 0 — repositorio vacío (solo documentación + `Desing System/tokens.json`).
> **Decisiones de esta sesión:** entregable = este plan · Supabase = remoto vía MCP · gestor = **pnpm**.

---

## 0. Bloqueante #0 — Proyecto Supabase dedicado (resolver ANTES de tocar BD)

⚠️ **El proyecto Supabase actualmente conectado por MCP es de OTRA aplicación** (Natillera:
`socios`, `natilleras`, `cuotas`, `prestamos`, `rifas`… base de **producción** con datos reales).
**No** se debe crear el esquema de Polla ahí.

**Acción requerida (manual, del usuario) antes de la Fase 2:**
1. Crear un **proyecto Supabase nuevo** para Polla (ej. `polla-mundial-2026`).
2. Reapuntar la conexión MCP de Supabase a ese proyecto nuevo (o confirmar con cuál `project-id`
   trabajaremos).
3. Guardar credenciales en `.env.local` (ver §Variables de entorno).

Hasta que esto exista, las fases de BD (2, 4.5, 6, 6.5) quedan bloqueadas. El frontend (Fases 0,
1 parcial, 3 UI) puede avanzar en paralelo con datos mock/tipos provisionales.

---

## 1. Decisiones técnicas fijadas (de CLAUDE.md + docs de compatibilidad)

| Tema | Decisión | Fuente |
|---|---|---|
| Gestor de paquetes | **pnpm** | esta sesión / CLAUDE.md §8 |
| Tailwind | **3.4.x** (NO v4 — rompe iOS 15) | COMPATIBILIDAD-STACK §3 |
| PWA | **serwist** (no next-pwa) | COMPATIBILIDAD-STACK §2 |
| Modales | **Sheet** (Radix), no Drawer (vaul) | COMPATIBILIDAD-STACK §4 |
| Auth en standalone iOS | **OTP código** + Google OAuth; magic link solo fallback navegador | COMPATIBILIDAD-STACK §8 |
| Supabase dev | **Remoto vía MCP** (`apply_migration`, `execute_sql`) | esta sesión |
| Fechas | guardar UTC, render **siempre** `America/Bogota` con `date-fns-tz` | CLAUDE.md §3.5 |
| Estado servidor | TanStack Query (nunca `useEffect` para fetch) | CLAUDE.md §11 |
| Caché/storage | descartable; **Supabase es la fuente de verdad** | COMPATIBILIDAD-STACK §0 |
| Privacidad predicciones | cruza RLS + caché + Realtime (no exponer PII pre-cierre) | REQUIREMENTS §5.4 |

---

## 2. Convenciones transversales (aplican a todas las fases)

- **SQL:** tablas `tbl`+camelCase y vistas `vw`+camelCase, **siempre entre comillas dobles**.
  Columnas en `snake_case`. Una migración por feature lógica, nombradas `NNNN_descripcion.sql`.
- **Naming dominio en español** (`grupo`, `participante`, `prediccion`, `partido`, `equipo`, `regla`).
- **Zod una sola vez** en `lib/schemas/`, reusado en RHF (`zodResolver`) + server actions + tipos
  (`z.infer`).
- **Cada feature cumple el "Done" de CLAUDE.md §10** (Chrome desktop/Android, Safari iOS,
  typecheck, lint, RLS probada con otro usuario, loading/error/empty states, strings es-CO).
- **Mobile-first**: probar en iPhone real (PWA instalada) antes de cerrar — usar el plan de
  pruebas de COMPATIBILIDAD-STACK §10.

---

## 3. Fases (secuenciadas, con dependencias, entregables y criterios de aceptación)

> Mantengo la numeración del roadmap de REQUIREMENTS §9 para trazabilidad, pero añado tareas
> concretas, dependencias y "Done" por fase. Las fases con 🔒 dependen del Bloqueante #0.

### Fase 0 — Setup del proyecto
**Objetivo:** repo Next.js funcional, mobile-first, con la base de compatibilidad ya aplicada.
**Depende de:** nada.

Tareas:
- `pnpm create next-app` (App Router, TS strict, ESLint, Tailwind, alias `@/*`).
- Fijar **`tailwindcss@^3.4`**; configurar `browserslist` (iOS≥15, Safari≥15, Android≥10) y
  confirmar `autoprefixer` en `postcss.config.js`.
- Inicializar **shadcn/ui**; añadir solo lo base (button, input, dialog/**sheet**, form, sonner,
  tabs, tooltip→usar popover en móvil).
- Estructura de carpetas de REQUIREMENTS §8 (`app/(auth)`, `app/(app)`, `components/`, `lib/`).
- `lib/utils/fechas.ts` con helper `formatearFechaBogota()` (`date-fns-tz`, ISO con `T`).
- **PWA base con serwist**: `app/manifest.ts`, `apple-icon`, `viewport` export con
  `viewportFit:'cover'`, `themeColor`, `interactiveWidget`, `colorScheme`; meta `format-detection`.
- CSS global de compat (safe-area en `theme.spacing`, inputs ≥16px, `100dvh` con fallback,
  `color-scheme`, autofill fix, disabled legible).
- Prettier + scripts `dev/build/lint/typecheck`. `.env.example` con los nombres.
- Tokens de marca desde `Desing System/tokens.json` → `tailwind.config.ts`.

**Done:** `pnpm dev` levanta; `pnpm typecheck`/`pnpm lint` limpios; PWA instalable en Android y se
añade a inicio en iOS sin pantalla blanca; tokens de marca aplicados.

---

### Fase 1 — Auth + Layout autenticado
**Objetivo:** login/registro/recuperación + protección de rutas + shell mobile.
**Depende de:** Fase 0 (UI) y Bloqueante #0 (para auth real). El layout/UI puede maquetarse antes.

Tareas:
- `lib/supabase/{client,server,middleware}.ts` con **`@supabase/ssr`** (cookies httpOnly, PKCE).
- Pantalla `/login` con tabs (Iniciar sesión / Crear cuenta), `BotonGoogle`, separador "o",
  formularios RHF+Zod (`lib/schemas/auth.ts`), validación contraseña (≥8, ≥1 número).
- `/forgot-password` y `/reset-password`.
- **OTP de código** como vía principal de email en la PWA (no magic link); magic link solo como
  fallback para navegador no instalado (COMPATIBILIDAD-STACK §8).
- `middleware.ts`: proteger todo excepto `/`, `/login`, `/forgot-password`, `/reset-password`;
  redirigir a `/login` sin sesión; a `/verificar-email` si la ruta lo exige.
- Banner persistente "verifica tu email" con reenvío.
- **Trigger `on_auth_user_created`** que crea `tblProfiles` (migración — 🔒).
- Layout `(app)` con **BottomNav** mobile (safe-area), header, logout.

**Done:** login Google + email/OTP funciona en **iPhone PWA standalone** (sesión persiste tras
matar/reabrir); rutas protegidas redirigen; `tblProfiles` se crea al primer login; refresh de token
tras background no rompe la primera request (§8).

---

### Fase 2 🔒 — Modelo de datos + RLS + Seed
**Objetivo:** esquema completo, políticas deny-by-default y datos del Mundial 2026.
**Depende de:** Bloqueante #0.

Tareas (migraciones separadas):
- `0001_initial_schema.sql`: enums (`fase_torneo`, `rol_participante`) + tablas `tblProfiles`,
  `tblTorneos`, `tblEquipos`, `tblPartidos`, `tblGrupos`, `tblReglasGrupo`, `tblGrupoPartidos`,
  `tblParticipantes`, `tblPredicciones`, `tblTercerLugarAsignacion` + índices (REQUIREMENTS §5.2).
  - ⚠️ Corregir el typo de REQUIREMENTS: columna **`prediccion_unica`** (no `predicccion_unica`).
- `0002_rls_policies.sql`: RLS en todas las tablas, **deny by default** (REQUIREMENTS §5.4). Punto
  crítico: política de `tblPredicciones` que solo deja ver predicciones ajenas **después del
  cierre** (`now() >= partido.fecha_hora - reglas.minutos_cierre_prediccion`).
- `0003_vistas.sql`: `vwTablaPosiciones`, `vwEstadisticasPartido*Global`,
  `vwEstadisticasPartido*Grupo`, `vwPrediccionesGrupoPartido`.
- `0004_seed_mundial_2026.sql`: torneo + 48 equipos (12 grupos A–L) + **104 partidos** con
  `fecha_hora` en **UTC** (convertir desde las horas COL de REQUIREMENTS §6.3 sumando 5h) +
  placeholders de eliminatorias.
- `0005_seed_terceros_fifa.sql`: **495 filas** de `tblTercerLugarAsignacion` (ver Riesgo R2).
- Generar tipos: `supabase gen types` → `lib/supabase/types.ts`.

**Done:** `get_advisors` (security + performance) sin issues críticos; RLS probada con 2 usuarios
(un participante NO ve la predicción nominal de otro antes del cierre, ni por tabla ni por vista);
104 partidos y 48 equipos cargados; tipos TS generados y compilando.

---

### Fase 3 — Wizard de creación de grupo (3 pasos)
**Objetivo:** crear grupo con reglas y selección de partidos en una transacción.
**Depende de:** Fases 1, 2.

Tareas:
- Stepper con indicador `n/3` y estado en Zustand (solo el wizard; no persistir auth ni datos de
  servidor).
- **Paso 1** `PasoDatos`: nombre (3–50, único por creador), descripción (≤280). Zod
  `lib/schemas/grupo.ts`. Torneo auto-asignado al activo.
- **Paso 2** `PasoReglas`: 13 campos numéricos con tooltips (REQUIREMENTS §4.3 tabla), defaults,
  **validación cruzada** `premio_1+premio_2+premio_3=100`. `lib/schemas/reglas.ts`.
- **Paso 3** `PasoPartidos`: 104 partidos agrupados por fase, checkbox por fase (padre) + por
  partido, todos seleccionados por defecto; eliminatorias como "Por definir vs Por definir".
- **Confirmación**: server action transaccional → crea grupo + reglas + `tblGrupoPartidos` +
  participante creador (`admin`) + **código de invitación** 6 chars
  (`lib/utils/codigo-invitacion.ts`, verificar unicidad). Redirige al grupo.

**Done:** wizard navegable en móvil sin zoom de inputs; validación de premios bloquea "Crear";
transacción atómica (si falla un paso, no queda grupo huérfano); código único generado.

---

### Fase 4 — Vista de grupo + Predicciones + Tabla de posiciones
**Objetivo:** el core de uso diario.
**Depende de:** Fases 2, 3.

Tareas:
- Layout de grupo con tabs: **Mis Predicciones, Tabla, Partidos, Reglas, Participantes,
  Configuración** (solo admin).
- `FormularioPrediccion` (dos inputs `inputMode="numeric"`): crear/editar antes del cierre;
  **deshabilitado** si `equipo_local_id`/`equipo_visitante_id` es null (mensaje "equipos por
  definir") o si pasó el cierre. Optimistic update + estado "pendiente" para red inestable (§6).
- **Cierre automático** N min antes del kickoff (validado en servidor/RLS, no solo cliente).
- `TablaPosiciones` desde `vwTablaPosiciones` (TanStack Query). Considerar **Realtime sobre
  agregados** (no sobre la tabla cruda) para live.
- Tab Partidos: lista con marcador real (cuando aplique) + predicción del usuario + badge de puntos.
- Tabs Reglas (solo lectura) y Participantes (con puntaje).

**Done:** predicción se guarda/edita y se bloquea al cierre; formulario deshabilitado correctamente
en eliminatorias sin equipos; tabla de posiciones correcta; todo legible en iOS (inputs disabled,
teclado no tapa submit).

---

### Fase 4.5 🔒 — Estadísticas en la vista de predicción
**Objetivo:** paneles agregados respetando privacidad.
**Depende de:** Fases 2 (vistas), 4.

Tareas:
- Panel **"Todos los usuarios"** (global): `vwEstadisticasPartidoGanadorGlobal` +
  `*MarcadoresGlobal` (top 10). Cache 1–5 min.
- Panel **"Predicciones de mi grupo"** (anónimo antes del cierre): mensaje "secretas…" + agregados
  solo si **≥5 participantes** ya predijeron (umbral de privacidad).
- Lista **nominal post-cierre** (`vwPrediccionesGrupoPartido`): avatar + nombre + marcador + puntos.
  **Nunca** antes del cierre.
- Componente reusable `BarraDistribucion` (barras horizontales de %).

**Done:** con 2 usuarios, antes del cierre NO se ve predicción nominal ajena (UI, API, Realtime ni
caché); umbral de 5 respetado; post-cierre aparece la lista nominal ordenada por puntos.

---

### Fase 5 — Buscar / Unirse a grupo
**Objetivo:** ingreso por código con validaciones.
**Depende de:** Fases 2, 3.

Tareas:
- `/grupos/buscar`: input código → preview (nombre, torneo, descripción, #participantes,
  valor_apuesta) → "Unirme".
- Restricciones: bloquear si el primer partido del grupo ya pasó; si ya es miembro, ir al grupo.

**Done:** unión crea `tblParticipantes` (rol jugador); validaciones de elegibilidad y RLS probadas.

---

### Fase 6 🔒 — Cálculo de puntajes
**Objetivo:** motor de puntos por partido.
**Depende de:** Fase 2; consume datos de Fase 4.

Tareas:
- Edge Function `calcular-puntos` (o función PL/pgSQL) con el algoritmo de REQUIREMENTS §7.1:
  marcador exacto + bono por fase, ganador, goles parciales.
- **Predicción única** (§7.2): post-proceso que marca `prediccion_unica` si exactamente uno acertó
  el marcador en el grupo.
- Trigger `after update on "tblPartidos"` (estado→finalizado) que dispara el cálculo y actualiza
  `puntos_obtenidos`; invalida caché de tabla de posiciones.

**Done:** dado un marcador real, los puntos coinciden con casos de prueba (exacto+bono, solo
ganador, goles parciales, única); idempotente (recalcular no duplica).

---

### Fase 6.5 🔒 — Resolución de cruces eliminatorios
**Objetivo:** auto-poblar el bracket al cerrar fase de grupos.
**Depende de:** Fases 2, 6.

Tareas:
- `tblTercerLugarAsignacion` cargada (495 combos — Fase 2 `0005`).
- Edge Function `cerrar_fase_grupos(torneo_id)`: calcula posiciones por grupo, identifica los **8
  mejores terceros** (criterios de desempate §6.4.2), busca la combinación en la tabla, asigna los
  8 slots de tercero y rellena `equipo_local_id`/`equipo_visitante_id` de los 16 Dieciseisavos.
- Función/trigger que **avanza ganadores** (`G<n>`) y perdedores (`P<n>`, tercer lugar) por la
  llave (Octavos→Final).
- Habilitar formulario de predicción al definirse los equipos.

**Done:** con resultados de grupos de prueba, los 16 Dieciseisavos quedan con equipos correctos;
ganadores avanzan automáticamente; formularios se habilitan al definirse equipos.

---

### Fase 7 — PWA completa + Polish + Performance
**Objetivo:** cumplir No-Funcionales (REQUIREMENTS §3).
**Depende de:** todas las anteriores.

Tareas:
- Iconos PWA todos los tamaños + **splash screens iOS** (todas las resoluciones).
- Estrategia de caché serwist: shell `CacheFirst`, datos `NetworkFirst`/TanStack; **excluir
  endpoints con predicciones nominales** del caché (privacidad).
- Offline básico: ver partidos cargados + draft de predicción local con replay.
- Auditoría iOS Safari real (safe-areas, dvh, teclado, modales) con el checklist de
  COMPATIBILIDAD-MOVIL.
- **Lighthouse ≥ 90** en Performance/A11y/Best Practices/SEO; LCP<2.5s, CLS<0.1.

**Done:** instalable iOS+Android sin pantalla blanca; Lighthouse ≥90; offline básico funciona; sin
regresiones de compatibilidad.

---

### Fase 8 — Admin & Resultados
**Objetivo:** registrar marcadores reales (dispara Fase 6) + notificaciones.
**Depende de:** Fases 6, 6.5.

Tareas:
- Panel admin para registrar marcador/estado de partidos (escritura `service_role` server-side).
- (Opcional) Web Push: iOS 16.4+ solo con PWA instalada y gesto de usuario; backend VAPID en Edge
  Function. Android sin instalación.

**Done:** registrar marcador recalcula puntos y refleja en tabla; push (si se incluye) llega en
Android e iOS PWA instalada.

---

## 4. Ruta crítica y paralelización

```
Bloqueante#0 (Supabase nuevo) ─┬─> Fase 2 ─┬─> Fase 3 ─> Fase 4 ─┬─> Fase 4.5
                               │           │                    └─> Fase 5
Fase 0 ─> Fase 1 (UI) ─────────┘           └─> Fase 6 ─> Fase 6.5
                                                              │
Fases 4.5/5/6.5 ───────────────────────────> Fase 7 ─> Fase 8
```
- **Se puede empezar YA sin Supabase de Polla:** Fase 0 completa + Fase 1 (maquetación de UI de
  auth y layout con mocks).
- **Bloqueante #0** habilita toda la rama de BD. Es lo primero a resolver con el usuario.
- Fases 4.5, 5 y 6 son independientes entre sí una vez existe Fase 4 + Fase 2.

---

## 5. Riesgos y mitigaciones

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| **R0** | MCP apunta a BD de otra app (Natillera, producción) | Crítico | Bloqueante #0: proyecto Supabase dedicado antes de migrar. No ejecutar SQL de Polla en la BD actual. |
| **R1** | Seed de 104 partidos con horas en COL → hay que pasarlas a UTC | Alto | Script de conversión (+5h) revisado a mano; validar contra REQUIREMENTS §6.3; probar render en `America/Bogota`. |
| **R2** | 495 combinaciones FIFA de terceros (datos no incluidos en REQUIREMENTS) | Alto | **Decisión pendiente del usuario:** ¿de dónde salen las 495 filas? (tabla oficial FIFA). Generar/parsear y cargar en `0005`. Bloquea Fase 6.5, no el MVP. |
| **R3** | Privacidad de predicciones (RLS + caché + Realtime) | Crítico | RLS deny-by-default; no cachear ni hacer Realtime sobre `tblPredicciones` cruda pre-cierre; probar con 2 usuarios reales. |
| **R4** | Cierre de predicción evadible desde cliente | Alto | Validar el cierre en servidor/RLS, no solo en UI. |
| **R5** | Auth en PWA standalone iOS (OAuth/magic link) | Alto | OTP código como vía principal; PKCE + cookies SSR; probar en iPhone instalado (§8). |
| **R6** | Entrega de predicciones con red inestable (WiFi estadio) | Alto | `networkMode:"online"` + retries + mutaciones persistidas + UI "pendiente" (COMPATIBILIDAD-STACK §6). |
| **R7** | Typo `predicccion_unica` en REQUIREMENTS | Bajo | Usar `prediccion_unica` consistente en migración, tipos y código. |

---

## 6. Decisiones que necesito del usuario antes de ciertas fases

1. **Bloqueante #0:** crear el proyecto Supabase de Polla y confirmar `project-id` para el MCP.
2. **R2 (Fase 6.5):** fuente de las 495 combinaciones FIFA de terceros (¿archivo oficial,
   CSV, o las generamos desde la regla de asignación?).
3. **Realtime:** ¿tabla de posiciones en vivo desde el MVP (Fase 4) o se difiere a Polish?
4. **Notificaciones push (Fase 8):** ¿dentro de scope inicial o futuro?

### 6.1 Decisiones ya resueltas
- **Roles (resuelto en REQUIREMENTS §4.6):** tres figuras — *participante (jugador)*, *admin de
  grupo* (rol en `tblParticipantes`, solo gestiona su polla) y *admin de plataforma*
  (`service_role`/job, registra marcadores reales). **Los marcadores reales NUNCA los fija el admin
  de grupo.** En el MVP el admin de plataforma se materializa solo vía `service_role` (sin rol en
  BD); una tabla `tblAdminsPlataforma` o claim de rol queda fuera de scope inicial.

---

## 7. Variables de entorno (`.env.local`, no commitear)

```
NEXT_PUBLIC_SUPABASE_URL=            # del proyecto Polla nuevo (Bloqueante #0)
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # solo server-side (Edge Functions / route handlers)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 8. Propuesta de arranque inmediato (sin esperar a Supabase)

Si se aprueba este plan, el primer bloque de trabajo sin dependencias externas es:
1. **Fase 0 completa** (Next + Tailwind 3.4 + shadcn + PWA serwist + compat CSS + tokens).
2. **Fase 1 — UI** (login/registro/recuperación + layout autenticado con BottomNav), maquetada y
   validada en móvil, lista para cablear contra Supabase apenas exista el proyecto.

En paralelo, el usuario resuelve el **Bloqueante #0** para desbloquear la rama de base de datos.

---

**Última actualización:** Fase 0 — plan inicial. Actualizar al cerrar cada fase.
