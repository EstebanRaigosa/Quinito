-- Operación inversa de finalizar_partido: limpia el resultado de un partido
-- y revierte los puntos de todas las predicciones que lo apostaban.
-- SECURITY DEFINER: se ejecuta con privilegios elevados; la autorización
-- (super-admin de plataforma) se valida en el server action que la invoca.
create or replace function public.revertir_partido(p_partido_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_existe boolean;
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
   returning true into v_existe;

  if v_existe is null then
    raise exception 'Partido % no existe', p_partido_id;
  end if;
end;
$function$;

revoke all on function public.revertir_partido(uuid) from anon, authenticated;
