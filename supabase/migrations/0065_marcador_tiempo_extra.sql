-- 0065_marcador_tiempo_extra.sql
--
-- El tiempo extra ahora tiene su propio marcador (prorroga_local/visitante),
-- igual que la tanda de penales. Cuando un cruce queda empatado a los 90' y se
-- resuelve en la prórroga, el admin carga ese marcador y de ahí sale el equipo
-- que avanza (el mayor). El marcador de los 90' sigue siendo el único que puntúa.
--
-- finalizar_partido pasa a recibir el marcador de prórroga en vez del id del
-- equipo que avanza: deriva equipo_avanza_id de la tanda (penales) o del
-- marcador de prórroga, según cuál se haya cargado.

-- ── 1. Columnas del marcador de tiempo extra ────────────────────────────────
alter table public."tblPartidos"
  add column prorroga_local int check (prorroga_local >= 0),
  add column prorroga_visitante int check (prorroga_visitante >= 0);

comment on column public."tblPartidos".prorroga_local is
  'Goles del local en el marcador final del tiempo extra (solo cruces resueltos en la prórroga). No puntúa; define quién avanza.';
comment on column public."tblPartidos".prorroga_visitante is
  'Goles del visitante en el marcador final del tiempo extra. No puntúa; define quién avanza.';

-- ── 2. finalizar_partido: recibe el marcador de prórroga ────────────────────
drop function if exists public.finalizar_partido(uuid, integer, integer, integer, integer, uuid);

create function public.finalizar_partido(
  p_partido_id uuid,
  p_goles_local integer,
  p_goles_visitante integer,
  p_penales_local integer default null,
  p_penales_visitante integer default null,
  p_prorroga_local integer default null,
  p_prorroga_visitante integer default null
)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_fase fase_torneo;
  v_torneo_id uuid;
  v_el uuid;
  v_ev uuid;
  v_tipo public.tipo_definicion;
  v_empate boolean;
  v_es_cruce boolean;
  v_avanza uuid;
  v_hay_penales boolean;
  v_hay_prorroga boolean;
