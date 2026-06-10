-- 0024_criterios_desempate.sql
--
-- Criterios de desempate de la tabla de posiciones, CONFIGURABLES por polla.
-- A igualdad de puntos se rompe el empate por una secuencia ordenada de
-- criterios (default: marcadores exactos → predicciones únicas → aciertos).
-- El orden se guarda como un text[] en las reglas del grupo, y la vista lo
-- aplica con CASE sobre cada posición del array (sin SQL dinámico).

-- 1) Columna con el orden de criterios. Valores permitidos y default.
alter table public."tblReglasGrupo"
  add column if not exists criterios_desempate text[] not null
    default '{exactos,unicas,aciertos}'::text[];

alter table public."tblReglasGrupo"
  drop constraint if exists reglas_criterios_desempate_validos;
alter table public."tblReglasGrupo"
  add constraint reglas_criterios_desempate_validos
    check (criterios_desempate <@ array['exactos', 'unicas', 'aciertos']::text[]);

-- 2) Vista: agrega `unicas_acertadas` y ordena por puntos + criterios del grupo.
--    Mantiene security_invoker=off (agrega predicciones → definer, ver 0021).
create or replace view public."vwTablaPosiciones" as
select
  p.grupo_id,
  p.id as participante_id,
  prof.nombre_completo,
  prof.avatar_url,
  coalesce(sum(pred.puntos_obtenidos), 0) as puntos_totales,
  count(pred.id) filter (where pred.puntos_obtenidos > 0) as aciertos,
  count(pred.id) filter (
    where pred.goles_local = pa.goles_local
      and pred.goles_visitante = pa.goles_visitante
      and pa.estado = 'finalizado'
  ) as marcadores_exactos,
  row_number() over (
    partition by p.grupo_id
    order by
      coalesce(sum(pred.puntos_obtenidos), 0) desc,
      (case rg.criterios_desempate[1]
        when 'exactos' then count(pred.id) filter (where pred.goles_local = pa.goles_local and pred.goles_visitante = pa.goles_visitante and pa.estado = 'finalizado')
        when 'unicas' then count(pred.id) filter (where pred.prediccion_unica)
        when 'aciertos' then count(pred.id) filter (where pred.puntos_obtenidos > 0)
        else 0 end) desc,
      (case rg.criterios_desempate[2]
        when 'exactos' then count(pred.id) filter (where pred.goles_local = pa.goles_local and pred.goles_visitante = pa.goles_visitante and pa.estado = 'finalizado')
        when 'unicas' then count(pred.id) filter (where pred.prediccion_unica)
        when 'aciertos' then count(pred.id) filter (where pred.puntos_obtenidos > 0)
        else 0 end) desc,
      (case rg.criterios_desempate[3]
        when 'exactos' then count(pred.id) filter (where pred.goles_local = pa.goles_local and pred.goles_visitante = pa.goles_visitante and pa.estado = 'finalizado')
        when 'unicas' then count(pred.id) filter (where pred.prediccion_unica)
        when 'aciertos' then count(pred.id) filter (where pred.puntos_obtenidos > 0)
        else 0 end) desc,
      prof.nombre_completo asc,
      p.id asc
  ) as posicion,
  count(pred.id) filter (where pred.prediccion_unica) as unicas_acertadas
from public."tblParticipantes" p
join public."tblProfiles" prof on prof.id = p.usuario_id
join public."tblReglasGrupo" rg on rg.grupo_id = p.grupo_id
left join public."tblPredicciones" pred on pred.participante_id = p.id
left join public."tblPartidos" pa on pa.id = pred.partido_id
where public.es_miembro_grupo(p.grupo_id)
group by p.grupo_id, p.id, prof.nombre_completo, prof.avatar_url, rg.criterios_desempate;

alter view public."vwTablaPosiciones" set (security_invoker = off);

-- 3) `grupo_detalle`: exponer `unicas_acertadas` en la tabla (las reglas ya
--    incluyen criterios_desempate vía to_jsonb). Idéntica a 0017 + esa columna.
create or replace function public.grupo_detalle(p_grupo_id uuid)
returns jsonb
language sql
security invoker
stable
set search_path = public
as $$
  with mi as (
    select id, rol
    from public."tblParticipantes"
    where grupo_id = p_grupo_id and usuario_id = auth.uid()
    limit 1
  )
  select case
    when not exists (select 1 from mi) then null::jsonb
    else jsonb_build_object(
      'miParticipanteId', (select id from mi),
      'esAdmin', (select rol = 'admin' from mi),
      'grupo', (
        select jsonb_build_object(
          'id', g.id, 'nombre', g.nombre, 'descripcion', g.descripcion,
          'codigo_invitacion', g.codigo_invitacion, 'creador_id', g.creador_id)
        from public."tblGrupos" g where g.id = p_grupo_id),
      'reglas', (
        select to_jsonb(r) from public."tblReglasGrupo" r where r.grupo_id = p_grupo_id),
      'participantes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id, 'rol', p.rol, 'pago_realizado', p.pago_realizado,
          'usuario', jsonb_build_object(
            'id', prof.id, 'nombre_completo', prof.nombre_completo,
            'email', prof.email, 'avatar_url', prof.avatar_url)))
        from public."tblParticipantes" p
        join public."tblProfiles" prof on prof.id = p.usuario_id
        where p.grupo_id = p_grupo_id), '[]'::jsonb),
      'tabla', coalesce((
        select jsonb_agg(jsonb_build_object(
          'participante_id', v.participante_id, 'posicion', v.posicion,
          'nombre_completo', v.nombre_completo, 'avatar_url', v.avatar_url,
          'puntos_totales', v.puntos_totales, 'aciertos', v.aciertos,
          'marcadores_exactos', v.marcadores_exactos,
          'unicas_acertadas', v.unicas_acertadas) order by v.posicion asc)
        from public."vwTablaPosiciones" v where v.grupo_id = p_grupo_id), '[]'::jsonb),
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
        ) order by pa.fecha_hora asc)
        from public."tblGrupoPartidos" gp
        join public."tblPartidos" pa on pa.id = gp.partido_id
        left join public."tblEquipos" el on el.id = pa.equipo_local_id
        left join public."tblEquipos" ev on ev.id = pa.equipo_visitante_id
        where gp.grupo_id = p_grupo_id), '[]'::jsonb),
      'misPredicciones', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pr.id, 'participante_id', pr.participante_id, 'partido_id', pr.partido_id,
          'goles_local', pr.goles_local, 'goles_visitante', pr.goles_visitante,
          'puntos_obtenidos', pr.puntos_obtenidos, 'prediccion_unica', pr.prediccion_unica))
        from public."tblPredicciones" pr
        where pr.participante_id = (select id from mi)), '[]'::jsonb)
    )
  end;
$$;

revoke execute on function public.grupo_detalle(uuid) from public, anon;
grant execute on function public.grupo_detalle(uuid) to authenticated;
