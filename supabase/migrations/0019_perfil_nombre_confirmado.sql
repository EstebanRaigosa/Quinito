-- ── Perfil: confirmación del nombre visible tras registrarse ───────────────
-- Marca si el usuario ya configuró/confirmó su nombre (el que ven los demás en
-- las pollas). Mientras sea `false`, el shell autenticado muestra un modal que
-- le pide ingresar su nombre. Los registros existentes quedan en `false` para
-- que confirmen su nombre una vez en el próximo ingreso.
alter table public."tblProfiles"
  add column nombre_confirmado boolean not null default false;

comment on column public."tblProfiles".nombre_confirmado is
  'true cuando el usuario ya configuró su nombre visible desde el onboarding o Perfil; mientras sea false se le pide en un modal al entrar.';
