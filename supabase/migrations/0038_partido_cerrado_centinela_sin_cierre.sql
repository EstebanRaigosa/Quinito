-- 0038_partido_cerrado_centinela_sin_cierre.sql
--
-- Fecha centinela "sin cierre": un partido con `fecha_hora` anterior a 1901
-- (en la práctica 1900-01-01 00:00) NUNCA se cierra para predicciones. Permite
-- dejar partidos de prueba abiertos de forma indefinida. La misma regla vive en
-- el cliente (`esSinCierre`/`prediccionCerrada` en lib/utils/prediccion.ts).
-- Como `partido_cerrado` es la puerta del RLS de tblPredicciones, sin esta
-- excepción aquí el RLS bloquearía guardar predicciones en esos partidos.
create or replace function public.partido_cerrado(p_partido_id uuid, p_grupo_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    case
      -- Centinela 1900: nunca se cierra.
      when pa.fecha_hora < timestamptz '1901-01-01 00:00:00+00' then false
      else
        pa.estado <> 'programado'
        or now() >= (pa.fecha_hora - make_interval(mins => r.minutos_cierre_prediccion))
    end,
    false
  )
  from public."tblPartidos" pa
  join public."tblReglasGrupo" r on r.grupo_id = p_grupo_id
  where pa.id = p_partido_id;
$$;
