-- ============================================================================
-- Terceros EN VIVO + aseguramiento matemático (clinched) para el bracket
--
-- Contexto: hasta 0056 los "mejores terceros" solo se calculaban cuando los 12
-- grupos estaban cerrados (clasificacion_terceros devolvía vacío si algún 3°
-- no estaba determinado). La UI mostraba 8 cupos editables, no una tabla.
--
-- Esta migración:
--   1. clasificacion_terceros_provisional(): ranking EN VIVO de los terceros de
--      cada grupo (el 3° provisional según los resultados actuales), ordenado por
--      puntos -> dif -> a favor, AUNQUE falten partidos por jugar. Por cada grupo
--      marca un estado de clasificación:
--        - asegurado: el grupo está cerrado, su 3° está determinado y a lo sumo
--          (cupos-1) de los otros terceros pueden alcanzarlo/superarlo -> ya no
--          lo pueden sacar del corte sin importar los resultados que falten.
--        - eliminado: ni en su mejor escenario alcanza el corte (>= cupos grupos
--          lo superan con certeza).
--        - provisional: hoy está dentro del corte pero aún no asegurado.
--        - fuera: hoy está fuera del corte pero todavía con chance.
--      Las cotas para grupos abiertos son CONSERVADORAS (cota superior segura del
--      mejor 3° posible): nunca asegura de más, en el peor caso asegura un poco
--      más tarde de lo teóricamente posible.
--   2. mejores_terceros(): nueva prioridad -> manual completo -> conjunto de
--      terceros ASEGURADOS (puebla el bracket apenas hay certeza matemática,
--      aunque falten grupos por cerrar) -> si no, vacío (espera resolución).
--      Reemplaza la lógica de 0056 (que exigía los 12 grupos cerrados). El caso
--      "todos cerrados sin empate de corte" queda subsumido: ahí los `cupos`
--      primeros se aseguran exactamente.
--
-- equipo_tercero_slot / resolver_cruces NO cambian: como los grupos asegurados
-- están cerrados, equipo_clasificado(...,3) ya resuelve su 3°.
-- ============================================================================

