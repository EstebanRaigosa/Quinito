-- ════════════════════════════════════════════════════════════════════════
-- Auditoría de predicciones (marcadores).
--
-- Objetivo: poder resolver disputas del tipo "no me aparece el marcador" /
-- "yo sí guardé". Registramos CADA movimiento de marcador por participante y
-- partido: qué guardó, cuándo, valor anterior → nuevo, y quién lo ejecutó.
--
-- Decisiones (confirmadas con el dueño del producto):
--   • Solo marcadores (goles_local / goles_visitante). Los recálculos de puntos
--     o de "predicción única" NO ensucian la auditoría (se filtran abajo).
--   • Captura el ACTOR: uid de quien ejecutó el cambio + su nombre, y si es
--     superadmin. Normalmente el actor es el propio dueño de la predicción.
--   • "Desde hoy con estado inicial": al aplicar esta migración se siembra un
--     registro `inicial` por cada predicción existente (foto del marcador actual).
--
-- Enfoque por TRIGGER en la base (no en la app): captura todo cambio sin importar
-- el origen (cliente, RPC, service_role). NO afecta lecturas (los SELECT nunca
-- disparan el trigger) y en escritura solo suma un INSERT append-only.
--
-- La tabla de historial NO usa FKs hacia datos mutables (predicción, participante)
-- a propósito: es un registro inmutable que debe sobrevivir aunque esos datos se
-- borren. Solo guarda los uuids denormalizados.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1 · Tabla de historial ────────────────────────────────────────────────
create table if not exists public."tblPrediccionesHistorial" (
  id uuid primary key default gen_random_uuid(),
  -- Referencias denormalizadas (sin FK: registro inmutable de auditoría).
  prediccion_id uuid not null,
  participante_id uuid not null,
  grupo_id uuid,
  partido_id uuid not null,
  usuario_id uuid,                         -- dueño de la predicción (para filtrar por usuario)
  accion text not null check (accion in ('inicial', 'insert', 'update', 'delete')),
  -- Marcador antes y después del movimiento.
  goles_local_anterior int,
  goles_visitante_anterior int,
  goles_local_nuevo int,
  goles_visitante_nuevo int,
  -- Quién ejecutó el cambio.
  actor_id uuid,                           -- auth.uid() del que disparó el cambio (null si service_role/sistema)
  actor_nombre text,
  actor_es_admin boolean not null default false,
  creado_en timestamptz not null default now()
);

create index if not exists "idxAuditPredGrupoFecha"
  on public."tblPrediccionesHistorial" (grupo_id, creado_en desc);
create index if not exists "idxAuditPredParticipantePartido"
  on public."tblPrediccionesHistorial" (participante_id, partido_id, creado_en);
create index if not exists "idxAuditPredUsuario"
  on public."tblPrediccionesHistorial" (usuario_id, creado_en desc);

-- RLS: nadie con rol authenticated/anon escribe ni lee en crudo. La escritura la
-- hace el trigger (`security definer`); la lectura, el RPC de superadmin de abajo.
alter table public."tblPrediccionesHistorial" enable row level security;

-- ── 2 · Función trigger: registra cada movimiento de marcador ──────────────
create or replace function public.fn_auditar_prediccion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id uuid;
  v_usuario_id uuid;
  v_actor_id uuid := auth.uid();
  v_actor_nombre text;
  v_actor_admin boolean := coalesce(public.es_superadmin(), false);
