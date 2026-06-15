-- Habilita Supabase Realtime para los partidos: las vistas suscritas reciben los
-- cambios (marcador y estado) en vivo y refrescan sin que el usuario recargue.
--
-- La lectura de "tblPartidos" ya es pública para autenticados (RLS), y Realtime
-- respeta RLS en `postgres_changes`, así que estos cambios pueden emitirse sin
-- exponer nada privado (solo marcador/estado de los partidos del torneo).
--
-- Idempotente: solo agrega la tabla a la publicación si aún no está, para poder
-- correr la migración sobre una base donde ya estuviera incluida.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tblPartidos'
  ) then
    alter publication supabase_realtime add table public."tblPartidos";
  end if;
end $$;
