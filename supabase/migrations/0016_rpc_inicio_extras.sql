-- ════════════════════════════════════════════════════════════════════════
-- RPC `inicio_extras`: empaqueta en UNA sola llamada todo lo que el dashboard
-- necesita además de `mis_grupos`, para las secciones "predicciones de hoy" y
-- "próximo partido por polla".
--
-- Motivación (rendimiento): antes el dashboard hacía ~11 round-trips de red a
-- PostgREST repartidos entre `getPrediccionesPendientesHoy` (6) y
-- `getProximoPartidoPorGrupo` (5), que además consultaban las MISMAS tablas
-- (participantes, reglas, grupo_partidos, partidos, predicciones). El cómputo en
-- la base es trivial (<15 ms); el costo real era la latencia de cada ida y
-- vuelta. Este RPC los colapsa en uno solo.
--
-- La lógica de negocio (ventana "hoy", `puedePredecir`, selección del próximo)
-- se mantiene en TypeScript como única fuente de verdad: aquí solo recolectamos
-- los datos crudos que esa lógica necesita.
--
-- Privacidad (CLAUDE.md §3.4): `security invoker` + filtro explícito a los
-- `participante_id` del usuario → solo se devuelven SUS predicciones. El RLS de
-- `tblPredicciones` es la segunda barrera.
--
-- `p_desde`: límite inferior de `fecha_hora` (UTC). El dashboard pasa la
-- medianoche de hoy en Bogotá, de modo que el conjunto cubre tanto los partidos
-- de hoy como los próximos.
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
  -- Partidos relevantes: los que apuestan mis pollas y aún no han pasado.
  partidos_rel as (
    select pa.id
    from public."tblPartidos" pa
    where pa.fecha_hora >= p_desde
      and exists (
        select 1
        from public."tblGrupoPartidos" gp
        join mis_grupos_ids mg on mg.grupo_id = gp.grupo_id
        where gp.partido_id = pa.id
      )
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
        and gp.partido_id in (select id from partidos_rel)), '[]'::jsonb),
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
      where pa.id in (select id from partidos_rel)), '[]'::jsonb),
    'predicciones', coalesce((
      select jsonb_agg(jsonb_build_object(
        'participante_id', pr.participante_id, 'partido_id', pr.partido_id,
        'goles_local', pr.goles_local, 'goles_visitante', pr.goles_visitante))
      from public."tblPredicciones" pr
      where pr.participante_id in (select participante_id from mis_part)
        and pr.partido_id in (select id from partidos_rel)), '[]'::jsonb)
  );
$$;

revoke execute on function public.inicio_extras(timestamptz) from public, anon;
grant execute on function public.inicio_extras(timestamptz) to authenticated;
