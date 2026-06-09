-- ════════════════════════════════════════════════════════════════════════
-- Afina `inicio_extras`: el dashboard solo dibuja los partidos de HOY y el
-- próximo de cada polla, pero el RPC traía TODOS los futuros del torneo (~110).
-- Aquí acotamos el conjunto de partidos a lo que la pantalla realmente usa:
--
--   • Partidos de hoy (ventana [p_desde, p_desde + 1 día)) de mis pollas → para
--     la sección "predicciones de hoy".
--   • Los próximos 5 partidos CON EQUIPOS DEFINIDOS de cada polla → candidatos
--     para la "boleta" del próximo partido (TS elige el primero predecible con
--     `puedePredecir`; 5 candidatos sobran para saltar alguno ya cerrado).
--
-- El resto del shape (participantes, reglas, grupo_partidos, predicciones) se
-- filtra a ese conjunto. La lógica de negocio sigue intacta en TypeScript: solo
-- cambia QUÉ partidos viajan, de ~110 a ~15-20. Transparente para el cliente.
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.inicio_extras(p_desde timestamptz)
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  with mis_part as (
    select id as participante_id, grupo_id
    from public."tblParticipantes"
    where usuario_id = auth.uid()
  ),
  mis_grupos_ids as (
    select distinct grupo_id from mis_part
  ),
  -- Partidos de mis pollas de hoy en adelante, con la info necesaria para rankear.
  gp_fut as (
    select gp.grupo_id, gp.partido_id, pa.fecha_hora,
           pa.equipo_local_id, pa.equipo_visitante_id
    from public."tblGrupoPartidos" gp
    join mis_grupos_ids mg on mg.grupo_id = gp.grupo_id
    join public."tblPartidos" pa on pa.id = gp.partido_id
    where pa.fecha_hora >= p_desde
  ),
  -- Próximos por grupo (solo con equipos definidos = predecibles).
  ranked as (
    select grupo_id, partido_id,
           row_number() over (partition by grupo_id order by fecha_hora asc) as rn
    from gp_fut
    where equipo_local_id is not null and equipo_visitante_id is not null
  ),
  -- Conjunto relevante: los de hoy (∪) los próximos 5 por grupo.
  partidos_rel as (
    select distinct partido_id
    from gp_fut
    where fecha_hora < p_desde + interval '1 day'
    union
    select partido_id from ranked where rn <= 5
  )
  select jsonb_build_object(
    'participantes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'grupo_id', grupo_id, 'participante_id', participante_id))
      from mis_part), '[]'::jsonb),
    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object('id', g.id, 'nombre', g.nombre))
      from public."tblGrupos" g
      where g.id in (select grupo_id from mis_grupos_ids)), '[]'::jsonb),
    'reglas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'grupo_id', r.grupo_id,
        'minutos_cierre_prediccion', r.minutos_cierre_prediccion))
      from public."tblReglasGrupo" r
      where r.grupo_id in (select grupo_id from mis_grupos_ids)), '[]'::jsonb),
    'grupo_partidos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'grupo_id', gp.grupo_id, 'partido_id', gp.partido_id))
      from public."tblGrupoPartidos" gp
      where gp.grupo_id in (select grupo_id from mis_grupos_ids)
        and gp.partido_id in (select partido_id from partidos_rel)), '[]'::jsonb),
    'partidos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', pa.id, 'torneo_id', pa.torneo_id, 'numero_partido', pa.numero_partido,
        'fase', pa.fase, 'grupo', pa.grupo,
        'placeholder_local', pa.placeholder_local,
        'placeholder_visitante', pa.placeholder_visitante,
        'fecha_hora', pa.fecha_hora, 'estadio', pa.estadio, 'ciudad', pa.ciudad,
        'goles_local', pa.goles_local, 'goles_visitante', pa.goles_visitante,
        'estado', pa.estado,
        'equipo_local', case when el.id is null then null else jsonb_build_object(
          'id', el.id, 'nombre', el.nombre, 'codigo_iso', el.codigo_iso,
          'bandera_url', el.bandera_url, 'grupo', el.grupo) end,
        'equipo_visitante', case when ev.id is null then null else jsonb_build_object(
          'id', ev.id, 'nombre', ev.nombre, 'codigo_iso', ev.codigo_iso,
          'bandera_url', ev.bandera_url, 'grupo', ev.grupo) end
      ) order by pa.fecha_hora)
      from public."tblPartidos" pa
      left join public."tblEquipos" el on el.id = pa.equipo_local_id
      left join public."tblEquipos" ev on ev.id = pa.equipo_visitante_id
      where pa.id in (select partido_id from partidos_rel)), '[]'::jsonb),
    'predicciones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'participante_id', pr.participante_id, 'partido_id', pr.partido_id,
        'goles_local', pr.goles_local, 'goles_visitante', pr.goles_visitante))
      from public."tblPredicciones" pr
      where pr.participante_id in (select participante_id from mis_part)
        and pr.partido_id in (select partido_id from partidos_rel)), '[]'::jsonb)
  );
$$;

revoke execute on function public.inicio_extras(timestamptz) from public, anon;
grant execute on function public.inicio_extras(timestamptz) to authenticated;
