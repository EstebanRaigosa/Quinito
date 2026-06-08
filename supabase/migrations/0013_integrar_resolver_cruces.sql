-- Integra resolver_cruces() en el ciclo de vida de los resultados: al
-- finalizar o revertir un partido, se recalculan los cruces del torneo para
-- propagar (o retirar) equipos clasificados hacia las rondas siguientes.

create or replace function public.finalizar_partido(p_partido_id uuid, p_goles_local integer, p_goles_visitante integer)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_fase fase_torneo;
  v_torneo_id uuid;
begin
  -- 1) Registrar resultado real + marcar finalizado
  update public."tblPartidos"
     set goles_local = p_goles_local,
         goles_visitante = p_goles_visitante,
         estado = 'finalizado'
   where id = p_partido_id
   returning fase, torneo_id into v_fase, v_torneo_id;

  if v_fase is null then
    raise exception 'Partido % no existe', p_partido_id;
  end if;

  -- 2) Puntaje base por predicción (exacto excluye ganador/gol; bono solo si exacto)
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
               + case v_fase
                   when 'dieciseisavos' then r.bono_dieciseisavos
                   when 'octavos'       then r.bono_octavos
                   when 'cuartos'       then r.bono_cuartos
                   when 'semifinales'   then r.bono_semifinales
                   when 'final'         then r.bono_final
                   else 0
                 end
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

  -- 4) Propagar clasificados a las rondas siguientes (cruces eliminatorios).
  perform public.resolver_cruces(v_torneo_id);
end;
$function$;

create or replace function public.revertir_partido(p_partido_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_torneo_id uuid;
begin
  -- 1) Revertir puntos de las predicciones a su estado por defecto.
  update public."tblPredicciones"
     set puntos_obtenidos = 0,
         prediccion_unica = false
   where partido_id = p_partido_id;

  -- 2) Limpiar el marcador real y volver el partido a "programado".
  update public."tblPartidos"
     set goles_local = null,
         goles_visitante = null,
         estado = 'programado'
   where id = p_partido_id
   returning torneo_id into v_torneo_id;

  if v_torneo_id is null then
    raise exception 'Partido % no existe', p_partido_id;
  end if;

  -- 3) Recalcular cruces: si este partido alimentaba una ronda siguiente,
  --    esos equipos vuelven a quedar "por definir".
  perform public.resolver_cruces(v_torneo_id);
end;
$function$;
