-- Actividad de sesión para el panel de admin: última vez que el usuario CERRÓ
-- sesión y por qué. (El "última vez que INICIÓ sesión" no se guarda aquí: se lee
-- de `auth.users.last_sign_in_at`, que Supabase ya mantiene.)
--
-- Decisión de alcance (junio 2026): la app permite multi-dispositivo (sin sesión
-- única) y la inactividad solo recarga (no cierra). Por eso, hoy la única razón
-- de cierre que se captura de forma fiable es 'manual' (botón "Cerrar sesión",
-- registrado justo antes de `signOut` mientras aún hay sesión). El resto de
-- valores del enum quedan listos para cuando existan esos flujos:
--   - 'inactividad'    → si se reinstaura el cierre por inactividad.
--   - 'otro_dispositivo' → si se implementa sesión única (revocación server-side).
--   - 'desconocida'    → cierres no instrumentados (token vencido, cookies, etc.).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'razon_cierre_sesion') then
    create type public.razon_cierre_sesion as enum (
      'manual',
      'inactividad',
      'otro_dispositivo',
      'desconocida'
    );
  end if;
end$$;

alter table public."tblProfiles"
  add column if not exists ultimo_cierre_en timestamptz,
  add column if not exists razon_ultimo_cierre public.razon_cierre_sesion;

comment on column public."tblProfiles".ultimo_cierre_en is
  'Última vez que el usuario cerró sesión (lo escribe el cliente antes de signOut). null si nunca cerró sesión desde que existe el tracking.';
comment on column public."tblProfiles".razon_ultimo_cierre is
  'Razón del último cierre de sesión. Hoy solo se captura "manual"; el resto del enum queda para flujos futuros (sesión única, inactividad).';
