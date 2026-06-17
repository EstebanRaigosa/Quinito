# CLAUDE.md

> Contexto persistente y reglas del proyecto. **Lee esto al inicio de cada sesión.**

---

## 1. ¿Qué es este proyecto?

Plataforma web (Next.js + Supabase) para crear y participar en **pollas / quinielas grupales** de torneos de fútbol completos. El primer torneo soportado es el **Mundial 2026**.

Inspirado en `pollamundial.org`. Para detalles funcionales completos consulta [`REQUIREMENTS.md`](./REQUIREMENTS.md).

**Estado actual:** Fase 0 — Setup inicial.

---

## 2. Stack y versiones

| Capa | Tecnología | Versión objetivo |
|---|---|---|
| Framework | Next.js (App Router) | 14.x o superior |
| Lenguaje | TypeScript | 5.x — `strict: true` |
| Estilos | Tailwind CSS | 3.x |
| Componentes | shadcn/ui | latest |
| Validación | Zod | 3.x |
| Formularios | React Hook Form | 7.x |
| Estado servidor | TanStack Query | 5.x |
| Estado cliente | Zustand | 4.x |
| Backend | Supabase | latest |
| PWA | serwist (preferido) o next-pwa | latest |
| Iconos | lucide-react | latest |

**No agregar dependencias** sin justificación. Antes de instalar algo, evalúa si se puede resolver con lo que ya hay.

---

## 3. Reglas duras (no negociables)

### 3.1 TypeScript
- `strict: true` siempre. **Nunca `any`** salvo en utilidades de testing claramente marcadas.
- Tipos de Supabase generados con: `npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts`. Re-generar tras cada migración.
- Preferir `type` para uniones / aliases, `interface` solo para extender props de componentes.

### 3.2 Idioma del código
- **Código en español** para nombres de dominio del producto (ej. `grupos`, `participantes`, `predicciones`, `reglas`).
- **Código en inglés** para conceptos técnicos / framework (ej. `useState`, `loading`, `error`, `handleClick`).
- **Comentarios y docs en español.**
- **Mensajes de UI en español (es-CO).**

### 3.2.1 Convención de nombres SQL
- **Tablas:** prefijo `tbl` + camelCase (ej. `tblProfiles`, `tblReglasGrupo`, `tblGrupoPartidos`).
- **Vistas:** prefijo `vw` + camelCase (ej. `vwTablaPosiciones`, `vwEstadisticasPartidoGanadorGlobal`).
- **Columnas:** snake_case sin prefijo (ej. `creado_en`, `equipo_local_id`, `puntos_obtenidos`). Esto sigue el idioma de Postgres y evita comillas en los queries más frecuentes.
- **Tipos custom (enums):** snake_case (ej. `fase_torneo`, `rol_participante`).
- **En SQL, los nombres de tablas y vistas SIEMPRE van entre comillas dobles:** `select * from public."tblGrupos"`. Sin las comillas, Postgres lo convierte a `tblgrupos` (todo en minúsculas) y falla con `relation "tblgrupos" does not exist`.
- **En los tipos generados de Supabase**, las tablas aparecen con su nombre tal cual (`Database['public']['Tables']['tblGrupos']`) — no requieren comillas porque ya son strings en TS.

### 3.3 Mobile-first y compatibilidad
- **REGLA DURA — validar compatibilidad en CADA cambio:** ninguna modificación (UI, CSS, modal, formulario, animación, gesto/drag, dependencia nueva o capa PWA/auth/datos) se da por terminada sin verificar que **NO rompe la compatibilidad con Safari, iOS, iPhone y Android**. Esto aplica a *todo* cambio, por pequeño que parezca. Ante la duda, revisa el checklist de abajo y los docs de compatibilidad **antes** de cerrar el cambio; si algo es riesgoso en WebKit/iOS, decláralo y propón la alternativa segura.
- Siempre diseñar primero para mobile (`< 640px`) y escalar arriba.
- **Probar en Safari iOS** antes de dar por terminada una vista. Atender:
  - Safe areas (`env(safe-area-inset-*)`)
  - Usar `100dvh` en lugar de `100vh`.
  - `viewport-fit=cover` en el meta viewport.
  - Inputs sin zoom involuntario (font-size ≥ 16px).
  - Tap targets ≥ 44px.
  - Sin `position: sticky` problemático en iOS Safari (probar siempre).
