-- ════════════════════════════════════════════════════════════════════════
-- Auditoría del AVANCE predicho en empates de fase eliminatoria.
--
-- Contexto: cuando un usuario predice un empate en un partido eliminatorio,
-- además del marcador elige qué equipo cree que avanza a la siguiente ronda
-- (tblPredicciones.equipo_avanza_id, ver 0061). Hasta ahora la auditoría
-- (0050/0052) SOLO registraba el marcador (goles_local/goles_visitante); el
-- equipo elegido para avanzar no quedaba en el historial.
--
-- Objetivo: poder resolver disputas del tipo "yo sí marqué que pasaba X" en
-- eliminatorias. Registramos el equipo de avance anterior → nuevo en cada
-- movimiento, igual que ya se hace con el marcador.
--
-- Tres cambios:
--   1. Columnas equipo_avanza_anterior / equipo_avanza_nuevo en el historial.
--   2. fn_auditar_prediccion(): también dispara cuando SOLO cambia el avance
--      (antes un UPDATE sin cambio de goles se descartaba) y graba el avance.
--   3. Backfill de los registros 'inicial' + RPC de lectura enriquecido con
--      nombre y código ISO (bandera) del equipo de avance.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1 · Columnas de avance en el historial ────────────────────────────────
-- Denormalizadas y sin FK, igual que el resto del historial (registro inmutable
-- que debe sobrevivir aunque el equipo o la predicción se borren).
alter table public."tblPrediccionesHistorial"
  add column if not exists equipo_avanza_anterior uuid,
  add column if not exists equipo_avanza_nuevo uuid;

comment on column public."tblPrediccionesHistorial".equipo_avanza_anterior is
  'Equipo que el usuario tenía marcado como "el que avanza" ANTES del movimiento (empates eliminatorios). Null si no aplica.';
comment on column public."tblPrediccionesHistorial".equipo_avanza_nuevo is
  'Equipo que el usuario marca como "el que avanza" DESPUÉS del movimiento (empates eliminatorios). Null si no aplica.';

-- ── 2 · Trigger: registrar también los cambios de avance ──────────────────
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
  -- Nos interesan los cambios de MARCADOR o de AVANCE. Si un UPDATE no tocó ni
  -- los goles ni el equipo de avance (p. ej. `finalizar_partido` recalculando
  -- puntos_obtenidos / prediccion_unica), no registramos nada para no ensuciar
  -- la auditoría.
  if tg_op = 'UPDATE'
     and new.goles_local is not distinct from old.goles_local
     and new.goles_visitante is not distinct from old.goles_visitante
     and new.equipo_avanza_id is not distinct from old.equipo_avanza_id then
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
    equipo_avanza_anterior, equipo_avanza_nuevo,
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
    case when tg_op in ('UPDATE', 'DELETE') then old.equipo_avanza_id end,
    case when tg_op in ('INSERT', 'UPDATE') then new.equipo_avanza_id end,
    v_actor_id, v_actor_nombre, v_actor_admin
  );

  return null; -- trigger AFTER: el valor de retorno se ignora
end;
$$;

-- (El trigger trgAuditarPrediccion de 0050 ya apunta a esta función; al usar
--  CREATE OR REPLACE no hace falta recrearlo.)
revoke execute on function public.fn_auditar_prediccion() from public, anon, authenticated;

-- ── 3 · Backfill del estado 'inicial' ─────────────────────────────────────
-- Los registros 'inicial' se sembraron en 0050, cuando la columna de avance aún
-- no existía (llegó en 0061). Para que la línea de tiempo no arranque "en
-- blanco" en empates eliminatorios, copiamos el avance vigente de cada
-- predicción a su snapshot inicial. Es la mejor aproximación disponible: no hubo
-- historial de avance antes de esta migración, así que tomamos el valor actual
-- (mismo criterio con el que 0050 fotografió el marcador).
update public."tblPrediccionesHistorial" h
set equipo_avanza_nuevo = pred.equipo_avanza_id
from public."tblPredicciones" pred
where h.accion = 'inicial'
  and h.prediccion_id = pred.id
  and pred.equipo_avanza_id is not null;

-- ── 4 · RPC de lectura enriquecido con el equipo de avance ────────────────
-- Idéntico a la versión vigente (0052) salvo cuatro campos nuevos: el nombre y
-- el código ISO (para la bandera) del equipo de avance anterior y nuevo.
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
        'equipo_local_iso', el.codigo_iso,
        'equipo_visitante_iso', ev.codigo_iso,
        'goles_local_anterior', h.goles_local_anterior,
        'goles_visitante_anterior', h.goles_visitante_anterior,
        'goles_local_nuevo', h.goles_local_nuevo,
        'goles_visitante_nuevo', h.goles_visitante_nuevo,
        'equipo_avanza_anterior_nombre', eaa.nombre,
        'equipo_avanza_anterior_iso', eaa.codigo_iso,
        'equipo_avanza_nuevo_nombre', ean.nombre,
        'equipo_avanza_nuevo_iso', ean.codigo_iso,
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
      left join public."tblEquipos" eaa on eaa.id = h.equipo_avanza_anterior
      left join public."tblEquipos" ean on ean.id = h.equipo_avanza_nuevo
      where h.grupo_id = p_grupo_id
    ), '[]'::jsonb)
  end;
$$;

revoke execute on function public.superadmin_auditoria_grupo(uuid) from public, anon;
grant execute on function public.superadmin_auditoria_grupo(uuid) to authenticated;
