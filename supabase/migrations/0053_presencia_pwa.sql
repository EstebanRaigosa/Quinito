-- Distinguir navegador vs PWA instalada en la presencia, y registrar quién
-- tiene la app instalada (panel de admin de plataforma).
--
-- Dos señales distintas:
--   * tblSesionesActivas.es_pwa  -> EN VIVO: ¿esta sesión corre como PWA
--     standalone (app instalada) o en el navegador? Lo manda el latido del
--     cliente (matchMedia('(display-mode: standalone)') / navigator.standalone).
--   * tblProfiles.pwa_instalada_en -> HISTÓRICO: primera vez que detectamos a
--     ese usuario corriendo en modo standalone. Es el proxy CONFIABLE de
--     "descargó/instaló la PWA": el evento `appinstalled` no existe en iOS, en
--     cambio el modo standalone sí se observa en iOS, Android y escritorio.

-- 1) Flag en vivo de la sesión: ¿viene de la PWA instalada?
alter table public."tblSesionesActivas"
  add column if not exists es_pwa boolean not null default false;

comment on column public."tblSesionesActivas".es_pwa is
  'true = la sesión corre como PWA standalone (app instalada); false = navegador. Lo reporta el latido del cliente.';

-- 2) Sello histórico: cuándo se vio por primera vez a este usuario en la PWA.
--    null = nunca lo hemos visto entrar desde la app instalada.
alter table public."tblProfiles"
  add column if not exists pwa_instalada_en timestamptz;

comment on column public."tblProfiles".pwa_instalada_en is
  'Primera vez que el usuario abrió la app en modo PWA standalone (proxy de "instaló la PWA"). null si solo ha usado el navegador.';

-- Para listar/contar rápido a quienes tienen la app instalada.
create index if not exists "idx_profiles_pwa_instalada_en"
  on public."tblProfiles" (pwa_instalada_en desc)
  where pwa_instalada_en is not null;

-- 3) Al recibir un latido en modo PWA, sellar la fecha de instalación si aún no
--    estaba. SECURITY DEFINER para poder tocar tblProfiles de forma controlada
--    desde el upsert del propio usuario (independiente de su RLS). Solo escribe
--    cuando pwa_instalada_en está null: una vez sellado, no se reescribe.
create or replace function public.marcar_pwa_instalada()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public."tblProfiles"
    set pwa_instalada_en = now()
    where id = new.usuario_id
      and pwa_instalada_en is null;
  return new;
end;
$$;

drop trigger if exists "trg_marcar_pwa_instalada" on public."tblSesionesActivas";
create trigger "trg_marcar_pwa_instalada"
  after insert or update on public."tblSesionesActivas"
  for each row
  when (new.es_pwa)
  execute function public.marcar_pwa_instalada();

-- Es una trigger function: el trigger la corre sin importar permisos de rol.
-- Revocamos EXECUTE a los roles públicos para que NO quede expuesta como RPC
-- (`/rest/v1/rpc/marcar_pwa_instalada`) — un SECURITY DEFINER no debe ser
-- invocable por anon/authenticated (advisor de seguridad).
revoke execute on function public.marcar_pwa_instalada() from public, anon, authenticated;
