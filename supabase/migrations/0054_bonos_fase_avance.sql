-- 0054_bonos_fase_avance.sql
--
-- Redefine el "bono por fase". Antes era un extra por-partido que se sumaba al
-- acertar el MARCADOR EXACTO de un partido eliminatorio. Ahora es un bono
-- TODO-O-NADA por fase: se otorga al participante que acierta el EQUIPO QUE
-- AVANZA en TODOS los partidos de esa fase eliminatoria que su grupo apuesta.
--
-- Fases con bono (y su nº de partidos en el Mundial 2026):
--   dieciseisavos (16) · octavos (8) · cuartos (4) · semifinales (2) · final (1)
--
-- "Equipo que avanza" = ganador por marcador (más goles). Se deriva igual del
-- marcador real y del predicho. Un empate (real o predicho) es indeterminado y
-- NO cuenta como avance acertado — consistente con el resto del sistema, que no
-- modela penales (ver `ganador_partido` en 0012).
--
-- El bono se evalúa cuando TODOS los partidos de la fase apostados por el grupo
-- están finalizados. Es idempotente: se recalcula al finalizar o revertir
-- cualquier partido de la fase, así que revertir un resultado retira el bono.
--
-- Decisiones de diseño:
--   * La base son los partidos de la fase que el grupo apuesta (tblGrupoPartidos),
--     no todos los del torneo: los participantes solo predicen esos.
--   * El monto del bono se toma de tblReglasGrupo al momento del cálculo (igual
--     que el resto de la puntuación, no se recalcula al cambiar reglas a futuro).

-- ── 1. Tabla de bonos de fase otorgados ─────────────────────────────────────
create table public."tblBonosFase" (
  participante_id uuid not null references public."tblParticipantes"(id) on delete cascade,
  fase fase_torneo not null,
  puntos int not null check (puntos >= 0),
  otorgado_en timestamptz not null default now(),
  primary key (participante_id, fase)
);

comment on table public."tblBonosFase" is
  'Bonos por fase otorgados: el participante acertó el equipo que avanza en TODOS los partidos de esa fase eliminatoria apostados por su grupo. Lo gestiona recalcular_bonos_fase_grupo(); se suma en vwTablaPosiciones.';

alter table public."tblBonosFase" enable row level security;

-- Lectura: miembros del grupo del participante (la escritura es solo vía las
-- funciones SECURITY DEFINER de abajo; no hay policy de insert/update/delete).
create policy "bonos_fase_select" on public."tblBonosFase"
for select to authenticated
using (
  exists (
    select 1 from public."tblParticipantes" part
    where part.id = "tblBonosFase".participante_id
      and public.es_miembro_grupo(part.grupo_id)
  )
);

-- ── 2. Recálculo del bono de una fase para un grupo ─────────────────────────
-- Idempotente: borra los bonos previos de esa fase para el grupo y los vuelve a
-- otorgar solo si la fase está completa y el participante acertó todos los avances.
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
  -- Solo fases eliminatorias con bono.
  if p_fase not in ('dieciseisavos','octavos','cuartos','semifinales','final') then
    return;
  end if;

  -- Partidos de la fase que el grupo apuesta.
  select count(*),
         count(*) filter (where pa.estado = 'finalizado')
    into v_total, v_finalizados
  from public."tblGrupoPartidos" gp
  join public."tblPartidos" pa on pa.id = gp.partido_id
  where gp.grupo_id = p_grupo_id and pa.fase = p_fase;

  -- Recálculo limpio: se retiran los bonos previos de esta fase en el grupo.
  delete from public."tblBonosFase" bf
   using public."tblParticipantes" part
   where bf.participante_id = part.id
     and part.grupo_id = p_grupo_id
     and bf.fase = p_fase;

  -- Fase inexistente o incompleta: no se otorga nada (queda retirado).
  if v_total = 0 or v_finalizados < v_total then
    return;
  end if;

  -- Otorga el bono a quien acertó el equipo que avanza en TODOS los partidos.
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
     -- Acertó el avance en todos: nº de aciertos = nº total de partidos de la fase.
     and v_total = (
       select count(*)
       from public."tblGrupoPartidos" gp
       join public."tblPartidos" pa on pa.id = gp.partido_id
       join public."tblPredicciones" pr
         on pr.partido_id = pa.id and pr.participante_id = part.id
      where gp.grupo_id = p_grupo_id
        and pa.fase = p_fase
        -- Equipo que avanza real (null si empate).
        and (case when pa.goles_local > pa.goles_visitante then pa.equipo_local_id
                  when pa.goles_local < pa.goles_visitante then pa.equipo_visitante_id end) is not null
        -- Coincide con el equipo que avanza según el marcador predicho.
        and (case when pa.goles_local > pa.goles_visitante then pa.equipo_local_id
                  when pa.goles_local < pa.goles_visitante then pa.equipo_visitante_id end)
          = (case when pr.goles_local > pr.goles_visitante then pa.equipo_local_id
                  when pr.goles_local < pr.goles_visitante then pa.equipo_visitante_id end)
     )
     -- Solo si el bono configurado es > 0.
     and case p_fase
           when 'dieciseisavos' then rg.bono_dieciseisavos
           when 'octavos'       then rg.bono_octavos
           when 'cuartos'       then rg.bono_cuartos
           when 'semifinales'   then rg.bono_semifinales
           when 'final'         then rg.bono_final
         end > 0;