-- 1) Ranking provisional + aseguramiento. Una fila por grupo, ordenada por la
--    posición provisional del 3°. Expone PII cero (solo posiciones de equipos),
--    así que queda ejecutable por authenticated, igual que terceros_admin.
create or replace function public.clasificacion_terceros_provisional(p_torneo_id uuid)
returns table (
  grupo            text,
  equipo_id        uuid,
  nombre           text,
  codigo_iso       text,
  pj               int,
  pts              int,
  dif              int,
  a_favor          int,
  determinado      boolean,
  grupo_cerrado    boolean,
  posicion         int,
  asegurado        boolean,
  eliminado        boolean,
  clasifica_auto   boolean,
  manual_clasifica boolean,
  hay_manual       boolean,
  ambiguo_corte    boolean,
  cupos            int
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_cupos int;       -- nº de terceros que clasifican en este torneo
  v_hay_manual boolean;
begin
  select count(distinct ats.numero_partido) into v_cupos
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id;
  v_cupos := coalesce(v_cupos, 0);

  select exists(
    select 1 from public."tblTercerosClasificados" where torneo_id = p_torneo_id
  ) into v_hay_manual;

  return query
  with grupos as (
    select distinct p.grupo as g
    from public."tblPartidos" p
    where p.torneo_id = p_torneo_id and p.fase = 'fase_grupos' and p.grupo is not null
  ),
  -- ¿está cerrado el grupo? (todos sus partidos finalizados)
  cerrado as (
    select p.grupo as g,
           (count(*) filter (where p.estado <> 'finalizado') = 0) as cerrado
    from public."tblPartidos" p
    where p.torneo_id = p_torneo_id and p.fase = 'fase_grupos' and p.grupo is not null
    group by p.grupo
  ),
  -- partidos programados por equipo (jugados + por jugar), para los remanentes
  sched as (
    select x.g, x.eq, count(*)::int as programados
    from (
      select p.grupo as g, p.equipo_local_id as eq
      from public."tblPartidos" p
      where p.torneo_id = p_torneo_id and p.fase = 'fase_grupos'
        and p.grupo is not null and p.equipo_local_id is not null
      union all
      select p.grupo, p.equipo_visitante_id
      from public."tblPartidos" p
      where p.torneo_id = p_torneo_id and p.fase = 'fase_grupos'
        and p.grupo is not null and p.equipo_visitante_id is not null
    ) x
    group by x.g, x.eq
  ),
  -- stats actuales de TODOS los equipos por grupo, con su posición provisional
  stats as (
    select gr.g, pg.equipo_id, pg.pts, pg.dg, pg.gf, pg.pj, pg.posicion,
           coalesce(s.programados, pg.pj) as programados
    from grupos gr
    cross join lateral public.posiciones_grupo(p_torneo_id, gr.g) pg
    left join sched s on s.g = gr.g and s.eq = pg.equipo_id
  ),
  -- cotas de puntos del EVENTUAL 3° de cada grupo (3.º mayor por construcción):
  --   ceil_pts = 3.º mayor de los puntos MÁXIMOS alcanzables (cur + 3*remanente)
  --   floor_pts = 3.º mayor de los puntos ACTUALES (los puntos solo suben)
  -- Para un grupo cerrado, ceil_pts = floor_pts = puntos del 3°.
  gb as (
    select st.g,
      (array_agg(st.pts order by st.pts desc))[3] as floor_pts,
      (array_agg(st.pts + 3 * greatest(st.programados - st.pj, 0)
                 order by st.pts + 3 * greatest(st.programados - st.pj, 0) desc))[3]
        as ceil_pts
    from stats st
    group by st.g
  ),
  -- override manual de la posición 3 de un grupo (tblClasificacionGrupo)
  manual3 as (
    select m.grupo as g, m.equipo_id
    from public."tblClasificacionGrupo" m
    where m.torneo_id = p_torneo_id and m.posicion = 3
  ),
  -- 3° provisional de cada grupo: manual si existe, si no el de posición 3 actual
  tercero as (
    select gr.g,
      coalesce(m.equipo_id, st3.equipo_id) as equipo_id
    from grupos gr
    left join manual3 m on m.g = gr.g
    left join stats st3 on st3.g = gr.g and st3.posicion = 3
  ),
  -- ¿el 3° está determinado de forma firme? (grupo cerrado y sin empate interno,
  -- o con override manual) -> reusa la regla de equipo_clasificado.
  det as (
    select gr.g, (public.equipo_clasificado(p_torneo_id, gr.g, 3) is not null) as determinado
    from grupos gr
  ),
  base as (
    select t.g, t.equipo_id, ts.pts, ts.dg, ts.gf, ts.pj,
           c.cerrado, d.determinado, gb.floor_pts, gb.ceil_pts
    from tercero t
    join stats ts on ts.g = t.g and ts.equipo_id = t.equipo_id
    join cerrado c on c.g = t.g
    join det d on d.g = t.g
    join gb on gb.g = t.g
  ),
  ranked as (
    select b.*,
      row_number() over (order by b.pts desc, b.dg desc, b.gf desc, b.equipo_id)::int as posicion,
      rank() over (order by b.pts desc, b.dg desc, b.gf desc)::int as rnk
    from base b
  ),
  -- amenazas: cuántos OTROS terceros podrían quedar por encima de cada uno.
  --   grupo b cerrado: comparación exacta de la tripleta (pts,dif,gf); la
  --     igualdad cuenta como amenaza (empate sin desempate deportivo -> ambiguo).
  --   grupo b abierto: amenaza si su cota superior de puntos alcanza los de `a`.
  -- garantizados por encima (para "eliminado"): el piso de b supera el techo de a.
  amenazas as (
    select a.g,
      count(*) filter (
        where (bb.cerrado and (bb.pts, bb.dg, bb.gf) >= (a.pts, a.dg, a.gf))
           or ((not bb.cerrado) and bb.ceil_pts >= a.pts)
      )::int as n_amenaza,
      count(*) filter (where bb.floor_pts > a.ceil_pts)::int as n_encima
    from ranked a
    join ranked bb on bb.g <> a.g
    group by a.g
  ),
  amb as (
    select coalesce((
      v_cupos > 0 and
      (select r.rnk from ranked r where r.posicion = v_cupos)
        = (select r.rnk from ranked r where r.posicion = v_cupos + 1)
    ), false) as ambiguo
  )
  select
    r.g as grupo,
    r.equipo_id,
    e.nombre,
    e.codigo_iso,
    r.pj,
    r.pts,
    r.dg  as dif,
    r.gf  as a_favor,
    r.determinado,
    r.cerrado as grupo_cerrado,
    r.posicion,
    (r.cerrado and r.determinado and v_cupos > 0 and am.n_amenaza <= v_cupos - 1) as asegurado,
    (v_cupos > 0 and am.n_encima >= v_cupos) as eliminado,
    (v_cupos > 0 and r.posicion <= v_cupos) as clasifica_auto,
    (mc.grupo is not null) as manual_clasifica,
    v_hay_manual as hay_manual,
    a.ambiguo as ambiguo_corte,
    v_cupos as cupos
  from ranked r
  left join public."tblEquipos" e on e.id = r.equipo_id
  left join public."tblTercerosClasificados" mc
    on mc.torneo_id = p_torneo_id and mc.grupo = r.g
  left join amenazas am on am.g = r.g
  cross join amb a
  order by r.posicion;
end;
$function$;

-- 2) mejores_terceros: conjunto de grupos cuyos terceros clasifican.
--    Prioridad: manual completo -> terceros ASEGURADOS (certeza matemática) ->
--    vacío (espera más resultados o resolución manual del empate de corte).
create or replace function public.mejores_terceros(p_torneo_id uuid)
returns table (grupo text)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_cupos int;
  v_manual int;
  v_aseg int;
