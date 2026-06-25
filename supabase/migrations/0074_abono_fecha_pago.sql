-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Fecha de pago configurable en el registro de abonos                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Hasta ahora `registrar_abono` fijaba `creado_en` con el default de la tabla
-- (`now()`): el abono SIEMPRE quedaba con la fecha/hora del registro. El admin a
-- veces registra pagos que ocurrieron antes (efectivo recibido días atrás), así
-- que el formulario ahora ofrece una "fecha de pago" (por defecto hoy). Se suma el
-- parámetro `p_fecha`:
--   • NULL  → se usa `now()` (caso por defecto: el pago es de hoy, hora real).
--   • valor → se usa esa fecha como `creado_en` (el cliente manda mediodía Bogotá
--             para fechas pasadas, evitando bordes de día por zona horaria).
-- Guard: no se permite fecha futura (la UI ya la acota con `max=hoy`, pero la
-- validación dura vive aquí).
--
-- `creado_en` se reutiliza como "fecha del pago": toda la app ya lo muestra así
-- (historial en GestionPago y el comprobante PNG). No se agrega columna nueva.
--
-- Cambiar la firma (sumar un parámetro) obliga a DROP previo de la versión
-- (uuid, numeric, text) de 0072 antes de recrearla. El resto del cuerpo es idéntico
-- a 0072 salvo el `creado_en` del insert y el guard de fecha futura.

drop function if exists public.registrar_abono(uuid, numeric, text);
create or replace function public.registrar_abono(
  p_participante_id uuid,
  p_monto numeric,
  p_nota text,
  p_fecha timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grupo_id uuid;
  v_valor_apuesta numeric;
  v_total numeric;
  v_abono_id uuid;
  v_codigo text;
begin
  -- Resolver grupo y valor de la apuesta del participante.
  select pa.grupo_id, coalesce(r.valor_apuesta, 0)
    into v_grupo_id, v_valor_apuesta
  from public."tblParticipantes" pa
  left join public."tblReglasGrupo" r on r.grupo_id = pa.grupo_id
  where pa.id = p_participante_id;

  if v_grupo_id is null then
    raise exception 'El participante no existe';
  end if;

  if not public.es_admin_grupo(v_grupo_id) then
    raise exception 'Solo el administrador puede registrar pagos' using errcode = '42501';
  end if;

  if v_valor_apuesta <= 0 then
    raise exception 'Esta polla no tiene costo' using errcode = '22023';
  end if;

  if p_monto is null or p_monto <= 0 then
    raise exception 'El monto debe ser mayor a cero' using errcode = '22023';
  end if;

  -- La fecha del pago no puede ser futura (la UI la acota, esto la blinda).
  if p_fecha is not null and p_fecha > now() then
    raise exception 'La fecha del pago no puede ser futura' using errcode = '22023';
  end if;

  -- Lock de la fila del participante: serializa abonos simultáneos para que el
  -- tope (suma agregada) no se pueda burlar por una condición de carrera.
  perform 1 from public."tblParticipantes" where id = p_participante_id for update;

  select coalesce(sum(monto), 0) into v_total
  from public."tblAbonos" where participante_id = p_participante_id;

  if v_total + p_monto > v_valor_apuesta then
    raise exception 'El abono excede el saldo pendiente' using errcode = '22023';
  end if;

  -- `coalesce(p_fecha, now())`: sin fecha explícita, hora real del registro.
  insert into public."tblAbonos" (participante_id, grupo_id, monto, nota, registrado_por, creado_en)
  values (p_participante_id, v_grupo_id, p_monto, nullif(btrim(p_nota), ''), auth.uid(), coalesce(p_fecha, now()))
  returning id into v_abono_id;

  -- Comprobante 1-1 del abono recién creado.
  insert into public."tblComprobantes" (codigo, abono_id, participante_id, grupo_id, monto)
  values (public.gen_codigo_comprobante(), v_abono_id, p_participante_id, v_grupo_id, p_monto)
  returning codigo into v_codigo;

  -- Re-sincronizar el boolean que leen grupo_detalle / mis_grupos.
  update public."tblParticipantes"
     set pago_realizado = (v_total + p_monto >= v_valor_apuesta)
   where id = p_participante_id;

  return v_codigo;
end;
$$;

revoke execute on function public.registrar_abono(uuid, numeric, text, timestamptz) from public, anon;
grant execute on function public.registrar_abono(uuid, numeric, text, timestamptz) to authenticated;
