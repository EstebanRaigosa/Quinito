-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Pagos parciales (abonos) de participantes                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Hasta ahora el pago era un único booleano `tblParticipantes.pago_realizado`.
-- Ahora cada participante debe cubrir `valor_apuesta` (tblReglasGrupo) y el admin
-- puede registrar VARIOS abonos parciales hasta completar. Reglas del producto:
--   • Se pueden eliminar abonos registrados por error (recalcula el saldo).
--   • El total abonado NO puede superar `valor_apuesta` (se rechaza el exceso).
--   • Cada abono guarda monto, fecha y una nota/método opcional.
--
-- Patrón (igual que 0026_banear_participantes): tabla → RLS SELECT con
-- `es_admin_grupo` (ya superadmin-aware, 0020) → escrituras solo por RPCs
-- SECURITY DEFINER. `pago_realizado` se RE-SINCRONIZA en cada abono para no
-- romper grupo_detalle/mis_grupos que leen ese boolean.

-- ── Tabla de abonos ─────────────────────────────────────────────────────────
-- `grupo_id` se denormaliza para que la policy y las agregaciones por grupo sean
-- directas (sin subselect por fila). Se setea en el RPC desde el participante.
create table public."tblAbonos" (
  id              uuid primary key default gen_random_uuid(),
  participante_id uuid not null references public."tblParticipantes"(id) on delete cascade,
  grupo_id        uuid not null references public."tblGrupos"(id)        on delete cascade,
  monto           numeric(12,2) not null check (monto > 0),
  nota            text,
  registrado_por  uuid references public."tblProfiles"(id) on delete set null,
  creado_en       timestamptz not null default now()
);

create index "idxAbonosParticipante" on public."tblAbonos" (participante_id);
create index "idxAbonosGrupo"        on public."tblAbonos" (grupo_id);

alter table public."tblAbonos" enable row level security;

-- Solo el admin del grupo (o superadmin) puede LEER los montos. Las escrituras
-- van exclusivamente por los RPCs security definer → sin policies de write.
create policy "abonos_select" on public."tblAbonos"
for select to authenticated using (es_admin_grupo(grupo_id));

-- ── RPC: registrar un abono ─────────────────────────────────────────────────
create or replace function public.registrar_abono(
  p_participante_id uuid,
  p_monto numeric,
  p_nota text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id uuid;
  v_valor_apuesta numeric;
  v_total numeric;
  v_abono_id uuid;
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

  -- Re-sincronizar el boolean que leen grupo_detalle / mis_grupos.
  update public."tblParticipantes"
     set pago_realizado = (v_total + p_monto >= v_valor_apuesta)
   where id = p_participante_id;

  return v_abono_id;
end;
$$;

revoke execute on function public.registrar_abono(uuid, numeric, text) from public, anon;
grant execute on function public.registrar_abono(uuid, numeric, text) to authenticated;

-- ── RPC: eliminar un abono ──────────────────────────────────────────────────
create or replace function public.eliminar_abono(p_abono_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id uuid;
  v_participante_id uuid;
  v_valor_apuesta numeric;
  v_total numeric;
begin
  select a.grupo_id, a.participante_id
    into v_grupo_id, v_participante_id
  from public."tblAbonos" a
  where a.id = p_abono_id;

  if v_grupo_id is null then
    raise exception 'El abono no existe';
  end if;

  if not public.es_admin_grupo(v_grupo_id) then
    raise exception 'Solo el administrador puede gestionar pagos' using errcode = '42501';
  end if;

  perform 1 from public."tblParticipantes" where id = v_participante_id for update;

  delete from public."tblAbonos" where id = p_abono_id;

  select coalesce(r.valor_apuesta, 0) into v_valor_apuesta
  from public."tblParticipantes" pa
  left join public."tblReglasGrupo" r on r.grupo_id = pa.grupo_id
  where pa.id = v_participante_id;

  select coalesce(sum(monto), 0) into v_total
  from public."tblAbonos" where participante_id = v_participante_id;

  update public."tblParticipantes"
     set pago_realizado = (v_valor_apuesta > 0 and v_total >= v_valor_apuesta)
   where id = v_participante_id;
end;
$$;

revoke execute on function public.eliminar_abono(uuid) from public, anon;
grant execute on function public.eliminar_abono(uuid) to authenticated;

-- ── RPC: totales abonados por participante (para la lista) ───────────────────
-- Guard de admin en el WHERE: un no-admin recibe 0 filas (igual que listar_baneados).
create or replace function public.pagos_grupo(p_grupo_id uuid)
returns table (participante_id uuid, total_abonado numeric)
language sql
security definer
stable
set search_path = public
as $$
  select pa.id, coalesce(sum(a.monto), 0)::numeric
  from public."tblParticipantes" pa
  left join public."tblAbonos" a on a.participante_id = pa.id
  where pa.grupo_id = p_grupo_id
    and public.es_admin_grupo(p_grupo_id)
  group by pa.id;
$$;

revoke execute on function public.pagos_grupo(uuid) from public, anon;
grant execute on function public.pagos_grupo(uuid) to authenticated;

-- ── RPC: historial de abonos de un participante ─────────────────────────────
create or replace function public.listar_abonos(p_participante_id uuid)
returns table (
  id uuid,
  monto numeric,
  nota text,
  creado_en timestamptz,
  registrado_por_nombre text
)
language sql
security definer
stable
set search_path = public
as $$
  select a.id, a.monto, a.nota, a.creado_en, prof.nombre_completo
  from public."tblAbonos" a
  join public."tblParticipantes" pa on pa.id = a.participante_id
  left join public."tblProfiles" prof on prof.id = a.registrado_por
  where a.participante_id = p_participante_id
    and public.es_admin_grupo(pa.grupo_id)
  order by a.creado_en desc;
$$;

revoke execute on function public.listar_abonos(uuid) from public, anon;
grant execute on function public.listar_abonos(uuid) to authenticated;

-- ── Seed: no perder el estado de pago actual ────────────────────────────────
-- Quien ya estaba marcado como pagado (con apuesta > 0) recibe un abono inicial
-- por el valor de la apuesta, para que el nuevo sistema refleje ese pago.
insert into public."tblAbonos" (participante_id, grupo_id, monto, nota, registrado_por)
select pa.id, pa.grupo_id, r.valor_apuesta, 'Pago previo al sistema de abonos', null
from public."tblParticipantes" pa
join public."tblReglasGrupo" r on r.grupo_id = pa.grupo_id
where pa.pago_realizado = true and r.valor_apuesta > 0;
