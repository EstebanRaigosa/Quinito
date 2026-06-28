-- Corrige la hora del partido 85 (dieciseisavos: 1B vs 3EFGIJ → Suiza vs Argelia)
-- del torneo Mundial 2026. Estaba a las 8:00 p.m. Bogotá (2026-07-03T01:00:00Z) y
-- debe ser a las 10:00 p.m. Bogotá del 2-jul (2026-07-03T03:00:00Z).
--
-- Se acota por torneo `mundial-2026` para NO tocar el torneo duplicado `mundial-2`.
-- El seed 0007 ya está aplicado, así que la corrección va en migración nueva.

update public."tblPartidos" p
set fecha_hora = '2026-07-03T03:00:00Z'::timestamptz
from public."tblTorneos" t
where t.id = p.torneo_id
  and t.codigo = 'mundial-2026'
  and p.numero_partido = 85;
