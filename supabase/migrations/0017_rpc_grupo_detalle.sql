-- ════════════════════════════════════════════════════════════════════════
-- RPC `grupo_detalle`: todo el detalle de una polla en UNA sola llamada.
--
-- Antes `getGrupoDetalle` hacía ~4 olas de latencia de red: validar membresía,
-- luego 6 queries en paralelo (grupo, reglas, participantes, tabla, partidos del
-- grupo, mis predicciones) y por último los partidos. El cómputo en la base es
-- trivial; el costo era la latencia acumulada. Este RPC lo colapsa en una.
--
-- Seguridad/privacidad (CLAUDE.md §3.4): `security invoker`. Devuelve `null` si
-- quien llama no es miembro del grupo (puerta de membresía). `misPredicciones`
-- se filtra al participante del propio usuario; el RLS de `tblPredicciones` es la
-- segunda barrera.
-- ════════════════════════════════════════════════════════════════════════

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
  )
  select case
    when not exists (select 1 from mi) then null::jsonb
    else jsonb_build_object(
      'miParticipanteId', (select id from mi),
      'esAdmin', (select rol = 'admin' from mi),
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
          'usuario', jsonb_build_object(
            'id', prof.id, 'nombre_completo', prof.nombre_completo,
            'email', prof.email, 'avatar_url', prof.avatar_url)))
        from public."tblParticipantes" p
        join public."tblProfiles" prof on prof.id = p.usuario_id
        where p.grupo_id = p_grupo_id), '[]'::jsonb),
      'tabla', coalesce((
        select jsonb_agg(jsonb_build_object(
          'participante_id', v.participante_id, 'posicion', v.posicion,
          'nombre_completo', v.nombre_completo, 'avatar_url', v.avatar_url,
          'puntos_totales', v.puntos_totales, 'aciertos', v.aciertos,
          'marcadores_exactos', v.marcadores_exactos) order by v.posicion asc)
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
        where pr.participante_id = (select id from mi)), '[]'::jsonb)
    )
  end;
$$;

revoke execute on function public.grupo_detalle(uuid) from public, anon;
grant execute on function public.grupo_detalle(uuid) to authenticated;
