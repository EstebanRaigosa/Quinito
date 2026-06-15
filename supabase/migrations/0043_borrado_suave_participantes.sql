-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Borrado suave (papelera) de participantes                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Antes, eliminar a un participante hacía `delete` + cascade de sus
-- predicciones: irreversible y peligroso (un clic borra todo su historial).
--
-- Ahora se marca `eliminado_en = now()` (borrado suave):
--   • Conserva su fila, predicciones y puntos → es REVERSIBLE.
--   • El usuario deja de ser miembro: `es_miembro_grupo` lo excluye, así que la
--     RLS le corta el acceso y la polla desaparece de su lista.
--   • No aparece en la tabla de posiciones ni en los agregados del grupo.
--   • Si vuelve a unirse con el código, se REACTIVA (`eliminado_en = null`) y
--     recupera su historial (RPC `unirse_grupo`).
--   • Un baneado no puede reactivarse (sigue bloqueado).

alter table public."tblParticipantes"
  add column if not exists eliminado_en timestamptz;

-- Acelera los filtros "solo activos" más frecuentes.
create index if not exists "idxParticipantesActivos"
  on public."tblParticipantes" (grupo_id) where eliminado_en is null;

-- ── Membresía: un eliminado deja de ser miembro (corta acceso vía RLS) ───────
create or replace function public.es_miembro_grupo(p_grupo_id uuid)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select public.es_superadmin() or exists (
    select 1 from public."tblParticipantes"
    where grupo_id = p_grupo_id and usuario_id = auth.uid()
      and eliminado_en is null
  );
$function$;