begin
  -- Solo nos interesan los cambios de MARCADOR. Si un UPDATE no tocó los goles
  -- (p. ej. `finalizar_partido` recalculando puntos_obtenidos / prediccion_unica),
  -- no registramos nada para no ensuciar la auditoría.
  if tg_op = 'UPDATE'
     and new.goles_local is not distinct from old.goles_local
     and new.goles_visitante is not distinct from old.goles_visitante then
    return null;
  end if;

  -- Grupo y usuario dueño, desde el participante.
  select p.grupo_id, p.usuario_id
    into v_grupo_id, v_usuario_id
  from public."tblParticipantes" p
  where p.id = coalesce(new.participante_id, old.participante_id);

  -- Nombre del actor (quien ejecutó el cambio).
  if v_actor_id is not null then
    select coalesce(pr.nombre_completo, pr.email)
      into v_actor_nombre
    from public."tblProfiles" pr
    where pr.id = v_actor_id;
  end if;

  insert into public."tblPrediccionesHistorial" (
    prediccion_id, participante_id, grupo_id, partido_id, usuario_id,
    accion,
    goles_local_anterior, goles_visitante_anterior,
    goles_local_nuevo, goles_visitante_nuevo,
    actor_id, actor_nombre, actor_es_admin
  ) values (
    coalesce(new.id, old.id),
    coalesce(new.participante_id, old.participante_id),
    v_grupo_id,
    coalesce(new.partido_id, old.partido_id),
    v_usuario_id,
    case tg_op when 'INSERT' then 'insert' when 'UPDATE' then 'update' else 'delete' end,
    case when tg_op in ('UPDATE', 'DELETE') then old.goles_local end,
    case when tg_op in ('UPDATE', 'DELETE') then old.goles_visitante end,
    case when tg_op in ('INSERT', 'UPDATE') then new.goles_local end,
    case when tg_op in ('INSERT', 'UPDATE') then new.goles_visitante end,
    v_actor_id, v_actor_nombre, v_actor_admin
  );

  return null; -- trigger AFTER: el valor de retorno se ignora
end;
$$;

create trigger "trgAuditarPrediccion"
  after insert or update or delete on public."tblPredicciones"
  for each row execute function public.fn_auditar_prediccion();

-- La función trigger NO debe ser invocable como RPC: el trigger se dispara con
-- privilegios de la tabla, no necesita EXECUTE para roles. Cerramos esa puerta.
revoke execute on function public.fn_auditar_prediccion() from public, anon, authenticated;

-- ── 3 · Estado inicial: foto del marcador actual de cada predicción ────────
-- Una sola vez, al aplicar la migración. Usa `creado_en` original de la
-- predicción como timestamp base para que la línea de tiempo arranque coherente.
insert into public."tblPrediccionesHistorial" (
  prediccion_id, participante_id, grupo_id, partido_id, usuario_id,
  accion,
  goles_local_nuevo, goles_visitante_nuevo,
  actor_id, actor_nombre, actor_es_admin,
  creado_en
)
select
  pred.id, pred.participante_id, p.grupo_id, pred.partido_id, p.usuario_id,
  'inicial',
  pred.goles_local, pred.goles_visitante,
  null, null, false,
  pred.creado_en
from public."tblPredicciones" pred
join public."tblParticipantes" p on p.id = pred.participante_id;

-- ── 4 · RPC de lectura para el superadmin ─────────────────────────────────
-- Devuelve la línea de tiempo de auditoría de UNA polla, enriquecida con nombre
-- del usuario, etiqueta del partido y datos del actor. Puerta dura: null si quien
-- llama no es superadmin.
create or replace function public.superadmin_auditoria_grupo(p_grupo_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select case
    when not public.es_superadmin() then null::jsonb
    else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', h.id,
        'creado_en', h.creado_en,
        'accion', h.accion,
        'participante_id', h.participante_id,
        'usuario_id', h.usuario_id,
        'usuario_nombre', coalesce(pr.nombre_completo, pr.email),
        'usuario_email', pr.email,
        'partido_id', h.partido_id,
        'partido_numero', pa.numero_partido,
        'partido_fase', pa.fase,
        'partido_label',
          coalesce(el.nombre, pa.placeholder_local, '¿?') || ' vs ' ||
          coalesce(ev.nombre, pa.placeholder_visitante, '¿?'),
        'goles_local_anterior', h.goles_local_anterior,
        'goles_visitante_anterior', h.goles_visitante_anterior,
        'goles_local_nuevo', h.goles_local_nuevo,
        'goles_visitante_nuevo', h.goles_visitante_nuevo,
        'actor_id', h.actor_id,
        'actor_nombre', h.actor_nombre,
        'actor_es_admin', h.actor_es_admin,
        'actor_es_dueno', (h.actor_id is not distinct from h.usuario_id)
      ) order by h.creado_en desc)
      from public."tblPrediccionesHistorial" h
      left join public."tblProfiles" pr on pr.id = h.usuario_id
      left join public."tblPartidos" pa on pa.id = h.partido_id
      left join public."tblEquipos" el on el.id = pa.equipo_local_id
      left join public."tblEquipos" ev on ev.id = pa.equipo_visitante_id
      where h.grupo_id = p_grupo_id
    ), '[]'::jsonb)
  end;
$$;

revoke execute on function public.superadmin_auditoria_grupo(uuid) from public, anon;
grant execute on function public.superadmin_auditoria_grupo(uuid) to authenticated;
