---
name: supabase-plan-y-borrado-suave
description: Supabase en plan FREE (sin backups/PITR); eliminar participante ahora es borrado suave (eliminado_en)
metadata:
  type: project
---

**Proyecto Supabase:** ref `jovwkbqwbrephzvjhwiq`, org `cqwakjdeptjrzudrrkvf` (Raigo), **plan `free`**.

**Implicación crítica:** el plan free **no tiene backups automáticos ni PITR**. Un `delete` destructivo es **irrecuperable**. (Pasó: un participante eliminado por error perdió sus predicciones, sin forma de restaurarlas).

**Por eso, jun 2026 se implementó BORRADO SUAVE de participantes** (migración `0043_borrado_suave_participantes`):
- Columna `tblParticipantes.eliminado_en timestamptz` (NULL = activo).
- `gestionar_participante` ahora hace `update eliminado_en=now()` (antes era `delete` + cascade que borraba predicciones).
- `es_miembro_grupo`, `vwTablaPosiciones`, `mis_grupos`, `grupo_detalle`, `buscar_grupo` y las `vwEstadisticasPartido*Grupo` filtran `eliminado_en is null` → el eliminado deja de ver la polla y no sale en tabla/agregados.
- RPC nuevo `unirse_grupo(p_grupo_id)` (reemplaza el insert directo de `unirseAGrupo`): reactiva (`eliminado_en=null`) y recupera el historial, o inserta; respeta el baneo.

Pendiente sugerido: UI de admin para ver/restaurar eliminados; subir a Pro para tener backups. Ver [[tailwind-opacidad-colores]].
