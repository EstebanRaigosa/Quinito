-- ── Generador de código de invitación (6 chars, sin ambiguos 0/O/1/I) ──────
create or replace function public.generar_codigo_invitacion()
returns text
language sql
volatile
set search_path = public
as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1),
    ''
  )
  from generate_series(1, 6);
$$;

-- ════════════════════════════════════════════════════════════════════════
-- crear_grupo: crea grupo + participante admin + reglas + partidos del grupo
-- en UNA transacción. SECURITY INVOKER → respeta el RLS del usuario (el creador
-- debe ser auth.uid()). Devuelve el id del grupo nuevo.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.crear_grupo(
  p_nombre text,
  p_descripcion text,
  p_reglas jsonb,
  p_partido_ids uuid[]
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_torneo_id uuid;
  v_grupo_id uuid;
  v_codigo text;
  v_intentos int := 0;
begin
  if v_uid is null then
    raise exception 'No autenticado' using errcode = '28000';
  end if;

  if coalesce(array_length(p_partido_ids, 1), 0) = 0 then
    raise exception 'Selecciona al menos un partido' using errcode = '22023';
  end if;

  select id into v_torneo_id
  from public."tblTorneos"
  where activo = true
  order by creado_en
  limit 1;
  if v_torneo_id is null then
    raise exception 'No hay torneo activo' using errcode = 'P0002';
  end if;

  loop
    v_codigo := public.generar_codigo_invitacion();
    exit when not exists (
      select 1 from public."tblGrupos" where codigo_invitacion = v_codigo
    );
    v_intentos := v_intentos + 1;
    if v_intentos > 10 then
      raise exception 'No se pudo generar un código único' using errcode = 'P0001';
    end if;
  end loop;

  insert into public."tblGrupos" (nombre, descripcion, torneo_id, codigo_invitacion, creador_id)
  values (p_nombre, nullif(p_descripcion, ''), v_torneo_id, v_codigo, v_uid)
  returning id into v_grupo_id;

  insert into public."tblParticipantes" (grupo_id, usuario_id, rol, pago_realizado)
  values (v_grupo_id, v_uid, 'admin', false);

  insert into public."tblReglasGrupo" (
    grupo_id, pts_marcador_exacto, pts_ganador, pts_gol_acertado, pts_prediccion_unica,
    bono_dieciseisavos, bono_octavos, bono_cuartos, bono_semifinales, bono_final,
    valor_apuesta, premio_primer_lugar, premio_segundo_lugar, premio_tercer_lugar,
    minutos_cierre_prediccion
  ) values (
    v_grupo_id,
    coalesce((p_reglas->>'pts_marcador_exacto')::int, 5),
    coalesce((p_reglas->>'pts_ganador')::int, 2),
    coalesce((p_reglas->>'pts_gol_acertado')::int, 1),
    coalesce((p_reglas->>'pts_prediccion_unica')::int, 2),
    coalesce((p_reglas->>'bono_dieciseisavos')::int, 10),
    coalesce((p_reglas->>'bono_octavos')::int, 8),
    coalesce((p_reglas->>'bono_cuartos')::int, 4),
    coalesce((p_reglas->>'bono_semifinales')::int, 2),
    coalesce((p_reglas->>'bono_final')::int, 5),
    coalesce((p_reglas->>'valor_apuesta')::numeric, 0),
    coalesce((p_reglas->>'premio_primer_lugar')::int, 60),
    coalesce((p_reglas->>'premio_segundo_lugar')::int, 30),
    coalesce((p_reglas->>'premio_tercer_lugar')::int, 10),
    coalesce((p_reglas->>'minutos_cierre_prediccion')::int, 5)
  );

  insert into public."tblGrupoPartidos" (grupo_id, partido_id)
  select v_grupo_id, x
  from unnest(p_partido_ids) as x
  where exists (
    select 1 from public."tblPartidos" p where p.id = x and p.torneo_id = v_torneo_id
  );

  return v_grupo_id;
end;
$$;

-- ════════════════════════════════════════════════════════════════════════
-- mis_grupos: grupos del usuario con datos enriquecidos para el dashboard.
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.mis_grupos()
returns table (
  id uuid,
  nombre text,
  descripcion text,
  codigo_invitacion text,
  creador_id uuid,
  torneo_id uuid,
  torneo_codigo text,
  torneo_nombre text,
  torneo_pais_sede text,
  torneo_fecha_inicio date,
  torneo_fecha_fin date,
  torneo_activo boolean,
  total_participantes bigint,
  mi_posicion int,
  mis_puntos bigint,
  mis_aciertos bigint,
  mis_exactos bigint,
  valor_apuesta numeric,
  lider_nombre text
)
language sql
security invoker
stable
set search_path = public
as $$
  select
    g.id, g.nombre, g.descripcion, g.codigo_invitacion, g.creador_id,
    t.id, t.codigo, t.nombre, t.pais_sede, t.fecha_inicio, t.fecha_fin, t.activo,
    (select count(*) from public."tblParticipantes" pp where pp.grupo_id = g.id),
    pos.posicion::int,
    coalesce(pos.puntos_totales, 0)::bigint,
    coalesce(pos.aciertos, 0)::bigint,
    coalesce(pos.marcadores_exactos, 0)::bigint,
    r.valor_apuesta,
    lider.nombre_completo
  from public."tblParticipantes" p
  join public."tblGrupos" g on g.id = p.grupo_id
  join public."tblTorneos" t on t.id = g.torneo_id
  left join public."tblReglasGrupo" r on r.grupo_id = g.id
  left join lateral (
    select v.posicion, v.puntos_totales, v.aciertos, v.marcadores_exactos
    from public."vwTablaPosiciones" v
    where v.grupo_id = g.id and v.participante_id = p.id
  ) pos on true
  left join lateral (
    select v.nombre_completo
    from public."vwTablaPosiciones" v
    where v.grupo_id = g.id and v.posicion = 1
    limit 1
  ) lider on true
  where p.usuario_id = auth.uid()
  order by g.creado_en desc;
$$;

revoke execute on function public.crear_grupo(text, text, jsonb, uuid[]) from public, anon;
revoke execute on function public.mis_grupos() from public, anon;
revoke execute on function public.generar_codigo_invitacion() from public, anon;
grant execute on function public.crear_grupo(text, text, jsonb, uuid[]) to authenticated;
grant execute on function public.mis_grupos() to authenticated;
