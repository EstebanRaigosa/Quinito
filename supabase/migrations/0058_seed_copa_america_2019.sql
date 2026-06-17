-- ============================================================================
-- Seed: Copa América 2019 (Brasil) — TORNEO DE PRUEBA (activo=false)
--
-- Solo visible para el superadmin (ver 0057 torneos_disponibles). Sirve para
-- probar el motor de cruces y, sobre todo, la funcionalidad de MEJORES TERCEROS
-- en un formato distinto al Mundial: 3 grupos (A,B,C) de 4 equipos; clasifican a
-- cuartos los 2 primeros de cada grupo + los 2 MEJORES TERCEROS (8 equipos).
--
-- Horas convertidas de la hora local de Brasil (BRT, UTC-3) a UTC sumando 3h.
-- Partidos sin marcador (estado 'programado'): el bracket se resuelve solo
-- cuando el superadmin cargue los resultados.
--
-- Cuadro de cuartos (regla CONMEBOL):
--   QF1 (partido 19): 1°A vs 3° de B/C   -> placeholder '3BC'
--   QF2 (partido 20): 2°B vs 2°A         (fijo)
--   QF3 (partido 21): 1°B vs 2°C         (fijo)
--   QF4 (partido 22): 1°C vs 3° de A/B   -> placeholder '3AB'
-- Asignación de terceros por combinación (forzada por los placeholders B/C y
-- A/B): se siembra en tblAsignacionTercerosSlot al final.
-- ============================================================================

-- 1) Torneo (activo=false => oculto para usuarios normales).
insert into public."tblTorneos" (codigo, nombre, descripcion, fecha_inicio, fecha_fin, pais_sede, activo)
values (
  'copa-america-2019',
  'Copa América 2019',
  'Torneo de prueba (solo superadmin): 3 grupos y mejores terceros.',
  '2019-06-14', '2019-07-07', 'Brasil', false
)
on conflict (codigo) do nothing;

-- 2) Equipos (12) — 10 de CONMEBOL + 2 invitados (Japón, Catar).
insert into public."tblEquipos" (torneo_id, nombre, codigo_iso, grupo, bandera_url)
select t.id, d.nombre, d.iso3, d.grupo, '/flags/' || d.iso2 || '.svg'
from public."tblTorneos" t
cross join (values
  ('A','Brasil','BRA','br'),
  ('A','Venezuela','VEN','ve'),
  ('A','Perú','PER','pe'),
  ('A','Bolivia','BOL','bo'),
  ('B','Colombia','COL','co'),
  ('B','Argentina','ARG','ar'),
  ('B','Paraguay','PAR','py'),
  ('B','Catar','QAT','qa'),
  ('C','Uruguay','URU','uy'),
  ('C','Chile','CHI','cl'),
  ('C','Japón','JPN','jp'),
  ('C','Ecuador','ECU','ec')
) as d(grupo, nombre, iso3, iso2)
where t.codigo = 'copa-america-2019'
on conflict (torneo_id, nombre) do nothing;

-- 3) Fase de grupos (18 partidos) — equipos resueltos por nombre.
insert into public."tblPartidos"
  (torneo_id, numero_partido, fase, grupo, equipo_local_id, equipo_visitante_id, fecha_hora, ciudad, estadio, estado)
