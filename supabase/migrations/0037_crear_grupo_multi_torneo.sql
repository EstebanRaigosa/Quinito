-- 0037_crear_grupo_multi_torneo.sql
--
-- Soporte multi-torneo en la creación de grupos. Antes el wizard no tenía
-- selector y `crear_grupo` tomaba siempre el torneo activo más antiguo. Ahora
-- el wizard envía el torneo elegido y el RPC recibe `p_torneo_id`, validando
-- que exista y esté activo. Además se activa "Mundial 2" para que aparezca en
-- el selector junto a "Mundial 2026".

-- Activar Mundial 2 para que sea seleccionable al crear un grupo.
update public."tblTorneos" set activo = true where codigo = 'mundial-2';

-- Reemplazar la firma anterior (4 args) por la nueva con p_torneo_id.
drop function if exists public.crear_grupo(text, text, jsonb, uuid[]);

create or replace function public.crear_grupo(
  p_nombre text,
  p_descripcion text,
  p_reglas jsonb,
  p_partido_ids uuid[],
  p_torneo_id uuid
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

  -- El torneo debe existir y estar activo (no se confía en el id del cliente).
  select id into v_torneo_id
  from public."tblTorneos"
  where id = p_torneo_id and activo = true;
  if v_torneo_id is null then
    raise exception 'Torneo no válido o inactivo' using errcode = 'P0002';
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
    minutos_cierre_prediccion, criterios_desempate
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
    coalesce((p_reglas->>'minutos_cierre_prediccion')::int, 5),
    coalesce(
      case when jsonb_typeof(p_reglas->'criterios_desempate') = 'array'
        then (select array_agg(v) from jsonb_array_elements_text(p_reglas->'criterios_desempate') as t(v))
        else null end,
      array['exactos', 'unicas', 'aciertos']
    )
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

revoke execute on function public.crear_grupo(text, text, jsonb, uuid[], uuid) from public, anon;
grant execute on function public.crear_grupo(text, text, jsonb, uuid[], uuid) to authenticated;
