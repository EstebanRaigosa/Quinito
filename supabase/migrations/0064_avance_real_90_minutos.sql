-- 0064_avance_real_90_minutos.sql
--
-- Separa dos cosas que estaban mezcladas en un cruce eliminatorio:
--   1. El MARCADOR DE LOS 90' (goles_local/goles_visitante): es lo único que
--      puntúa las predicciones (tiempo reglamentario).
--   2. QUIÉN AVANZA cuando ese marcador quedó empatado: se resuelve en tiempo
--      extra o por penales, y NO cambia el puntaje, solo define el clasificado.
--
-- Para (2) se agrega tblPartidos.equipo_avanza_id (el equipo que avanza, REAL),
-- simétrico al equipo_avanza_id de la predicción (migración 0061). Cuando el
-- marcador de los 90' tiene ganador, el avance se deriva del marcador y
-- equipo_avanza_id queda null. El tiempo extra solo ocurre con empate a los 90'.
--
-- ganador_partido y el bono de fase pasan a usar equipo_avanza_id como fuente de
-- verdad del avance en empates (antes derivaban de la tanda de penales).

-- ── 1. Columna del avance real ───────────────────────────────────────────────
alter table public."tblPartidos"
  add column equipo_avanza_id uuid references public."tblEquipos"(id);

comment on column public."tblPartidos".equipo_avanza_id is
  'Equipo que avanza cuando el marcador de los 90'' quedó empatado (definido en tiempo extra o penales). Null si hubo ganador en los 90''. Fuente de verdad del avance; los penales son solo el marcador de la tanda.';

-- Backfill: cruces ya finalizados que quedaron empatados y tenían tanda de
-- penales → el avance es el ganador de la tanda.
update public."tblPartidos"
   set equipo_avanza_id = case
         when penales_local > penales_visitante then equipo_local_id
         else equipo_visitante_id
       end
 where estado = 'finalizado'
   and goles_local = goles_visitante
   and penales_local is not null and penales_visitante is not null
   and penales_local <> penales_visitante;

-- ── 2. ganador_partido: en empate, usa equipo_avanza_id ─────────────────────
create or replace function public.ganador_partido(
  p_torneo_id uuid,
  p_numero int,
  p_ganador boolean
)
returns uuid
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_gl int; v_gv int; v_avanza uuid; v_el uuid; v_ev uuid; v_estado text;
  v_gana_local boolean;
begin
  select goles_local, goles_visitante, equipo_avanza_id,
         equipo_local_id, equipo_visitante_id, estado
    into v_gl, v_gv, v_avanza, v_el, v_ev, v_estado
  from public."tblPartidos"
  where torneo_id = p_torneo_id and numero_partido = p_numero;

  if v_estado is distinct from 'finalizado' or v_gl is null or v_gv is null then
    return null;
  end if;

  -- Ganador por el marcador de los 90'; si hubo empate, por el equipo que avanza
  -- (definido en tiempo extra o penales).
  if v_gl > v_gv then
    v_gana_local := true;
  elsif v_gl < v_gv then
    v_gana_local := false;
  elsif v_avanza is not null then
    v_gana_local := v_avanza = v_el;
  else
    return null; -- empate sin avance definido: aún no se puede determinar
  end if;

  if p_ganador then
    return case when v_gana_local then v_el else v_ev end;
  else
    return case when v_gana_local then v_ev else v_el end;
  end if;
end;
$function$;

revoke all on function public.ganador_partido(uuid, int, boolean) from anon, authenticated;

