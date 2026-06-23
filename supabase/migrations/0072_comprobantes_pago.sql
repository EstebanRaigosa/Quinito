-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Comprobantes de pago (uno por abono)                                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Cada abono (pago parcial, ver 0036) pasa a tener un COMPROBANTE con un código
-- único, legible y buscable. Sirve para que el admin (o superadmin) compruebe,
-- a partir del código que el participante presenta, CUÁNDO se hizo el pago y por
-- QUÉ valor. El código se imprime en la imagen tipo ticket del comprobante.
--
-- Patrón (igual que 0036_abonos_pagos): tabla → RLS SELECT con `es_admin_grupo`
-- (ya superadmin-aware, 0020) → escrituras solo por RPCs SECURITY DEFINER.
--
-- Privacidad (CLAUDE.md §3.4): los montos y la existencia de un comprobante solo
-- son visibles para el admin del grupo o el superadmin. La búsqueda por código
-- (`buscar_comprobante`) aplica el mismo guard, así que un código de otra polla
-- no devuelve nada para un admin que no la administra.

-- ── Tabla de comprobantes ────────────────────────────────────────────────────
-- `abono_id` es 1-1 (un comprobante por abono). `grupo_id`/`participante_id`/
-- `monto` se denormalizan desde el abono para que la búsqueda y el RLS sean
-- directos (sin subselects por fila) y para que el comprobante conserve el valor
-- aunque a futuro cambie algo del abono.
create table public."tblComprobantes" (
  id              uuid primary key default gen_random_uuid(),
  codigo          text not null unique,
  abono_id        uuid not null unique references public."tblAbonos"(id)        on delete cascade,
  participante_id uuid not null        references public."tblParticipantes"(id) on delete cascade,
  grupo_id        uuid not null        references public."tblGrupos"(id)        on delete cascade,
  monto           numeric(12,2) not null,
  creado_en       timestamptz   not null default now()
);

create index "idxComprobantesGrupo" on public."tblComprobantes" (grupo_id);

alter table public."tblComprobantes" enable row level security;

-- Solo el admin del grupo (o superadmin) puede LEER los comprobantes. Las
-- escrituras van por RPC security definer → sin policies de write.
create policy "comprobantes_select" on public."tblComprobantes"
for select to authenticated using (es_admin_grupo(grupo_id));

-- ── Generador de código único ────────────────────────────────────────────────
-- Formato: "CMP-XXXXXXXX" con un alfabeto sin caracteres ambiguos (sin O/0/I/1/L)
-- para que se pueda dictar/teclear sin confusiones. `random()` basta: el código
-- no es un secreto, solo un identificador legible; el control de acceso lo da el
-- RLS. Reintenta ante una colisión (improbable: 31^8 combinaciones).
create or replace function public.gen_codigo_comprobante()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_codigo text;
  v_intentos int := 0;
begin
  loop
    v_codigo := 'CMP-';
    for i in 1..8 loop
      v_codigo := v_codigo
        || substr(v_alfabeto, 1 + floor(random() * length(v_alfabeto))::int, 1);
    end loop;
    exit when not exists (
      select 1 from public."tblComprobantes" where codigo = v_codigo
    );
    v_intentos := v_intentos + 1;
    if v_intentos > 20 then
      raise exception 'No se pudo generar un código de comprobante único';
    end if;
  end loop;
  return v_codigo;
end;
$$;

revoke execute on function public.gen_codigo_comprobante() from public, anon, authenticated;