begin
  select fase, torneo_id, equipo_local_id, equipo_visitante_id
    into v_fase, v_torneo_id, v_el, v_ev
  from public."tblPartidos"
  where id = p_partido_id;

  if v_fase is null then
    raise exception 'Partido % no existe', p_partido_id;
  end if;

  v_empate := p_goles_local = p_goles_visitante;
  v_es_cruce := v_fase <> 'fase_grupos';
  v_hay_penales := p_penales_local is not null and p_penales_visitante is not null;
  v_hay_prorroga := p_prorroga_local is not null and p_prorroga_visitante is not null;

  -- Solo un cruce empatado a los 90' necesita desempate (tiempo extra o penales).
  if v_es_cruce and v_empate then
    if v_hay_penales then
      if p_penales_local = p_penales_visitante then
        raise exception 'Los penales no pueden quedar empatados';
      end if;
      v_tipo := 'penales';
      v_avanza := case when p_penales_local > p_penales_visitante then v_el else v_ev end;
    elsif v_hay_prorroga then
      if p_prorroga_local = p_prorroga_visitante then
        raise exception 'El marcador del tiempo extra no puede quedar empatado';
      end if;
      v_tipo := 'prorroga';
      v_avanza := case when p_prorroga_local > p_prorroga_visitante then v_el else v_ev end;
    else
      raise exception 'Empate a los 90'' en cruce: define el tiempo extra o los penales';
    end if;
  else
    v_tipo := 'regular';
    v_avanza := null;
    v_hay_penales := false;
    v_hay_prorroga := false;
  end if;

  -- 1) Registrar marcador de los 90' + desempate + tipo + equipo que avanza.
  update public."tblPartidos"
     set goles_local = p_goles_local,
         goles_visitante = p_goles_visitante,
         penales_local = case when v_tipo = 'penales' then p_penales_local else null end,
         penales_visitante = case when v_tipo = 'penales' then p_penales_visitante else null end,
         prorroga_local = case when v_tipo = 'prorroga' then p_prorroga_local else null end,
         prorroga_visitante = case when v_tipo = 'prorroga' then p_prorroga_visitante else null end,
         tipo_definicion = v_tipo,
         equipo_avanza_id = v_avanza,
         estado = 'finalizado'
   where id = p_partido_id;

  -- 2) Puntaje base por predicción (marcador de los 90'; desempates no puntúan).
  update public."tblPredicciones" pred
     set puntos_obtenidos = sub.pts,
         prediccion_unica = false
    from (
      select
        pr.id,
        case
          when pr.goles_local = p_goles_local
           and pr.goles_visitante = p_goles_visitante
          then r.pts_marcador_exacto
          else
            (case when (case when pr.goles_local > pr.goles_visitante then 1
                             when pr.goles_local < pr.goles_visitante then -1 else 0 end)
                     = (case when p_goles_local > p_goles_visitante then 1
                             when p_goles_local < p_goles_visitante then -1 else 0 end)
                  then r.pts_ganador else 0 end)
            + (case when pr.goles_local = p_goles_local then r.pts_gol_acertado else 0 end)
            + (case when pr.goles_visitante = p_goles_visitante then r.pts_gol_acertado else 0 end)
        end as pts
      from public."tblPredicciones" pr
      join public."tblParticipantes" part on part.id = pr.participante_id
      join public."tblReglasGrupo" r on r.grupo_id = part.grupo_id
      where pr.partido_id = p_partido_id
    ) sub
   where pred.id = sub.id;

  -- 3) Bono "predicción única": al único del grupo que clavó el marcador exacto
  update public."tblPredicciones" pred
     set puntos_obtenidos = pred.puntos_obtenidos + r.pts_prediccion_unica,
         prediccion_unica = true
    from public."tblParticipantes" part
    join public."tblReglasGrupo" r on r.grupo_id = part.grupo_id
   where pred.participante_id = part.id
     and pred.partido_id = p_partido_id
     and pred.goles_local = p_goles_local
     and pred.goles_visitante = p_goles_visitante
     and r.pts_prediccion_unica > 0
     and (
       select count(*)
       from public."tblPredicciones" p2
       join public."tblParticipantes" pt2 on pt2.id = p2.participante_id
       where p2.partido_id = p_partido_id
         and pt2.grupo_id = part.grupo_id
         and p2.goles_local = p_goles_local
         and p2.goles_visitante = p_goles_visitante
     ) = 1;

  -- 4) Propagar clasificados (ganador_partido usa equipo_avanza_id en empates).
  perform public.resolver_cruces(v_torneo_id);

  -- 5) Recalcular bonos de fase (todo-o-nada por acertar los avances).
  perform public.recalcular_bonos_fase_partido(p_partido_id);
end;
$function$;

