-- 0062_definicion_partido.sql
--
-- Distingue CÓMO se definió un cruce eliminatorio: en los 90' (regular), en la
-- prórroga (tiempo extra) o por penales. El marcador (goles_local/visitante) ya
-- incluye los goles de la prórroga, así que un 2-1 ganado en tiempo extra es
-- indistinguible de un 2-1 en los 90' sin un dato explícito.
--
-- Modelo: enum tipo_definicion + columna en tblPartidos. La calcula
-- finalizar_partido a partir de lo que carga el admin (penales > prórroga >
-- regular). Es solo informativa para la UI; la puntuación y el bono de fase no
-- cambian (siguen derivando de goles y, en empate, de penales — ver 0055/0061).

-- ── 1. Enum del tipo de definición ──────────────────────────────────────────
create type public.tipo_definicion as enum ('regular', 'prorroga', 'penales');

-- ── 2. Columna en tblPartidos ───────────────────────────────────────────────
alter table public."tblPartidos"
  add column tipo_definicion public.tipo_definicion not null default 'regular';

comment on column public."tblPartidos".tipo_definicion is
  'Cómo se definió el partido: regular (90''), prorroga (tiempo extra) o penales. La setea finalizar_partido; solo informativa para la UI.';

-- Backfill: los partidos ya finalizados con tanda de penales pasan a 'penales';
-- el resto queda 'regular' (default). No hay forma de saber retroactivamente si
-- un resultado pasado se definió en prórroga, así que se asume regular.
update public."tblPartidos"
   set tipo_definicion = 'penales'
 where penales_local is not null and penales_visitante is not null;

-- ── 3. finalizar_partido: acepta "prórroga" y setea tipo_definicion ─────────
-- Cambia la firma (agrega p_prorroga) → se elimina la versión anterior para no
-- dejar una sobrecarga huérfana que cause ambigüedad al llamar por nombre.
drop function if exists public.finalizar_partido(uuid, integer, integer, integer, integer);

create function public.finalizar_partido(
  p_partido_id uuid,
  p_goles_local integer,
  p_goles_visitante integer,
  p_penales_local integer default null,
  p_penales_visitante integer default null,
  p_prorroga boolean default false
)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_fase fase_torneo;
  v_torneo_id uuid;
  v_tipo public.tipo_definicion;
begin
  -- Cómo se definió: penales manda; si no, prórroga; si no, regular.
  v_tipo := case
    when p_penales_local is not null and p_penales_visitante is not null then 'penales'
    when p_prorroga then 'prorroga'
    else 'regular'
  end;

  -- 1) Registrar resultado real + penales + tipo de definición + finalizado.
  update public."tblPartidos"
     set goles_local = p_goles_local,
         goles_visitante = p_goles_visitante,
         penales_local = p_penales_local,
         penales_visitante = p_penales_visitante,
         tipo_definicion = v_tipo,
         estado = 'finalizado'
   where id = p_partido_id
   returning fase, torneo_id into v_fase, v_torneo_id;

  if v_fase is null then
    raise exception 'Partido % no existe', p_partido_id;
  end if;

  -- 2) Puntaje base por predicción (solo por goles; penales/prórroga no puntúan).
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

revoke all on function public.finalizar_partido(uuid, integer, integer, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.finalizar_partido(uuid, integer, integer, integer, integer, boolean) to service_role;

-- ── 4. revertir_partido: limpiar también el tipo de definición ──────────────
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