select t.id, d.num, 'fase_grupos', d.grupo, el.id, ev.id, d.fecha::timestamptz, d.ciudad, d.estadio, 'programado'
from public."tblTorneos" t
join (values
  (1,'A','Brasil','Bolivia','2019-06-15T00:30:00Z','São Paulo','Morumbi'),
  (2,'A','Venezuela','Perú','2019-06-15T19:00:00Z','Porto Alegre','Arena do Grêmio'),
  (3,'B','Argentina','Colombia','2019-06-15T22:00:00Z','Salvador','Arena Fonte Nova'),
  (4,'B','Paraguay','Catar','2019-06-16T19:00:00Z','Río de Janeiro','Maracaná'),
  (5,'C','Uruguay','Ecuador','2019-06-16T22:00:00Z','Belo Horizonte','Mineirão'),
  (6,'C','Japón','Chile','2019-06-17T23:00:00Z','São Paulo','Morumbi'),
  (7,'A','Bolivia','Perú','2019-06-18T21:30:00Z','Río de Janeiro','Maracaná'),
  (8,'A','Brasil','Venezuela','2019-06-19T00:30:00Z','Salvador','Arena Fonte Nova'),
  (9,'B','Colombia','Catar','2019-06-19T21:30:00Z','São Paulo','Morumbi'),
  (10,'B','Argentina','Paraguay','2019-06-20T00:30:00Z','Belo Horizonte','Mineirão'),
  (11,'C','Uruguay','Japón','2019-06-20T23:00:00Z','Porto Alegre','Arena do Grêmio'),
  (12,'C','Ecuador','Chile','2019-06-21T23:00:00Z','Salvador','Arena Fonte Nova'),
  (13,'A','Perú','Brasil','2019-06-22T19:00:00Z','São Paulo','Arena Corinthians'),
  (14,'A','Bolivia','Venezuela','2019-06-22T19:00:00Z','Belo Horizonte','Mineirão'),
  (15,'B','Catar','Argentina','2019-06-23T19:00:00Z','Porto Alegre','Arena do Grêmio'),
  (16,'B','Colombia','Paraguay','2019-06-23T19:00:00Z','Salvador','Arena Fonte Nova'),
  (17,'C','Chile','Uruguay','2019-06-24T23:00:00Z','Río de Janeiro','Maracaná'),
  (18,'C','Ecuador','Japón','2019-06-24T23:00:00Z','Belo Horizonte','Mineirão')
) as d(num, grupo, local, visitante, fecha, ciudad, estadio) on true
join public."tblEquipos" el on el.torneo_id = t.id and el.nombre = d.local
join public."tblEquipos" ev on ev.torneo_id = t.id and ev.nombre = d.visitante
where t.codigo = 'copa-america-2019'
on conflict (torneo_id, numero_partido) do nothing;

-- 4) Eliminación directa (8 partidos) — placeholders hasta el cierre de grupos.
-- Notación: 1A=primero grupo A, 2C=segundo grupo C, 3BC=tercero de B o C
-- (mejor tercero), G19=ganador del partido 19, P23=perdedor del partido 23.
insert into public."tblPartidos"
  (torneo_id, numero_partido, fase, placeholder_local, placeholder_visitante, fecha_hora, ciudad, estadio, estado)
select t.id, d.num, d.fase::fase_torneo, d.ph_local, d.ph_visit, d.fecha::timestamptz, d.ciudad, d.estadio, 'programado'
from public."tblTorneos" t
join (values
  (19,'cuartos','1A','3BC','2019-06-28T00:30:00Z','Porto Alegre','Arena do Grêmio'),
  (20,'cuartos','2B','2A','2019-06-28T19:00:00Z','Río de Janeiro','Maracaná'),
  (21,'cuartos','1B','2C','2019-06-28T23:00:00Z','São Paulo','Arena Corinthians'),
  (22,'cuartos','1C','3AB','2019-06-29T19:00:00Z','Salvador','Arena Fonte Nova'),
  (23,'semifinales','G19','G20','2019-07-03T00:30:00Z','Belo Horizonte','Mineirão'),
  (24,'semifinales','G21','G22','2019-07-04T00:30:00Z','Porto Alegre','Arena do Grêmio'),
  (25,'tercer_lugar','P23','P24','2019-07-06T19:00:00Z','São Paulo','Arena Corinthians'),
  (26,'final','G23','G24','2019-07-07T20:00:00Z','Río de Janeiro','Maracaná')
) as d(num, fase, ph_local, ph_visit, fecha, ciudad, estadio) on true
where t.codigo = 'copa-america-2019'
on conflict (torneo_id, numero_partido) do nothing;

-- 5) Asignación de mejores terceros (formato largo, ver 0056).
-- Clasifican 2 de los 3 terceros => 3 combinaciones posibles {A,B},{A,C},{B,C}.
-- QF1 (partido 19, rival de 1A) admite tercero de B/C; QF4 (partido 22, rival de
-- 1C) admite tercero de A/B. Esto fuerza una única asignación por combinación:
--   {A,B}: 1A vs 3B, 1C vs 3A   {A,C}: 1A vs 3C, 1C vs 3A   {B,C}: 1A vs 3C, 1C vs 3B
insert into public."tblAsignacionTercerosSlot"
  (torneo_id, combinacion_grupos, numero_partido, grupo)
select t.id, d.combo, d.num, d.grupo
from public."tblTorneos" t
join (values
  ('AB', 19, 'B'),   ('AB', 22, 'A'),
  ('AC', 19, 'C'),   ('AC', 22, 'A'),
  ('BC', 19, 'C'),   ('BC', 22, 'B')
) as d(combo, num, grupo) on true
where t.codigo = 'copa-america-2019'
on conflict do nothing;
