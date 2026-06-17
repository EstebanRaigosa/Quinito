-- 0061_prediccion_avance_empate.sql
--
-- Permite que el usuario, al PREDECIR un empate en un partido eliminatorio,
-- marque qué equipo cree que avanza a la siguiente ronda (el equivalente, del
-- lado de la predicción, a la tanda de penales del resultado real — ver 0055).
--
-- Hasta ahora el "equipo que avanza" predicho se derivaba SOLO del marcador
-- (más goles); un empate predicho quedaba indeterminado y no podía ganar el
-- bono de fase (ver 0054 §11-14). Con esta migración:
--   * Se agrega tblPredicciones.equipo_avanza_id (nullable). Solo tiene sentido
--     en fases eliminatorias cuando el marcador predicho es empate.
--   * recalcular_bonos_fase_grupo usa equipo_avanza_id como avance predicho
--     cuando el marcador predicho está igualado (antes: indeterminado).
--
-- La OBLIGATORIEDAD de elegir avance al predecir empate en eliminatorias se
-- impone en la UI (FormularioPrediccion). La BD solo valida CONSISTENCIA: si se
-- envía equipo_avanza_id, debe ser uno de los dos equipos del partido.

-- ── 1. Columna de avance predicho ───────────────────────────────────────────
alter table public."tblPredicciones"
  add column equipo_avanza_id uuid references public."tblEquipos"(id);

comment on column public."tblPredicciones".equipo_avanza_id is
  'Equipo que el usuario predice que avanza cuando su marcador predicho es empate (solo fases eliminatorias). Null en cualquier otro caso. Alimenta el bono de fase, igual que la tanda de penales decide el avance real.';

-- ── 2. Grants a nivel columna: el usuario también escribe el avance ─────────
-- (extiende los grants de 0005, que solo permitían el marcador).
grant insert (equipo_avanza_id) on public."tblPredicciones" to authenticated;
grant update (equipo_avanza_id) on public."tblPredicciones" to authenticated;

-- ── 3. Trigger de consistencia: el avance debe ser uno de los dos equipos ───
create or replace function public.validar_prediccion_avanza()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_local uuid;
  v_visitante uuid;
begin
  if new.equipo_avanza_id is null then
    return new;
  end if;

  select equipo_local_id, equipo_visitante_id
    into v_local, v_visitante
  from public."tblPartidos"
  where id = new.partido_id;

  if new.equipo_avanza_id is distinct from v_local
     and new.equipo_avanza_id is distinct from v_visitante then
    raise exception
      'equipo_avanza_id % no participa en el partido %', new.equipo_avanza_id, new.partido_id;
  end if;

  return new;
end;
$function$;

create trigger "trgPrediccionesAvanzaValido"
  before insert or update on public."tblPredicciones"
  for each row execute function public.validar_prediccion_avanza();

-- Función interna del trigger: no debe ser invocable por RPC (anon/authenticated).
-- El trigger la ejecuta igual aunque no haya EXECUTE para esos roles.
revoke all on function public.validar_prediccion_avanza() from public, anon, authenticated;

-- ── 4. recalcular_bonos_fase_grupo: el avance PREDICHO usa equipo_avanza_id ──
-- Igual que en 0055 (avance real desempata por penales) salvo el CASE del avance
-- predicho: cuando el marcador del usuario está igualado, se usa equipo_avanza_id
-- (antes quedaba null = indeterminado).
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
          -- Avance predicho: por el marcador del usuario y, si lo igualó, por el
          -- equipo que marcó como "pasa" (equipo_avanza_id).
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

-- ── 5. grupo_detalle: exponer equipo_avanza_id en misPredicciones ───────────
-- Idéntica a 0054 salvo el campo 'equipo_avanza_id' agregado a misPredicciones,
-- para que el formulario muestre la selección guardada.
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
          'puntos_obtenidos', pr.puntos_obtenidos, 'prediccion_unica', pr.prediccion_unica,
          'equipo_avanza_id', pr.equipo_avanza_id))
        from public."tblPredicciones" pr
        where pr.participante_id = (select mi_id from acc)), '[]'::jsonb)
    )
  end;
$function$;

revoke execute on function public.grupo_detalle(uuid) from public, anon;
grant execute on function public.grupo_detalle(uuid) to authenticated;