begin
  select count(distinct ats.numero_partido) into v_cupos
  from public."tblAsignacionTercerosSlot" ats
  where ats.torneo_id = p_torneo_id;
  v_cupos := coalesce(v_cupos, 0);

  if v_cupos = 0 then
    return; -- el torneo no usa mejores terceros
  end if;

  select count(*) into v_manual
  from public."tblTercerosClasificados" where torneo_id = p_torneo_id;

  -- Override manual completo: gana siempre.
  if v_manual = v_cupos then
    return query
    select tc.grupo from public."tblTercerosClasificados" tc
    where tc.torneo_id = p_torneo_id;
    return;
  end if;

  -- Manual incompleto (1..cupos-1): no resolver hasta completarlo o cancelarlo.
  if v_manual between 1 and v_cupos - 1 then
    return;
  end if;

  -- Automático: solo cuando hay EXACTAMENTE `cupos` terceros asegurados, es
  -- decir, el conjunto de clasificados ya no puede cambiar con lo que falta.
  select count(*) filter (where c.asegurado) into v_aseg
  from public.clasificacion_terceros_provisional(p_torneo_id) c;

  if v_aseg <> v_cupos then
    return; -- aún sin certeza: el bracket espera
  end if;

  return query
  select c.grupo
  from public.clasificacion_terceros_provisional(p_torneo_id) c
  where c.asegurado;
end;
$function$;

-- Permisos:
--   - mejores_terceros: interna (la llama equipo_tercero_slot / resolver_cruces).
--   - clasificacion_terceros_provisional: la consume la UI admin -> authenticated.
revoke all on function public.mejores_terceros(uuid) from anon, authenticated;
revoke all on function public.clasificacion_terceros_provisional(uuid) from public;
grant execute on function public.clasificacion_terceros_provisional(uuid) to authenticated;
