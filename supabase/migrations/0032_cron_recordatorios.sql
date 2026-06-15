-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Cron: disparar la Edge Function `enviar-recordatorios` cada 15 min        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- ⚠️ REQUISITO PREVIO — guardar 2 secretos en Vault ANTES de que el cron sirva
--    (si no, las corridas fallan con error de auth, sin romper nada más):
--
--    select vault.create_secret(
--      'https://jovwkbqwbrephzvjhwiq.supabase.co', 'project_url',
--      'URL base del proyecto');
--    select vault.create_secret(
--      '<SERVICE_ROLE_KEY>', 'service_role_key',
--      'Service role para invocar Edge Functions desde el cron');
--
--    Y configurar los secretos de la Edge Function (VAPID) en el dashboard o CLI:
--      supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... \
--                           VAPID_SUBJECT=mailto:tu-correo@ejemplo.com
--    (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya las inyecta Supabase.)
--
-- La antelación "~1h antes" la fija la ventana de `recordatorios_pendientes`
-- (cierre dentro de los próximos 60 min). Corriendo cada 15 min, el aviso llega
-- entre ~45 y 60 min antes del cierre. La tabla `tblPushRecordatorios` evita
-- reenvíos.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Idempotente: si ya existe un job con este nombre, lo reprograma.
select cron.schedule(
  'enviar-recordatorios-push',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'project_url'
    ) || '/functions/v1/enviar-recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'service_role_key'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