-- ── 3. recalcular_bonos_fase_grupo: avance real = equipo_avanza_id en empate ─
-- Igual que 0061 salvo el CASE del avance real, que ahora usa equipo_avanza_id
-- (simétrico al avance predicho, que ya usaba pr.equipo_avanza_id).
create or replace function public.recalcular_bonos_fase_grupo(
  p_grupo_id uuid,
  p_fase fase_torneo
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_total int;
  v_finalizados int;
begin
  if p_fase not in ('dieciseisavos','octavos','cuartos','semifinales','final') then
    return;
  end if;

  select count(*),
         count(*) filter (where pa.estado = 'finalizado')
    into v_total, v_finalizados
  from public."tblGrupoPartidos" gp
  join public."tblPartidos" pa on pa.id = gp.partido_id
  where gp.grupo_id = p_grupo_id and pa.fase = p_fase;

  delete from public."tblBonosFase" bf
   using public."tblParticipantes" part
   where bf.participante_id = part.id
     and part.grupo_id = p_grupo_id
     and bf.fase = p_fase;

  if v_total = 0 or v_finalizados < v_total then
    return;
  end if;

  insert into public."tblBonosFase" (participante_id, fase, puntos)
  select part.id,
         p_fase,
         case p_fase
           when 'dieciseisavos' then rg.bono_dieciseisavos
           when 'octavos'       then rg.bono_octavos
           when 'cuartos'       then rg.bono_cuartos
           when 'semifinales'   then rg.bono_semifinales
           when 'final'         then rg.bono_final
         end as pts
    from public."tblParticipantes" part
    join public."tblReglasGrupo" rg on rg.grupo_id = part.grupo_id
   where part.grupo_id = p_grupo_id
     and part.eliminado_en is null
     and v_total = (
       select count(*)
       from public."tblGrupoPartidos" gp
       join public."tblPartidos" pa on pa.id = gp.partido_id
       join public."tblPredicciones" pr
         on pr.partido_id = pa.id and pr.participante_id = part.id
      where gp.grupo_id = p_grupo_id
        and pa.fase = p_fase
        -- Avance real: por el marcador de los 90' y, si hubo empate, el equipo
        -- que avanzó (equipo_avanza_id; tiempo extra o penales).
        and (case when pa.goles_local > pa.goles_visitante then pa.equipo_local_id
                  when pa.goles_local < pa.goles_visitante then pa.equipo_visitante_id
                  else pa.equipo_avanza_id end) is not null
        and (case when pa.goles_local > pa.goles_visitante then pa.equipo_local_id
                  when pa.goles_local < pa.goles_visitante then pa.equipo_visitante_id
                  else pa.equipo_avanza_id end)
          -- Avance predicho: por el marcador predicho y, si lo igualó, el equipo
          -- que el usuario marcó como "pasa".
          = (case when pr.goles_local > pr.goles_visitante then pa.equipo_local_id
                  when pr.goles_local < pr.goles_visitante then pa.equipo_visitante_id
                  else pr.equipo_avanza_id end)
     )
     and case p_fase
           when 'dieciseisavos' then rg.bono_dieciseisavos
           when 'octavos'       then rg.bono_octavos
           when 'cuartos'       then rg.bono_cuartos
           when 'semifinales'   then rg.bono_semifinales
           when 'final'         then rg.bono_final
         end > 0;
end;
$function$;

revoke all on function public.recalcular_bonos_fase_grupo(uuid, fase_torneo) from public, anon, authenticated;

-- ── 4. finalizar_partido: recibe el equipo que avanza (empate a los 90') ────
-- Reemplaza la firma con p_prorroga (0062) por una con p_equipo_avanza_id. El
-- tipo_definicion se deriva: empate a los 90' con tanda → penales; empate sin
-- tanda → prórroga; con ganador a los 90' → regular (los empates de grupo
-- también quedan 'regular').
drop function if exists public.finalizar_partido(uuid, integer, integer, integer, integer, boolean);

create function public.finalizar_partido(
  p_partido_id uuid,
  p_goles_local integer,
  p_goles_visitante integer,
  p_penales_local integer default null,
  p_penales_visitante integer default null,
  p_equipo_avanza_id uuid default null
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

  -- Solo un cruce empatado a los 90' tiene definición por tiempo extra/penales;
  -- en cualquier otro caso el avance sale del marcador y no hay equipo_avanza_id.
  if v_es_cruce and v_empate then
    if p_equipo_avanza_id is null then
      raise exception 'Empate a los 90'' en cruce: falta el equipo que avanza';
    end if;
    if p_equipo_avanza_id <> v_el and p_equipo_avanza_id <> v_ev then
      raise exception 'El equipo que avanza no participa en el partido %', p_partido_id;
    end if;
    v_avanza := p_equipo_avanza_id;
    v_tipo := case
      when p_penales_local is not null and p_penales_visitante is not null
        then 'penales'
      else 'prorroga'
    end;
  else
    v_avanza := null;
    v_tipo := 'regular';
  end if;

  -- 1) Registrar marcador de los 90' + tanda + tipo + equipo que avanza.
  update public."tblPartidos"
     set goles_local = p_goles_local,
         goles_visitante = p_goles_visitante,
         penales_local = case when v_tipo = 'penales' then p_penales_local else null end,
         penales_visitante = case when v_tipo = 'penales' then p_penales_visitante else null end,
         tipo_definicion = v_tipo,
         equipo_avanza_id = v_avanza,
         estado = 'finalizado'
   where id = p_partido_id;

  -- 2) Puntaje base por predicción (marcador de los 90'; tiempo extra/penales no puntúan).
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

revoke all on function public.finalizar_partido(uuid, integer, integer, integer, integer, uuid) from public, anon, authenticated;
grant execute on function public.finalizar_partido(uuid, integer, integer, integer, integer, uuid) to service_role;

-- ── 5. revertir_partido: limpiar también el equipo que avanza ───────────────
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

-- ── 6. grupo_detalle: exponer equipo_avanza_id (real) en el JSON de partidos ─
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
          'codigo_invitacion', g.codigo_invitacion, 'creador_id', g.creador_id)
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