-- ── Tabla de posiciones: excluye eliminados (recalcula posición sin ellos) ───
create or replace view public."vwTablaPosiciones" as
 SELECT p.grupo_id,
    p.id AS participante_id,
    prof.nombre_completo,
    prof.avatar_url,
    COALESCE(sum(pred.puntos_obtenidos), 0::bigint) + p.puntos_iniciales AS puntos_totales,
    count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0) AS aciertos,
    count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text) AS marcadores_exactos,
    row_number() OVER (PARTITION BY p.grupo_id ORDER BY (COALESCE(sum(pred.puntos_obtenidos), 0::bigint) + p.puntos_iniciales) DESC, (
        CASE rg.criterios_desempate[1]
            WHEN 'exactos'::text THEN count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text)
            WHEN 'unicas'::text THEN count(pred.id) FILTER (WHERE pred.prediccion_unica)
            WHEN 'aciertos'::text THEN count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0)
            ELSE 0::bigint
        END) DESC, (
        CASE rg.criterios_desempate[2]
            WHEN 'exactos'::text THEN count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text)
            WHEN 'unicas'::text THEN count(pred.id) FILTER (WHERE pred.prediccion_unica)
            WHEN 'aciertos'::text THEN count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0)
            ELSE 0::bigint
        END) DESC, (
        CASE rg.criterios_desempate[3]
            WHEN 'exactos'::text THEN count(pred.id) FILTER (WHERE pred.goles_local = pa.goles_local AND pred.goles_visitante = pa.goles_visitante AND pa.estado = 'finalizado'::text)
            WHEN 'unicas'::text THEN count(pred.id) FILTER (WHERE pred.prediccion_unica)
            WHEN 'aciertos'::text THEN count(pred.id) FILTER (WHERE pred.puntos_obtenidos > 0)
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
    count(pred.id) FILTER (WHERE pred.prediccion_unica) AS unicas_acertadas,
    p.puntos_iniciales
   FROM "tblParticipantes" p
     JOIN "tblProfiles" prof ON prof.id = p.usuario_id
     JOIN "tblReglasGrupo" rg ON rg.grupo_id = p.grupo_id
     LEFT JOIN "tblPredicciones" pred ON pred.participante_id = p.id
     LEFT JOIN "tblPartidos" pa ON pa.id = pred.partido_id
  WHERE es_miembro_grupo(p.grupo_id) AND p.eliminado_en IS NULL
  GROUP BY p.grupo_id, p.id, prof.nombre_completo, prof.avatar_url, p.puntos_iniciales, rg.criterios_desempate;

-- ── Agregados/estadísticas por grupo: excluyen eliminados ───────────────────
create or replace view public."vwEstadisticasPartidoGanadorGrupo" as
 SELECT p.grupo_id,
    pred.partido_id,
    count(*) AS total_predicciones,
    count(*) FILTER (WHERE pred.goles_local > pred.goles_visitante) AS predicciones_local,
    count(*) FILTER (WHERE pred.goles_local < pred.goles_visitante) AS predicciones_visitante,
    count(*) FILTER (WHERE pred.goles_local = pred.goles_visitante) AS predicciones_empate,
    round(100.0 * count(*) FILTER (WHERE pred.goles_local > pred.goles_visitante)::numeric / NULLIF(count(*), 0)::numeric, 2) AS pct_local,
    round(100.0 * count(*) FILTER (WHERE pred.goles_local < pred.goles_visitante)::numeric / NULLIF(count(*), 0)::numeric, 2) AS pct_visitante,
    round(100.0 * count(*) FILTER (WHERE pred.goles_local = pred.goles_visitante)::numeric / NULLIF(count(*), 0)::numeric, 2) AS pct_empate
   FROM "tblPredicciones" pred
     JOIN "tblParticipantes" p ON p.id = pred.participante_id
  WHERE es_miembro_grupo(p.grupo_id) AND p.eliminado_en IS NULL
  GROUP BY p.grupo_id, pred.partido_id;

create or replace view public."vwEstadisticasPartidoMarcadoresGrupo" as
 SELECT p.grupo_id,
    pred.partido_id,
    pred.goles_local,
    pred.goles_visitante,
    count(*) AS cantidad,
    round(100.0 * count(*)::numeric / sum(count(*)) OVER (PARTITION BY p.grupo_id, pred.partido_id), 2) AS porcentaje
   FROM "tblPredicciones" pred
     JOIN "tblParticipantes" p ON p.id = pred.participante_id
  WHERE es_miembro_grupo(p.grupo_id) AND p.eliminado_en IS NULL
  GROUP BY p.grupo_id, pred.partido_id, pred.goles_local, pred.goles_visitante;

create or replace view public."vwPrediccionesGrupoPartido" as
 SELECT p.grupo_id,
    pred.partido_id,
    p.id AS participante_id,
    prof.id AS usuario_id,
    prof.nombre_completo,
    prof.avatar_url,
    pred.goles_local,
    pred.goles_visitante,
    pred.puntos_obtenidos,
    pred.prediccion_unica
   FROM "tblPredicciones" pred
     JOIN "tblParticipantes" p ON p.id = pred.participante_id
     JOIN "tblProfiles" prof ON prof.id = p.usuario_id
  WHERE es_miembro_grupo(p.grupo_id) AND p.eliminado_en IS NULL
    AND partido_cerrado(pred.partido_id, p.grupo_id);

-- ── mis_grupos: el eliminado ya no ve la polla; conteos excluyen eliminados ──
create or replace function public.mis_grupos()
 returns table(id uuid, nombre text, descripcion text, codigo_invitacion text, creador_id uuid, torneo_id uuid, torneo_codigo text, torneo_nombre text, torneo_pais_sede text, torneo_fecha_inicio date, torneo_fecha_fin date, torneo_activo boolean, total_participantes bigint, mi_posicion integer, mis_puntos bigint, mis_aciertos bigint, mis_exactos bigint, valor_apuesta numeric, lider_nombre text)
 language sql
 stable
 set search_path to 'public'
as $function$
  select
    g.id, g.nombre, g.descripcion, g.codigo_invitacion, g.creador_id,
    t.id, t.codigo, t.nombre, t.pais_sede, t.fecha_inicio, t.fecha_fin, t.activo,
    (select count(*) from public."tblParticipantes" pp where pp.grupo_id = g.id and pp.eliminado_en is null),
    pos.mi_posicion,
    coalesce(pos.mis_puntos, 0)::bigint,
    coalesce(pos.mis_aciertos, 0)::bigint,
    coalesce(pos.mis_exactos, 0)::bigint,
    r.valor_apuesta,
    pos.lider_nombre
  from public."tblParticipantes" p
  join public."tblGrupos" g on g.id = p.grupo_id
  join public."tblTorneos" t on t.id = g.torneo_id
  left join public."tblReglasGrupo" r on r.grupo_id = g.id
  left join lateral (
    select
      max(v.posicion) filter (where v.participante_id = p.id)::int          as mi_posicion,
      max(v.puntos_totales) filter (where v.participante_id = p.id)         as mis_puntos,
      max(v.aciertos) filter (where v.participante_id = p.id)               as mis_aciertos,
      max(v.marcadores_exactos) filter (where v.participante_id = p.id)     as mis_exactos,
      (array_agg(v.nombre_completo order by v.posicion asc))[1]             as lider_nombre
    from public."vwTablaPosiciones" v
    where v.grupo_id = g.id
  ) pos on true
  where p.usuario_id = auth.uid() and p.eliminado_en is null
  order by g.creado_en desc;
$function$;

-- ── grupo_detalle: el eliminado no puede verlo; el panel excluye eliminados ──
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
$function$;

-- ── buscar_grupo: conteo + ya_es_miembro consideran solo activos ────────────
create or replace function public.buscar_grupo(p_codigo text)
 returns table(id uuid, nombre text, descripcion text, total_participantes bigint, valor_apuesta numeric, ya_es_miembro boolean)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select
    g.id,
    g.nombre,
    g.descripcion,
    (select count(*) from public."tblParticipantes" pp where pp.grupo_id = g.id and pp.eliminado_en is null),
    coalesce(r.valor_apuesta, 0),
    exists (
      select 1 from public."tblParticipantes" pm
      where pm.grupo_id = g.id and pm.usuario_id = auth.uid()
        and pm.eliminado_en is null
    )
  from public."tblGrupos" g
  left join public."tblReglasGrupo" r on r.grupo_id = g.id
  where upper(g.codigo_invitacion) = upper(btrim(p_codigo))
    and not exists (
      select 1 from public."tblParticipantesBaneados" b
      where b.grupo_id = g.id and b.usuario_id = auth.uid()
    )
  limit 1;
$function$;

-- ── gestionar_participante: ahora hace BORRADO SUAVE (no delete + cascade) ───
create or replace function public.gestionar_participante(
  p_participante_id uuid,
  p_banear boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_grupo_id   uuid;
  v_usuario_id uuid;
  v_rol        rol_participante;
begin
  select grupo_id, usuario_id, rol
    into v_grupo_id, v_usuario_id, v_rol
  from public."tblParticipantes"
  where id = p_participante_id and eliminado_en is null;

  if v_grupo_id is null then
    raise exception 'El participante no existe';
  end if;

  if not public.es_admin_grupo(v_grupo_id) then
    raise exception 'Solo el administrador puede gestionar participantes';
  end if;

  if v_usuario_id = auth.uid() then
    raise exception 'No puedes eliminarte a ti mismo';
  end if;
  if v_rol = 'admin' then
    raise exception 'No puedes eliminar a otro administrador';
  end if;

  if p_banear then
    insert into public."tblParticipantesBaneados" (grupo_id, usuario_id, baneado_por)
    values (v_grupo_id, v_usuario_id, auth.uid())
    on conflict (grupo_id, usuario_id) do nothing;
  end if;

  -- Borrado suave: conserva sus predicciones y puntos (reversible).
  update public."tblParticipantes"
    set eliminado_en = now()
    where id = p_participante_id;
end;
$function$;

-- ── unirse_grupo: reactiva (papelera) o inserta; respeta el baneo ───────────
create or replace function public.unirse_grupo(p_grupo_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_uid    uuid := auth.uid();
  v_existe uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '42501';
  end if;

  if exists (
    select 1 from public."tblParticipantesBaneados" b
    where b.grupo_id = p_grupo_id and b.usuario_id = v_uid
  ) then
    raise exception 'Estás baneado de este grupo' using errcode = '42501';
  end if;

  select id into v_existe
  from public."tblParticipantes"
  where grupo_id = p_grupo_id and usuario_id = v_uid;

  if v_existe is not null then
    -- Reactiva: recupera su historial (predicciones y puntos) de antes.
    update public."tblParticipantes"
      set eliminado_en = null
      where id = v_existe;
  else
    insert into public."tblParticipantes" (grupo_id, usuario_id, rol)
    values (p_grupo_id, v_uid, 'jugador');
  end if;
end;
$function$;

revoke execute on function public.unirse_grupo(uuid) from public, anon;
grant  execute on function public.unirse_grupo(uuid) to authenticated;