revoke all on function public.finalizar_partido(uuid, integer, integer, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.finalizar_partido(uuid, integer, integer, integer, integer, integer, integer) to service_role;

-- ── 3. revertir_partido: limpiar también el marcador de prórroga ────────────
create or replace function public.revertir_partido(p_partido_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_torneo_id uuid;
begin
  update public."tblPredicciones"
     set puntos_obtenidos = 0,
         prediccion_unica = false
   where partido_id = p_partido_id;

  update public."tblPartidos"
     set goles_local = null,
         goles_visitante = null,
         penales_local = null,
         penales_visitante = null,
         prorroga_local = null,
         prorroga_visitante = null,
         tipo_definicion = 'regular',
         equipo_avanza_id = null,
         estado = 'programado'
   where id = p_partido_id
   returning torneo_id into v_torneo_id;

  if v_torneo_id is null then
    raise exception 'Partido % no existe', p_partido_id;
  end if;

  perform public.resolver_cruces(v_torneo_id);

  perform public.recalcular_bonos_fase_partido(p_partido_id);
end;
$function$;

-- ── 4. grupo_detalle: exponer el marcador de prórroga en el JSON de partidos ─
create or replace function public.grupo_detalle(p_grupo_id uuid)
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
  with mi as (
    select id, rol
    from public."tblParticipantes"
    where grupo_id = p_grupo_id and usuario_id = auth.uid()
      and eliminado_en is null
    limit 1
  ),
  acc as (
    select
      (select id from mi)                                  as mi_id,
      coalesce((select rol = 'admin' from mi), false)
        or public.es_superadmin()                          as es_admin,
      exists (select 1 from mi) or public.es_superadmin()  as puede_ver
  )
  select case
    when not (select puede_ver from acc) then null::jsonb
    else jsonb_build_object(
      'miParticipanteId', (select mi_id from acc),
      'esAdmin', (select es_admin from acc),
      'grupo', (
        select jsonb_build_object(
          'id', g.id, 'nombre', g.nombre, 'descripcion', g.descripcion,
          'codigo_invitacion', g.codigo_invitacion, 'creador_id', g.creador_id,
          'creado_en', g.creado_en)
        from public."tblGrupos" g where g.id = p_grupo_id),
      'reglas', (
        select to_jsonb(r) from public."tblReglasGrupo" r where r.grupo_id = p_grupo_id),
      'participantes', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', p.id, 'rol', p.rol, 'pago_realizado', p.pago_realizado,
          'puntos_iniciales', p.puntos_iniciales,
          'exactos_iniciales', p.exactos_iniciales,
          'unicas_iniciales', p.unicas_iniciales,
          'aciertos_iniciales', p.aciertos_iniciales,
          'usuario', jsonb_build_object(
            'id', prof.id, 'nombre_completo', prof.nombre_completo,
            'email', case when (select es_admin from acc) then prof.email else null end,
            'avatar_url', prof.avatar_url)))
        from public."tblParticipantes" p
        join public."tblProfiles" prof on prof.id = p.usuario_id
        where p.grupo_id = p_grupo_id and p.eliminado_en is null), '[]'::jsonb),
      'tabla', coalesce((
        select jsonb_agg(jsonb_build_object(
          'participante_id', v.participante_id, 'posicion', v.posicion,
          'nombre_completo', v.nombre_completo, 'avatar_url', v.avatar_url,
          'puntos_totales', v.puntos_totales, 'aciertos', v.aciertos,
          'puntos_iniciales', v.puntos_iniciales,
          'marcadores_exactos', v.marcadores_exactos,
          'bonos_fase', v.bonos_fase,
          'unicas_acertadas', v.unicas_acertadas) order by v.posicion asc)
        from public."vwTablaPosiciones" v where v.grupo_id = p_grupo_id), '[]'::jsonb),
      'misBonosFase', coalesce((
        select jsonb_agg(jsonb_build_object('fase', bf.fase, 'puntos', bf.puntos))
        from public."tblBonosFase" bf
        where bf.participante_id = (select mi_id from acc)), '[]'::jsonb),
      'partidos', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', pa.id, 'torneo_id', pa.torneo_id, 'numero_partido', pa.numero_partido,
          'fase', pa.fase, 'grupo', pa.grupo,
          'placeholder_local', pa.placeholder_local,
          'placeholder_visitante', pa.placeholder_visitante,
          'fecha_hora', pa.fecha_hora, 'estadio', pa.estadio, 'ciudad', pa.ciudad,
          'goles_local', pa.goles_local, 'goles_visitante', pa.goles_visitante,
          'penales_local', pa.penales_local, 'penales_visitante', pa.penales_visitante,
          'prorroga_local', pa.prorroga_local, 'prorroga_visitante', pa.prorroga_visitante,
          'tipo_definicion', pa.tipo_definicion,
          'equipo_avanza_id', pa.equipo_avanza_id,
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
          'puntos_obtenidos', pr.puntos_obtenidos, 'prediccion_unica', pr.prediccion_unica,
          'equipo_avanza_id', pr.equipo_avanza_id))
        from public."tblPredicciones" pr
        where pr.participante_id = (select mi_id from acc)), '[]'::jsonb)
    )
  end;
$function$;

revoke execute on function public.grupo_detalle(uuid) from public, anon;
grant execute on function public.grupo_detalle(uuid) to authenticated;
