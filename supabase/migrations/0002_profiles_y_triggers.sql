-- ── Perfiles (extiende auth.users) ────────────────────────────────────────
create table public."tblProfiles" (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  nombre_completo text,
  avatar_url text,
  creado_en timestamptz default now() not null,
  actualizado_en timestamptz default now() not null
);

-- ── Trigger genérico: mantener actualizado_en ─────────────────────────────
create or replace function public.set_actualizado_en()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

create trigger "trgProfilesActualizado"
  before update on public."tblProfiles"
  for each row execute function public.set_actualizado_en();

-- ── Trigger: crear perfil automáticamente al registrar un usuario ──────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public."tblProfiles" (id, email, nombre_completo, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