-- ── RPC: registrar un abono (ahora crea su comprobante) ──────────────────────
-- Reemplaza la versión de 0036: además del abono, inserta su comprobante y
-- DEVUELVE EL CÓDIGO (text) en vez del uuid del abono. El cliente no usaba el
-- uuid devuelto; ahora recibe el código para mostrarlo/compartirlo de una vez.
-- El cambio de tipo de retorno (uuid → text) obliga a DROP previo: Postgres no
-- permite cambiar la firma de retorno con `create or replace`.
drop function if exists public.registrar_abono(uuid, numeric, text);
create or replace function public.registrar_abono(
  p_participante_id uuid,
  p_monto numeric,
  p_nota text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id uuid;
  v_valor_apuesta numeric;
  v_total numeric;
  v_abono_id uuid;
  v_codigo text;
begin
  -- Resolver grupo y valor de la apuesta del participante.
  select pa.grupo_id, coalesce(r.valor_apuesta, 0)
    into v_grupo_id, v_valor_apuesta
  from public."tblParticipantes" pa
  left join public."tblReglasGrupo" r on r.grupo_id = pa.grupo_id
  where pa.id = p_participante_id;

  if v_grupo_id is null then
    raise exception 'El participante no existe';
  end if;

  if not public.es_admin_grupo(v_grupo_id) then
    raise exception 'Solo el administrador puede registrar pagos' using errcode = '42501';
  end if;

  if v_valor_apuesta <= 0 then
    raise exception 'Esta polla no tiene costo' using errcode = '22023';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a cero' using errcode = '22023';
  end if;

  -- Lock de la fila del participante: serializa abonos simultáneos para que el
  -- tope (suma agregada) no se pueda burlar por una condición de carrera.
  perform 1 from public."tblParticipantes" where id = p_participante_id for update;

  select coalesce(sum(monto), 0) into v_total
  from public."tblAbonos" where participante_id = p_participante_id;

  if v_total + p_monto > v_valor_apuesta then
    raise exception 'El abono excede el saldo pendiente' using errcode = '22023';
  end if;

  insert into public."tblAbonos" (participante_id, grupo_id, monto, nota, registrado_por)
  values (p_participante_id, v_grupo_id, p_monto, nullif(btrim(p_nota), ''), auth.uid())
  returning id into v_abono_id;

  -- Comprobante 1-1 del abono recién creado.
  insert into public."tblComprobantes" (codigo, abono_id, participante_id, grupo_id, monto)
  values (public.gen_codigo_comprobante(), v_abono_id, p_participante_id, v_grupo_id, p_monto)
  returning codigo into v_codigo;

  -- Re-sincronizar el boolean que leen grupo_detalle / mis_grupos.
  update public."tblParticipantes"
     set pago_realizado = (v_total + p_monto >= v_valor_apuesta)
   where id = p_participante_id;

  return v_codigo;
end;
$$;

revoke execute on function public.registrar_abono(uuid, numeric, text) from public, anon;
grant execute on function public.registrar_abono(uuid, numeric, text) to authenticated;

-- ── RPC: historial de abonos (ahora incluye el código del comprobante) ───────
-- Reemplaza la versión de 0036 sumando `codigo`. El left join tolera abonos sin
-- comprobante (no debería haber tras el seed, pero no rompe si falta).
-- Sumar una columna a RETURNS TABLE cambia la firma de retorno → DROP previo.
drop function if exists public.listar_abonos(uuid);
create or replace function public.listar_abonos(p_participante_id uuid)
returns table (
  id uuid,
  monto numeric,
  nota text,
  creado_en timestamptz,
  registrado_por_nombre text,
  codigo text
)
language sql
security definer
stable
set search_path = public
as $$
  select a.id, a.monto, a.nota, a.creado_en, prof.nombre_completo, c.codigo
  from public."tblAbonos" a
  join public."tblParticipantes" pa on pa.id = a.participante_id
  left join public."tblProfiles" prof on prof.id = a.registrado_por
  left join public."tblComprobantes" c on c.abono_id = a.id
  where a.participante_id = p_participante_id
    and public.es_admin_grupo(pa.grupo_id)
  order by a.creado_en desc;
$$;

revoke execute on function public.listar_abonos(uuid) from public, anon;
grant execute on function public.listar_abonos(uuid) to authenticated;

-- ── RPC: buscar un comprobante por código ────────────────────────────────────
-- Devuelve 0 o 1 fila. El guard `es_admin_grupo(c.grupo_id)` hace que:
--   • el admin de una polla solo encuentre códigos de SUS pollas,
--   • el superadmin encuentre cualquier código.
-- Búsqueda case-insensitive y tolerante a espacios.
create or replace function public.buscar_comprobante(p_codigo text)
returns table (
  codigo text,
  monto numeric,
  creado_en timestamptz,
  metodo text,
  participante_nombre text,
  grupo_id uuid,
  grupo_nombre text,
  valor_apuesta numeric,
  total_abonado numeric,
  pagado boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    c.codigo,
    c.monto,
    c.creado_en,
    a.nota                                   as metodo,
    prof.nombre_completo                     as participante_nombre,
    c.grupo_id,
    g.nombre                                 as grupo_nombre,
    coalesce(r.valor_apuesta, 0)             as valor_apuesta,
    coalesce(tot.total_abonado, 0)           as total_abonado,
    pa.pago_realizado                        as pagado
  from public."tblComprobantes" c
  join public."tblAbonos" a          on a.id = c.abono_id
  join public."tblParticipantes" pa  on pa.id = c.participante_id
  left join public."tblProfiles" prof on prof.id = pa.usuario_id
  join public."tblGrupos" g          on g.id = c.grupo_id
  left join public."tblReglasGrupo" r on r.grupo_id = c.grupo_id
  left join lateral (
    select coalesce(sum(monto), 0)::numeric as total_abonado
    from public."tblAbonos" where participante_id = c.participante_id
  ) tot on true
  where upper(c.codigo) = upper(btrim(p_codigo))
    and public.es_admin_grupo(c.grupo_id);
$$;

revoke execute on function public.buscar_comprobante(text) from public, anon;
grant execute on function public.buscar_comprobante(text) to authenticated;

-- ── Seed: comprobante para los abonos que ya existen ─────────────────────────
-- Bucle (no INSERT…SELECT) para que `gen_codigo_comprobante` vea, dentro de la
-- misma transacción, los códigos ya insertados y no colisione consigo mismo.
do $$
declare r record;
begin
  for r in
    select a.id, a.participante_id, a.grupo_id, a.monto, a.creado_en
    from public."tblAbonos" a
    left join public."tblComprobantes" c on c.abono_id = a.id
    where c.id is null
  loop
    insert into public."tblComprobantes"
      (codigo, abono_id, participante_id, grupo_id, monto, creado_en)
    values
      (public.gen_codigo_comprobante(), r.id, r.participante_id, r.grupo_id, r.monto, r.creado_en);
  end loop;
end $$;
