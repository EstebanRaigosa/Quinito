-- ============================================================================
-- Copa América 2019 (torneo de PRUEBA): reprogramar a fechas actuales (2026).
--
-- El seed (0058) usa las fechas reales de 2019, todas en el pasado -> los
-- partidos quedan "cerrados" y no se pueden predecir. Para poder probar el flujo
-- completo (predecir, cerrar, puntuar, resolver cruces y mejores terceros) se
-- desplaza TODO el calendario manteniendo la estructura: el 1er partido pasa a
-- 2026-06-18 y el resto conserva su separación y hora del día originales.
-- Idempotente: fija fechas absolutas por numero_partido.
-- ============================================================================
update public."tblPartidos" p
set fecha_hora = d.fecha::timestamptz
from public."tblTorneos" t, (values
  (1,'2026-06-18T00:30:00Z'),(2,'2026-06-18T19:00:00Z'),(3,'2026-06-18T22:00:00Z'),
  (4,'2026-06-19T19:00:00Z'),(5,'2026-06-19T22:00:00Z'),(6,'2026-06-20T23:00:00Z'),
  (7,'2026-06-21T21:30:00Z'),(8,'2026-06-22T00:30:00Z'),(9,'2026-06-22T21:30:00Z'),
  (10,'2026-06-23T00:30:00Z'),(11,'2026-06-23T23:00:00Z'),(12,'2026-06-24T23:00:00Z'),
  (13,'2026-06-25T19:00:00Z'),(14,'2026-06-25T19:00:00Z'),(15,'2026-06-26T19:00:00Z'),
  (16,'2026-06-26T19:00:00Z'),(17,'2026-06-27T23:00:00Z'),(18,'2026-06-27T23:00:00Z'),
  (19,'2026-07-01T00:30:00Z'),(20,'2026-07-01T19:00:00Z'),(21,'2026-07-01T23:00:00Z'),
  (22,'2026-07-02T19:00:00Z'),(23,'2026-07-06T00:30:00Z'),(24,'2026-07-07T00:30:00Z'),
  (25,'2026-07-09T19:00:00Z'),(26,'2026-07-10T20:00:00Z')
) as d(num, fecha)
where p.torneo_id = t.id and t.codigo = 'copa-america-2019'
  and d.num = p.numero_partido;

-- Rango de fechas del torneo (lo muestra la tarjeta del wizard).
update public."tblTorneos"
set fecha_inicio = '2026-06-18', fecha_fin = '2026-07-10'
where codigo = 'copa-america-2019';