- Compatibilidad mínima: iOS 15+, Android 10+ Chrome.
- **Antes de crear/modificar UI, modales, formularios o la capa PWA/auth/datos, consulta:**
  - [`COMPATIBILIDAD-MOVIL.md`](./COMPATIBILIDAD-MOVIL.md) — bugs de CSS/WebKit (viewport, safe-area, modales, scroll lock, teclado, inputs).
  - [`COMPATIBILIDAD-STACK.md`](./COMPATIBILIDAD-STACK.md) — issues por tecnología del stack (Next.js, PWA/serwist, Tailwind, shadcn/Radix, RHF, TanStack Query, Zustand, Supabase). Incluye las decisiones clave (§0) y el plan de pruebas en dispositivo (§10).
  - [**`COMPATIBILIDAD-MOVIL.md` › "Estado implementado — NO ROMPER"**](./COMPATIBILIDAD-MOVIL.md#estado-implementado--no-romper) — **registro de invariantes ya verificados + decisiones tomadas** (auditoría jun 2026). **Léelo antes de refactorizar/"simplificar"** `app/sw.ts`, `app/globals.css`, footers/sticky, `CuentaRegresiva`, el guardado de predicción (`useMutation`), el middleware (`/unirse`) o el store del wizard (`persist`): revertir esos patrones reintroduce bugs reales de iPhone/Android. Si cambiás uno, **actualiza ese registro**.

### 3.4 Seguridad
- **Nunca** usar `service_role` key en cliente. Solo en Edge Functions / route handlers server-side.
- **Nunca** desactivar RLS — si una query falla por RLS, ajustar la política, no bypassearla.
- Validar **siempre** inputs en cliente (UX) Y en servidor / RLS (seguridad).
- No loggear datos sensibles (emails completos, tokens).
- **Privacidad de predicciones:** antes del cierre del partido, ningún endpoint, vista o query puede revelar la predicción individual de un usuario distinto al que está consultando. Solo se permiten agregados anónimos (% de ganador, top marcadores). Esta regla aplica tanto a UI como a logs y respuestas de API.

### 3.5 Zona horaria
- Guardar todos los timestamps en UTC (`timestamptz` en Postgres).
- Renderizar **siempre** en `America/Bogota` salvo que el usuario configure otra (futuro).
- Usar `date-fns-tz` o `Intl.DateTimeFormat` con `timeZone: 'America/Bogota'`.

### 3.6 Accesibilidad
- Todos los inputs deben tener `<label>` asociado.
- Botones-icono requieren `aria-label`.
- Modales/dialogs con focus trap (shadcn/ui Dialog ya lo hace).
- Contraste WCAG AA mínimo.

---

## 4. Convenciones de código

### 4.1 Nombres de archivos
- Componentes React: `PascalCase.tsx` (ej. `TarjetaGrupo.tsx`).
- Hooks: `useNombreCamello.ts` (ej. `useGrupos.ts`).
- Utilidades: `kebab-case.ts` (ej. `codigo-invitacion.ts`).
- Páginas (App Router): `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` (convención de Next).
- Schemas Zod: en `lib/schemas/<entidad>.ts`.

### 4.2 Estructura de componentes
```tsx
"use client"; // solo si es necesario

import { ... } from "...";

type Props = {
  // ...
};

export function NombreComponente({ ...props }: Props) {
  // hooks
  // handlers
  // render
}
```

- **Server Components por defecto.** Marcar `"use client"` solo cuando se necesite (estado, eventos, hooks de browser).
- Props tipadas siempre. Evitar `React.FC`.
- Componentes grandes → extraer subcomponentes en el mismo archivo si solo se usan ahí, o en archivos separados si son reutilizables.

### 4.3 Estilos
- Tailwind clases en orden: layout → spacing → typography → color → state.
- Usar `cn()` de `lib/utils` para combinar clases condicionales.
- Variables de tema en `tailwind.config.ts` (colores de marca, fuentes).
- Animaciones / transiciones cortas (200–300ms). Evitar animaciones que distraigan en mobile.

### 4.4 Supabase
- **Cliente browser:** `lib/supabase/client.ts` — usar en componentes `"use client"`.
- **Cliente server:** `lib/supabase/server.ts` — usar en RSC, route handlers, server actions.
- **Tipar con los tipos generados:** `Database` de `lib/supabase/types.ts`.
- **Queries reutilizables:** encapsular en hooks (`useGrupos`, `usePartidos`) que usen TanStack Query.
- **Mutaciones:** server actions cuando se pueda; si no, mutaciones en cliente con TanStack Query + invalidación.

### 4.5 Validación con Zod
- Definir schema una sola vez en `lib/schemas/<entidad>.ts`.
- Reusar el schema en:
  - React Hook Form (`zodResolver`).
  - Server actions (revalidación antes de tocar DB).
  - Tipos TS derivados con `z.infer<typeof schema>`.

### 4.6 Manejo de errores
- Errores de red / Supabase → mostrar `toast.error` con mensaje en español claro.
- Errores de validación → mostrar inline en el campo.
- **Nunca** mostrar stack traces al usuario.
- Loggear con `console.error` solo en desarrollo.

### 4.7 Modales (Dialog / Sheet)
- **Botón/gesto "atrás" cierra la modal** (no navega): lo maneja `useModalBackClose` dentro del `Content` vía historial. No lo re-implementes por modal. Ver `lib/utils/modal-historial.ts`.

---

## 5. Modelo de datos — referencia rápida

> **Convención de nombres:** todas las tablas usan prefijo `tbl` en camelCase, todas las vistas prefijo `vw`. Como PostgreSQL es case-sensitive con identificadores que tienen mayúsculas, en SQL **siempre van entre comillas dobles**: `"tblProfiles"`, `"vwTablaPosiciones"`. Olvidar las comillas hace que Postgres busque `tblprofiles` (todo en minúscula) y falle con `relation does not exist`.

| Tabla / Vista | Descripción | RLS clave |
|---|---|---|
| `tblProfiles` | Datos de usuario (extiende `auth.users`) | Cada usuario lee/edita solo su registro |
| `tblTorneos` | Catálogo de torneos | Lectura pública (autenticados); escritura `service_role` |
| `tblEquipos` | Selecciones por torneo | Lectura pública; escritura `service_role` |
| `tblPartidos` | Partidos del torneo (con marcador real y placeholders) | Lectura pública; escritura `service_role` |
| `tblTercerLugarAsignacion` | Tabla de configuración FIFA: 495 combinaciones de cómo se asignan los 8 mejores terceros a los slots del bracket | Lectura pública; escritura `service_role` |
| `tblGrupos` | Pollas/quinielas creadas por usuarios | Lectura por participantes + por código; escritura por creador |
| `tblReglasGrupo` | Reglas 1-1 con grupo | Lectura por participantes; escritura por admin del grupo |
| `tblGrupoPartidos` | N-N: qué partidos apuesta cada grupo | Lectura por participantes; escritura por admin del grupo |
| `tblParticipantes` | Miembros de cada grupo | Cada usuario ve sus grupos; admin gestiona miembros |
| `tblPredicciones` | Predicciones de cada participante | **Antes del cierre:** usuario ve solo las suyas. **Después del cierre:** miembros del grupo ven las de todos los participantes del grupo. |
| `vwEstadisticasPartido*Global` | Agregados por partido (toda la plataforma) | Lectura pública para autenticados (sin PII) |
| `vwEstadisticasPartido*Grupo` | Agregados por partido y grupo | Lectura solo para miembros del grupo |
| `vwPrediccionesGrupoPartido` | Predicciones nominales por grupo | Lectura solo después del cierre del partido |

> **Regla de oro de privacidad:** ninguna query, vista o endpoint debe revelar **qué usuario predijo qué marcador** antes del cierre del partido. Solo agregados anónimos (porcentajes, conteos) son visibles antes.

> **Lógica de cruces eliminatorios:** la sección 6.4 de `REQUIREMENTS.md` define cómo se "auto-pueblan" los partidos eliminatorios al cerrar fase de grupos. Los partidos eliminatorios usan `placeholder_local`/`placeholder_visitante` (ej. `'2A'`, `'G74'`, `'3ABCDF'`) hasta que se determinan los equipos reales. **No predecir antes de tiempo:** si un partido tiene `equipo_local_id` o `equipo_visitante_id` en `null`, el formulario de predicción debe estar deshabilitado.

Schema completo: ver sección 5 de [`REQUIREMENTS.md`](./REQUIREMENTS.md).

---

## 6. Comandos importantes

```bash
# Desarrollo
npm run dev                    # arranca Next dev server
npm run build                  # build producción
npm run lint                   # ESLint
npm run typecheck              # tsc --noEmit

# Supabase
npx supabase start             # arranca Supabase local
npx supabase db reset          # reset DB local + aplica migraciones + seed
npx supabase gen types typescript --local > lib/supabase/types.ts
npx supabase migration new <nombre>   # nueva migración
npx supabase db push           # aplica migraciones a remoto

# Testing manual mobile
# Usar ngrok o el QR de Vercel deployment para probar en dispositivos reales
```

---

## 7. Cómo trabajamos juntos (reglas de la sesión)

### 7.1 Antes de implementar algo grande
1. **Confirmar el scope** con el usuario si la tarea es ambigua o tiene varias rutas posibles.
2. **Revisar `REQUIREMENTS.md`** para asegurar alineación con lo definido.
3. **Listar los pasos** brevemente antes de ejecutar (no para cada cambio mínimo, sí para features completas).

### 7.1.1 Al cerrar CUALQUIER cambio
- **Validar compatibilidad móvil (regla dura §3.3):** confirmar que el cambio no rompe **Safari, iOS, iPhone ni Android**. Si tocaste UI/CSS/modales/gestos, revisa el checklist de §3.3 y [`COMPATIBILIDAD-MOVIL.md`](./COMPATIBILIDAD-MOVIL.md) / [`COMPATIBILIDAD-STACK.md`](./COMPATIBILIDAD-STACK.md). Reporta explícitamente qué validaste (o qué quedó por probar en dispositivo real).

### 7.2 Migraciones SQL
- **Una migración por feature lógica.** No mezclar cambios de schema con seed data.
- Nombrar: `NNNN_descripcion_corta.sql` (ej. `0004_indices_predicciones.sql`).
- Probar localmente con `supabase db reset` antes de pushear a remoto.
- **Nunca editar una migración ya aplicada en producción** — siempre crear una nueva.

### 7.3 Componentes UI nuevos
- Antes de crear un componente desde cero, revisar si shadcn/ui ya tiene uno.
- Si lo tiene, agregarlo con: `npx shadcn-ui@latest add <componente>`.
- Personalizar editando los archivos generados en `components/ui/`.

### 7.4 Naming en español del dominio
Conservar el vocabulario del producto en código:
- `grupo`, no `group` ni `pool`.
- `participante`, no `member`.
- `prediccion`, no `prediction`.
- `partido`, no `match`.
- `equipo`, no `team`.
- `regla`, no `rule`.

### 7.5 Cuando algo no encaja con `REQUIREMENTS.md`
- **Detente**, no improvises cambios al modelo.
- Plantéaselo al usuario y propón actualización del REQUIREMENTS antes de codear.

### 7.6 Pruebas
- Aún no hay framework de testing configurado. Cuando se agregue, será **Vitest + Testing Library**.
- Por ahora: pruebas manuales rigurosas en mobile (Chrome Android + Safari iOS) antes de cerrar features.

---

## 8. Dependencias del entorno

- **Node:** ≥ 20.x LTS.
- **Package manager:** pnpm preferido (más rápido, mejor manejo de monorepo si crece). Si ya está iniciado con npm, mantener npm.
- **OS de desarrollo:** Windows / macOS / Linux indistinto. Atender finales de línea: `core.autocrlf=input` en Git para evitar `^M`.

---

## 9. Variables de entorno

Crear `.env.local` (nunca commitear):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # solo server-side
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Mantener `.env.example` actualizado y commiteado con los nombres (sin valores).

---

## 10. Criterios de "Done" para una feature

Una feature se considera completa cuando:

- [ ] Funciona en Chrome desktop.
- [ ] Funciona en Chrome Android.
- [ ] Funciona en Safari iOS (real o simulador).
- [ ] No hay errores de TypeScript (`npm run typecheck`).
- [ ] No hay warnings de ESLint relevantes (`npm run lint`).
- [ ] RLS policies probadas (intento de acceso con usuario distinto debe fallar).
- [ ] Estados de loading y error visibles y manejados.
- [ ] Empty states diseñados (no dejar pantallas en blanco).
- [ ] Strings en español, sin texto en inglés visible al usuario.
- [ ] Inputs validados con Zod.
- [ ] Si hubo cambios de schema: migración creada, tipos regenerados, seed actualizado si aplica.

---

## 11. Anti-patrones a evitar

- ❌ `useEffect` para fetching de datos → usar TanStack Query o Server Components.
- ❌ Lógica de negocio en componentes → moverla a hooks o utilidades.
- ❌ Tipos `any` o `unknown` sin narrowing.
- ❌ Strings hardcoded en componentes para textos de UI repetidos → centralizar en `lib/constants.ts` o i18n cuando se sume.
- ❌ Inline styles (`style={{...}}`) salvo que sea estrictamente necesario (ej. valores dinámicos no expresables con Tailwind).
- ❌ Llamar al cliente Supabase desde múltiples lugares con la misma query → encapsular en un hook.
- ❌ Mostrar IDs (UUIDs) crudos al usuario.
- ❌ Permitir que la zona horaria del navegador determine fechas mostradas — siempre forzar `America/Bogota`.

---

## 12. Recursos clave

- [`REQUIREMENTS.md`](./REQUIREMENTS.md) — fuente de verdad funcional.
- [`COMPATIBILIDAD-MOVIL.md`](./COMPATIBILIDAD-MOVIL.md) — compatibilidad CSS/WebKit (iOS Safari + Android).
- [`COMPATIBILIDAD-STACK.md`](./COMPATIBILIDAD-STACK.md) — compatibilidad por tecnología del stack (runtime).
- [Supabase Docs](https://supabase.com/docs)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- Calendario oficial Mundial 2026: ver sección 6.3 de REQUIREMENTS.md.

---

**Última actualización:** Inicio del proyecto. Actualizar al cerrar cada fase del roadmap.