end;
$function$;

-- ── 3. Recálculo disparado por un partido (todos los grupos que lo apuestan) ─
create or replace function public.recalcular_bonos_fase_partido(p_partido_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_fase fase_torneo;
  r record;
begin
  select fase into v_fase from public."tblPartidos" where id = p_partido_id;
  if v_fase is null
     or v_fase not in ('dieciseisavos','octavos','cuartos','semifinales','final') then
    return;
  end if;

  for r in
    select distinct grupo_id
    from public."tblGrupoPartidos"
    where partido_id = p_partido_id
  loop
    perform public.recalcular_bonos_fase_grupo(r.grupo_id, v_fase);
  end loop;
end;
$function$;

-- Funciones internas: solo se invocan desde finalizar_partido/revertir_partido
-- (ambas SECURITY DEFINER). Se revoca de public para que ningún rol las ejecute.
revoke all on function public.recalcular_bonos_fase_grupo(uuid, fase_torneo) from public, anon, authenticated;
revoke all on function public.recalcular_bonos_fase_partido(uuid) from public, anon, authenticated;

-- ── 4. finalizar_partido: el bono ya NO es por marcador exacto ──────────────
-- El marcador exacto pasa a sumar solo pts_marcador_exacto. El bono de fase se
-- otorga aparte, al completarse la fase (paso final).
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

  -- 2) Puntaje base por predicción (exacto excluye ganador/gol; sin bono aquí).
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

  -- 4) Propagar clasificados a las rondas siguientes (cruces eliminatorios).
  perform public.resolver_cruces(v_torneo_id);

  -- 5) Recalcular bonos de fase (todo-o-nada por acertar los avances).
  perform public.recalcular_bonos_fase_partido(p_partido_id);
end;
$function$;

-- ── 5. revertir_partido: retirar/ recalcular bonos de la fase ───────────────
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

  -- 4) Recalcular bonos de fase: la fase deja de estar completa → se retiran.
  perform public.recalcular_bonos_fase_partido(p_partido_id);
end;
$function$;

