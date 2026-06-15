-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Recordatorios push de cierre de predicción                               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Avisar a un usuario ~1h antes de que cierre la ventana de predicción de un
-- partido que AÚN NO ha predicho en alguna de sus pollas.
--
-- El "cierre" de un partido depende del grupo: `fecha_hora - minutos_cierre`
-- (mismo cálculo que `partido_cerrado`). Un usuario puede tener el mismo partido
-- en varias pollas con cierres distintos; le avisamos UNA sola vez por partido,
-- tomando el cierre más próximo entre las pollas donde le falta predecir.
--
-- PRIVACIDAD (CLAUDE.md §3.4): nada de esto expone predicciones de nadie. El
-- mensaje solo nombra el partido (equipos), nunca marcadores.

-- ── Control de idempotencia: qué recordatorio ya se envió ───────────────────
-- El cron corre cada pocos minutos; esta tabla evita reenviar el mismo aviso.
create table public."tblPushRecordatorios" (
  usuario_id uuid not null references public."tblProfiles"(id) on delete cascade,
  partido_id uuid not null references public."tblPartidos"(id) on delete cascade,
  enviado_en timestamptz not null default now(),
  primary key (usuario_id, partido_id)
);

alter table public."tblPushRecordatorios" enable row level security;
-- Sin policies: solo la service_role (Edge Function) escribe/lee aquí; RLS
-- activa por defecto bloquea a anon/authenticated (defensa en profundidad).

-- ── Función: usuarios a notificar AHORA ─────────────────────────────────────
-- Devuelve, por usuario y partido, los datos mínimos para armar el push. Solo
-- la llama la Edge Function con service_role (que ignora RLS). SECURITY DEFINER
-- para leer predicciones/participantes de todos sin chocar con sus políticas.
create or replace function public.recordatorios_pendientes()
returns table (
  usuario_id       uuid,
  partido_id       uuid,
  equipo_local     text,
  equipo_visitante text,
  cierre           timestamptz
)
language sql
security definer
set search_path = public
as $$
  select distinct on (pt.usuario_id, p.id)
    pt.usuario_id,
    p.id as partido_id,
    el.nombre as equipo_local,
    ev.nombre as equipo_visitante,
    (p.fecha_hora - make_interval(mins => r.minutos_cierre_prediccion)) as cierre
  from public."tblParticipantes" pt
  join public."tblGrupoPartidos" gp on gp.grupo_id = pt.grupo_id
  join public."tblPartidos" p       on p.id = gp.partido_id
  join public."tblReglasGrupo" r    on r.grupo_id = pt.grupo_id
  join public."tblEquipos" el       on el.id = p.equipo_local_id
  join public."tblEquipos" ev       on ev.id = p.equipo_visitante_id
  where p.estado = 'programado'
    -- Equipos definidos (no placeholders de eliminatorias).
    and p.equipo_local_id is not null
    and p.equipo_visitante_id is not null
    -- Ventana: cierra dentro de la próxima hora y todavía no cierra.
    and (p.fecha_hora - make_interval(mins => r.minutos_cierre_prediccion)) > now()
    and (p.fecha_hora - make_interval(mins => r.minutos_cierre_prediccion))
          <= now() + interval '60 minutes'
    -- El participante NO predijo este partido en esta polla.
    and not exists (
      select 1 from public."tblPredicciones" pr
      where pr.participante_id = pt.id and pr.partido_id = p.id
    )
    -- No se le ha enviado ya el recordatorio de este partido.
    and not exists (
      select 1 from public."tblPushRecordatorios" rec
      where rec.usuario_id = pt.usuario_id and rec.partido_id = p.id
    )
  -- Por usuario+partido nos quedamos con el cierre más próximo.
  order by pt.usuario_id, p.id, cierre asc;
$$;

-- Solo invocable por la service_role (la Edge Function). Nadie más.
revoke execute on function public.recordatorios_pendientes()
  from public, anon, authenticated;
