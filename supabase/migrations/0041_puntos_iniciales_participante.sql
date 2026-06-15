-- 0041_puntos_iniciales_participante.sql
--
-- Permite que un grupo empiece a usar la app cuando el torneo YA EMPEZÓ
-- conservando el ranking que ya traía de otra parte (Excel, otra app, etc.).
--
-- No se migran predicciones históricas (las de partidos pasados están cerradas
-- por RLS y los puntos solo los genera finalizar_partido()). En su lugar, el
-- admin carga un PUNTAJE ACUMULADO DE ARRANQUE por participante y la tabla de
-- posiciones lo SUMA a los puntos que se ganen dentro de la app.
--
-- Cambios:
--   1. Columna puntos_iniciales en tblParticipantes (default 0).
--   2. vwTablaPosiciones suma puntos_iniciales al total y al criterio principal
--      del desempate (puntos). Los sub-criterios deportivos NO cambian: solo
--      reflejan lo jugado dentro de la app (el arranque no trae ese desglose).
--   3. RPC actualizar_puntos_iniciales (solo admin del grupo).
--   4. grupo_detalle expone puntos_iniciales en participantes y en la tabla.

-- ── 1. Columna ──────────────────────────────────────────────────────────────
alter table public."tblParticipantes"
  add column puntos_iniciales int not null default 0;

comment on column public."tblParticipantes".puntos_iniciales is
  'Puntaje de arranque al migrar la polla a mitad de torneo. Se suma al total en vwTablaPosiciones.';

-- ── 2. Vista de posiciones (suma el arranque) ───────────────────────────────
-- Se reescribe completa (ver 0033). Único cambio funcional: + p.puntos_iniciales
-- en el total y en el criterio 1 del row_number(); se expone la columna cruda
-- para que el frontend muestre el desglose "arranque + ganados".
-- OJO: `create or replace view` NO permite insertar columnas en medio (renombra).
-- Por eso `puntos_iniciales` se expone AL FINAL del SELECT (el orden es irrelevante:
-- el código accede por nombre).
create or replace view public."vwTablaPosiciones" as
select
  p.grupo_id,
  p.id as participante_id,
  prof.nombre_completo,
  prof.avatar_url,
  coalesce(sum(pred.puntos_obtenidos), 0) + p.puntos_iniciales as puntos_totales,
  count(pred.id) filter (where pred.puntos_obtenidos > 0) as aciertos,
  count(pred.id) filter (
    where pred.goles_local = pa.goles_local
      and pred.goles_visitante = pa.goles_visitante
      and pa.estado = 'finalizado'
  ) as marcadores_exactos,
  row_number() over (
    partition by p.grupo_id
    order by
      -- 1. Puntos totales (incluye el puntaje de arranque)
      coalesce(sum(pred.puntos_obtenidos), 0) + p.puntos_iniciales desc,
      -- 2-4. Criterios configurables por la polla (exactos | unicas | aciertos)
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
      -- 5. Diferencia de gol acertada (acertó el margen aunque no el marcador)
      count(pred.id) filter (
        where pa.estado = 'finalizado'
          and (pred.goles_local - pred.goles_visitante) = (pa.goles_local - pa.goles_visitante)
      ) desc,
      -- 6. Ganador / sentido 1X2 acertado (gana local / empate / gana visitante)
      count(pred.id) filter (
        where pa.estado = 'finalizado'
          and (case when pred.goles_local > pred.goles_visitante then 1
                    when pred.goles_local < pred.goles_visitante then -1 else 0 end)
            = (case when pa.goles_local > pa.goles_visitante then 1
                    when pa.goles_local < pa.goles_visitante then -1 else 0 end)
      ) desc,
      -- 7. Goles individuales acertados (0-2 por partido: local y/o visitante)
      coalesce(sum(
        (case when pa.estado = 'finalizado' and pred.goles_local = pa.goles_local then 1 else 0 end)
        + (case when pa.estado = 'finalizado' and pred.goles_visitante = pa.goles_visitante then 1 else 0 end)
      ), 0) desc,
      -- 8. Quién dejó lista su quiniela primero (su última edición más temprana).
      --    nulls last: quien no predijo nada cae al final de su grupo de empate.
      max(pred.actualizado_en) asc nulls last,
      -- Salvaguarda técnica (NO es criterio): garantiza orden total determinístico.
      p.id asc
  ) as posicion,
  count(pred.id) filter (where pred.prediccion_unica) as unicas_acertadas,
  p.puntos_iniciales
from public."tblParticipantes" p
join public."tblProfiles" prof on prof.id = p.usuario_id
join public."tblReglasGrupo" rg on rg.grupo_id = p.grupo_id
left join public."tblPredicciones" pred on pred.participante_id = p.id
left join public."tblPartidos" pa on pa.id = pred.partido_id
where public.es_miembro_grupo(p.grupo_id)
group by p.grupo_id, p.id, prof.nombre_completo, prof.avatar_url, p.puntos_iniciales, rg.criterios_desempate;

alter view public."vwTablaPosiciones" set (security_invoker = off);

-- ── 3. RPC: editar puntaje inicial (solo admin del grupo) ───────────────────
create or replace function public.actualizar_puntos_iniciales(
  p_participante_id uuid,
  p_puntos int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id uuid;
begin
  select grupo_id into v_grupo_id
  from public."tblParticipantes"
  where id = p_participante_id;

  if v_grupo_id is null then
    raise exception 'El participante no existe';
  end if;

  -- Solo el admin del grupo puede ajustar el puntaje de arranque.
  if not public.es_admin_grupo(v_grupo_id) then
    raise exception 'Solo el administrador puede ajustar el puntaje inicial';
  end if;

  if p_puntos < 0 then
    raise exception 'El puntaje inicial no puede ser negativo';
  end if;

  update public."tblParticipantes"
    set puntos_iniciales = p_puntos
  where id = p_participante_id;
end;
$$;

revoke execute on function public.actualizar_puntos_iniciales(uuid, int) from public, anon;
grant  execute on function public.actualizar_puntos_iniciales(uuid, int) to authenticated;

-- ── 4. grupo_detalle expone puntos_iniciales ────────────────────────────────
-- Reescribe la versión de 0035 añadiendo puntos_iniciales en participantes y en
-- la tabla. El resto queda idéntico (superadmin-aware, email solo admin).
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
          'usuario', jsonb_build_object(
            'id', prof.id, 'nombre_completo', prof.nombre_completo,
            -- Email solo para admin/superadmin; el resto recibe null.
            'email', case when (select es_admin from acc) then prof.email else null end,
            'avatar_url', prof.avatar_url)))
        from public."tblParticipantes" p
        join public."tblProfiles" prof on prof.id = p.usuario_id
        where p.grupo_id = p_grupo_id), '[]'::jsonb),
      'tabla', coalesce((
        select jsonb_agg(jsonb_build_object(
          'participante_id', v.participante_id, 'posicion', v.posicion,
          'nombre_completo', v.nombre_completo, 'avatar_url', v.avatar_url,
          'puntos_totales', v.puntos_totales, 'aciertos', v.aciertos,
          'puntos_iniciales', v.puntos_iniciales,
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
        where pr.participante_id = (select mi_id from acc)), '[]'::jsonb)
    )
  end;
$$;

revoke execute on function public.grupo_detalle(uuid) from public, anon;
grant execute on function public.grupo_detalle(uuid) to authenticated;