-- ── 6. Tabla de posiciones: sumar los bonos de fase al puntaje total ────────
-- Idéntica a 0051 salvo: se agrega un LEFT JOIN LATERAL con el total de bonos de
-- fase por participante, que se suma a `puntos_totales` (columna de salida y
-- primer criterio del row_number) y se expone como nueva columna `bonos_fase`.
create or replace view public."vwTablaPosiciones" as
 SELECT p.grupo_id,
    p.id AS participante_id,
    prof.nombre_completo,
    prof.avatar_url,
    COALESCE(sum(pred.puntos_obtenidos), 0::bigint) + p.puntos_iniciales + bonos.total_bonos AS puntos_totales,
    count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0 AND NOT (pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text)) + p.aciertos_iniciales AS aciertos,
    count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales AS marcadores_exactos,
    row_number() OVER (PARTITION BY p.grupo_id ORDER BY (COALESCE(sum(pred.puntos_obtenidos), 0::bigint) + p.puntos_iniciales + bonos.total_bonos) DESC, (
        CASE rg.criterios_desempate[1]
            WHEN 'exactos'::text THEN count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales
            WHEN 'unicas'::text THEN count(pred.id) FILTER (WHERE pred.prediccion_unica) + p.unicas_iniciales
            WHEN 'aciertos'::text THEN count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0 AND NOT (pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text)) + p.aciertos_iniciales
            ELSE 0::bigint
        END) DESC, (
        CASE rg.criterios_desempate[2]
            WHEN 'exactos'::text THEN count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales
            WHEN 'unicas'::text THEN count(pred.id) FILTER (WHERE pred.prediccion_unica) + p.unicas_iniciales
            WHEN 'aciertos'::text THEN count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0 AND NOT (pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text)) + p.aciertos_iniciales
            ELSE 0::bigint
        END) DESC, (
        CASE rg.criterios_desempate[3]
            WHEN 'exactos'::text THEN count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) + p.exactos_iniciales
            WHEN 'unicas'::text THEN count(pred.id) FILTER (WHERE pred.prediccion_unica) + p.unicas_iniciales
            WHEN 'aciertos'::text THEN count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0 AND NOT (pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text)) + p.aciertos_iniciales
            ELSE 0::bigint
        END) DESC, (count(pred.id) FILTER (WHERE pa.estado = 'finalizado'::text AND (pred.goles_local - pred.goles_visitante) = (pa.goles_local - pa.goles_visitante))) DESC, (count(pred.id) FILTER (WHERE pa.estado = 'finalizado'::text AND
        CASE
            WHEN pred.goles_local > pred.goles_visitante THEN 1
            WHEN pred.goles_local < pred.goles_visitante THEN '-1'::integer
            ELSE 0
        END =
        CASE
            WHEN pa.goles_local > pa.goles_visitante THEN 1
            WHEN pa.goles_local < pa.goles_visitante THEN '-1'::integer
            ELSE 0
        END)) DESC, (COALESCE(sum(
        CASE
            WHEN pa.estado = 'finalizado'::text AND pred.goles_local = pa.goles_local THEN 1
            ELSE 0
        END +
        CASE
            WHEN pa.estado = 'finalizado'::text AND pred.goles_visitante = pa.goles_visitante THEN 1
            ELSE 0
        END), 0::bigint)) DESC, (max(pred.actualizado_en)), p.id) AS posicion,
    count(pred.id) FILTER (WHERE pred.prediccion_unica) + p.unicas_iniciales AS unicas_acertadas,
    p.puntos_iniciales,
    bonos.total_bonos AS bonos_fase
   FROM "tblParticipantes" p
     JOIN "tblProfiles" prof ON prof.id = p.usuario_id
     JOIN "tblReglasGrupo" rg ON rg.grupo_id = p.grupo_id
     LEFT JOIN "tblPredicciones" pred ON pred.participante_id = p.id
     LEFT JOIN "tblPartidos" pa ON pa.id = pred.partido_id
     LEFT JOIN LATERAL (
       SELECT COALESCE(sum(bf.puntos), 0::bigint) AS total_bonos
       FROM "tblBonosFase" bf
       WHERE bf.participante_id = p.id
     ) bonos ON true
  WHERE es_miembro_grupo(p.grupo_id) AND p.eliminado_en IS NULL
  GROUP BY p.grupo_id, p.id, prof.nombre_completo, prof.avatar_url, p.puntos_iniciales, p.exactos_iniciales, p.unicas_iniciales, p.aciertos_iniciales, rg.criterios_desempate, bonos.total_bonos;

alter view public."vwTablaPosiciones" set (security_invoker = off);

-- ── 7. grupo_detalle: total de bonos por participante + detalle propio ──────
-- Idéntica a 0045 salvo: la `tabla` agrega `bonos_fase` (total por participante)
-- y se añade `misBonosFase` (detalle por fase del participante actual).
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
        where pr.participante_id = (select mi_id from acc)), '[]'::jsonb)
    )
  end;
$function$;

revoke execute on function public.grupo_detalle(uuid) from public, anon;
grant execute on function public.grupo_detalle(uuid) to authenticated;
