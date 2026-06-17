-- 0055_penales_eliminatorias.sql
--
-- Permite resolver cruces eliminatorios que terminan EMPATADOS en el marcador:
-- el superadmin registra el marcador de la tanda de penales y con eso se decide
-- quién avanza. Los penales NO alteran el marcador de los 120 minutos: la
-- puntuación normal (marcador exacto, ganador, goles, predicción única) sigue
-- usando solo goles_local/goles_visitante. Los penales solo determinan el
-- "equipo que avanza" (cruces de la ronda siguiente + bono de fase).
--
-- Predicción del usuario: solo predice el marcador, no la tanda. Por eso un
-- empate predicho sigue siendo "avance indeterminado" para el bono de fase.

-- ── 1. Columnas de penales ──────────────────────────────────────────────────
alter table public."tblPartidos"
  add column penales_local int check (penales_local >= 0),
  add column penales_visitante int check (penales_visitante >= 0);

comment on column public."tblPartidos".penales_local is
  'Goles de la tanda de penales del equipo local (solo cruces eliminatorios empatados). No afecta la puntuación, solo quién avanza.';
comment on column public."tblPartidos".penales_visitante is
  'Goles de la tanda de penales del equipo visitante. No afecta la puntuación, solo quién avanza.';

-- ── 2. ganador_partido: desempata por penales si el marcador quedó igualado ──
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
  v_gl int; v_gv int; v_pl int; v_pv int; v_el uuid; v_ev uuid; v_estado text;
  v_gana_local boolean;
begin
  select goles_local, goles_visitante, penales_local, penales_visitante,
         equipo_local_id, equipo_visitante_id, estado
    into v_gl, v_gv, v_pl, v_pv, v_el, v_ev, v_estado
  from public."tblPartidos"
  where torneo_id = p_torneo_id and numero_partido = p_numero;

  if v_estado is distinct from 'finalizado' or v_gl is null or v_gv is null then
    return null;
  end if;

  -- Ganador por marcador; si hay empate, por la tanda de penales.
  if v_gl > v_gv then
    v_gana_local := true;
  elsif v_gl < v_gv then
    v_gana_local := false;
  elsif v_pl is not null and v_pv is not null and v_pl <> v_pv then
    v_gana_local := v_pl > v_pv;
  else
    return null; -- empate sin penales definidos: aún no se puede determinar
  end if;

  if p_ganador then
    return case when v_gana_local then v_el else v_ev end;
  else
    return case when v_gana_local then v_ev else v_el end;
  end if;
end;
$function$;

revoke all on function public.ganador_partido(uuid, int, boolean) from anon, authenticated;

-- ── 3. recalcular_bonos_fase_grupo: el "equipo que avanza real" usa penales ──
-- Igual que en 0054 salvo el CASE del avance real, que ahora desempata por
-- penales cuando el marcador quedó igualado. El avance PREDICHO sigue derivando
-- solo del marcador (el usuario no predice la tanda).
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
        -- Equipo que avanza real: por goles y, si empate, por penales (null si indefinido).
        and (case when pa.goles_local > pa.goles_visitante then pa.equipo_local_id
                  when pa.goles_local < pa.goles_visitante then pa.equipo_visitante_id
                  when pa.penales_local is not null and pa.penales_visitante is not null
                       and pa.penales_local <> pa.penales_visitante
                    then case when pa.penales_local > pa.penales_visitante
                              then pa.equipo_local_id else pa.equipo_visitante_id end
             end) is not null
        and (case when pa.goles_local > pa.goles_visitante then pa.equipo_local_id
                  when pa.goles_local < pa.goles_visitante then pa.equipo_visitante_id
                  when pa.penales_local is not null and pa.penales_visitante is not null
                       and pa.penales_local <> pa.penales_visitante
                    then case when pa.penales_local > pa.penales_visitante
                              then pa.equipo_local_id else pa.equipo_visitante_id end
             end)
          -- Avance predicho: solo por el marcador del usuario (empate => indeterminado).
          = (case when pr.goles_local > pr.goles_visitante then pa.equipo_local_id
                  when pr.goles_local < pr.goles_visitante then pa.equipo_visitante_id end)
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

-- ── 4. finalizar_partido: acepta el marcador de la tanda de penales ─────────
-- Cambia la firma (agrega penales) → se elimina la versión anterior para no
-- dejar una sobrecarga huérfana que cause ambigüedad al llamar por nombre.
drop function if exists public.finalizar_partido(uuid, integer, integer);

create function public.finalizar_partido(
  p_partido_id uuid,
  p_goles_local integer,
  p_goles_visitante integer,
  p_penales_local integer default null,
  p_penales_visitante integer default null
)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_fase fase_torneo;
  v_torneo_id uuid;
begin
  -- 1) Registrar resultado real + penales (null si no hubo tanda) + finalizado.
  update public."tblPartidos"
     set goles_local = p_goles_local,
         goles_visitante = p_goles_visitante,
         penales_local = p_penales_local,
         penales_visitante = p_penales_visitante,
         estado = 'finalizado'
   where id = p_partido_id
   returning fase, torneo_id into v_fase, v_torneo_id;

  if v_fase is null then
    raise exception 'Partido % no existe', p_partido_id;
  end if;

  -- 2) Puntaje base por predicción (solo por goles; penales no puntúan).
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

  -- 4) Propagar clasificados (los cruces ya usan penales vía ganador_partido).
  perform public.resolver_cruces(v_torneo_id);

  -- 5) Recalcular bonos de fase (todo-o-nada por acertar los avances).
  perform public.recalcular_bonos_fase_partido(p_partido_id);
end;
$function$;

revoke all on function public.finalizar_partido(uuid, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.finalizar_partido(uuid, integer, integer, integer, integer) to service_role;

-- ── 5. revertir_partido: limpiar también los penales ────────────────────────
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
