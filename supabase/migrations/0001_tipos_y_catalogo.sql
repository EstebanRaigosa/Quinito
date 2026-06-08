-- ── Tipos custom (enums) ──────────────────────────────────────────────────
create type fase_torneo as enum (
  'fase_grupos',
  'dieciseisavos',
  'octavos',
  'cuartos',
  'semifinales',
  'tercer_lugar',
  'final'
);

create type rol_participante as enum ('admin', 'jugador');

-- ── Catálogo: torneos ─────────────────────────────────────────────────────
create table public."tblTorneos" (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nombre text not null,
  descripcion text,
  fecha_inicio date not null,
  fecha_fin date not null,
  pais_sede text,
  activo boolean default true not null,
  creado_en timestamptz default now() not null
);

-- ── Catálogo: equipos ─────────────────────────────────────────────────────
create table public."tblEquipos" (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public."tblTorneos"(id) on delete cascade,
  nombre text not null,
  codigo_iso text,
  bandera_url text,
  grupo text,
  creado_en timestamptz default now() not null,
  unique (torneo_id, nombre)
);

-- ── Catálogo: partidos ────────────────────────────────────────────────────
create table public."tblPartidos" (
  id uuid primary key default gen_random_uuid(),
  torneo_id uuid not null references public."tblTorneos"(id) on delete cascade,
  numero_partido int not null,
  fase fase_torneo not null,
  grupo text,
  equipo_local_id uuid references public."tblEquipos"(id),
  equipo_visitante_id uuid references public."tblEquipos"(id),
  placeholder_local text,
  placeholder_visitante text,
  fecha_hora timestamptz not null,
  estadio text,
  ciudad text,
  goles_local int,
  goles_visitante int,
  estado text default 'programado' not null
    check (estado in ('programado','en_vivo','finalizado','cancelado')),
  creado_en timestamptz default now() not null,
  unique (torneo_id, numero_partido)
);

create index "idxPartidosTorneoFecha" on public."tblPartidos" (torneo_id, fecha_hora);
create index "idxPartidosTorneoFase"  on public."tblPartidos" (torneo_id, fase);
