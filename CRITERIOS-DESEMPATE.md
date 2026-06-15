# Criterios de desempate del ranking de participantes

> Cómo se ordena la **tabla de posiciones** de una polla cuando dos o más
> participantes tienen el **mismo puntaje total**.
>
> Fuente de verdad en código: vista `vwTablaPosiciones`
> (migración [`0024_criterios_desempate.sql`](./supabase/migrations/0024_criterios_desempate.sql))
> y RPC `crear_grupo` ([`0025_crear_grupo_criterios_desempate.sql`](./supabase/migrations/0025_crear_grupo_criterios_desempate.sql)).

---

## 1. Idea general

El ranking **siempre** se ordena primero por **puntos totales** (de mayor a menor).
Cuando hay empate en puntos, se aplica una **secuencia de criterios de desempate**
configurable por cada polla. Si el primer criterio sigue empatado, se pasa al
segundo, y así sucesivamente. Al final hay un desempate técnico determinístico
para que el orden nunca sea ambiguo.

> ⚠️ **Importante:** esto desempata **participantes** (usuarios de la polla), no
> equipos de fútbol. El desempate de selecciones en la fase de grupos del torneo
> (criterios FIFA) es un tema distinto y vive en otra parte del modelo.

---

## 2. Orden de evaluación completo

El ranking se calcula aplicando estos criterios **en orden**. Solo se pasa al
siguiente cuando el anterior produce un empate exacto:

| # | Criterio | Descripción | Configurable |
|---|----------|-------------|:---:|
| 1 | **Puntos totales** | Suma de `puntos_obtenidos` de todas las predicciones. Mayor gana. | ❌ Fijo |
| 2 | **1er criterio configurable** | Según configuración de la polla (exactos / únicas / aciertos). | ✅ |
| 3 | **2º criterio configurable** | Según configuración de la polla. | ✅ |
| 4 | **3er criterio configurable** | Según configuración de la polla. | ✅ |
| 5 | **Diferencia de gol acertada** | Veces que acertó el margen aunque no el marcador (predijo 2-1, fue 3-2). Mayor gana. | ❌ Fijo |
| 6 | **Ganador / sentido (1X2)** | Veces que acertó quién gana o si fue empate. Mayor gana. | ❌ Fijo |
| 7 | **Goles individuales acertados** | Total de goles de equipo acertados (0-2 por partido). Mayor gana. | ❌ Fijo |
| 8 | **Quién guardó primero** | Hora en que dejó lista su quiniela (`max(actualizado_en)`). **El que la registró antes, gana.** | ❌ Fijo |
| — | *(salvaguarda técnica: UUID)* | *No es un criterio. Solo garantiza un orden determinístico si dos timestamps fueran idénticos al microsegundo (caso imposible en la práctica).* | ❌ Fijo |

> **El nombre del participante NO es criterio de desempate.** Se eliminó del
> ordenamiento (la migración [`0033`](./supabase/migrations/0033_desempate_criterios_deportivos.sql))
> porque decidir un premio por el abecedario no es justo.

Los criterios 5-8 son **deportivos** y se intercalan para que el desempate sea
justo. Con tres criterios deportivos en cascada (diferencia → ganador → goles) más
el criterio temporal, que dos participantes lleguen al final empatados es
prácticamente imposible: tendrían que haber predicho casi idéntico todo el torneo
**y** haber guardado a la misma hora.

---

## 3. Los tres criterios configurables

Cada polla define el **orden** de estos tres criterios. Todos ordenan de **mayor
a menor** (más es mejor):

| Clave interna | Nombre | Qué cuenta |
|---------------|--------|------------|
| `exactos` | **Marcadores exactos** | Número de predicciones en las que el participante acertó el marcador **exacto** (goles local y visitante) en partidos ya finalizados. |
| `unicas` | **Predicciones únicas** | Número de predicciones acertadas que además fueron **únicas** (nadie más en la polla predijo ese marcador). Premia el arriesgar. |
| `aciertos` | **Aciertos (parciales)** | Número de predicciones que sumaron **algún punto** (`puntos_obtenidos > 0`) **pero que NO fueron marcador exacto**. Un exacto **no** cuenta como acierto: son métricas distintas y disjuntas (ver migración [`0034`](./supabase/migrations/0034_aciertos_excluye_exactos.sql)). |

### Orden por defecto

Si la polla no configura nada, el orden es:

```
1º exactos  →  2º unicas  →  3º aciertos
```

Es decir: a igualdad de puntos, gana quien tenga **más marcadores exactos**; si
siguen empatados, quien tenga **más predicciones únicas acertadas**; y si aún
empatan, quien tenga **más aciertos** en total.

> El orden se guarda en la columna `criterios_desempate` (`text[]`) de
> `tblReglasGrupo`. Solo se permiten esos tres valores; el array completo se
> configura al crear la polla (wizard) y cae al default si no se especifica.

---

## 3.5. Los criterios deportivos fijos (5-8)

Cuando los criterios configurables no alcanzan a romper el empate, entran estos
criterios **fijos e iguales para todas las pollas**, en cascada. Los tres
primeros son "deportivos" (miden la calidad de la predicción) y el último es
temporal. Todos se calculan **por detrás** (no se muestran en la UI por ahora) y
no requieren guardar datos nuevos.

| Clave | Criterio | Qué cuenta | Cómo se calcula |
|-------|----------|------------|-----------------|
| 5 | **Diferencia de gol acertada** | Acertaste el margen aunque no el marcador exacto (predijiste 2-1, fue 3-2: ambos diferencia +1). Más es mejor. | Se deriva en la vista comparando `goles_local - goles_visitante` de la predicción vs. el real, en partidos finalizados. |
| 6 | **Ganador / sentido (1X2)** | Acertaste quién gana o si fue empate, sin importar el marcador. Más es mejor. | Se compara el signo del resultado (gana local / empate / gana visitante). |
| 7 | **Goles individuales acertados** | Cuántos goles de equipo le pegaste en total (0, 1 o 2 por partido). Más es mejor. | Suma de aciertos de goles del local + del visitante en partidos finalizados. |
| 8 | **Quién guardó primero** | A igualdad de todo lo anterior, gana quien **dejó lista su quiniela antes**. | `max(actualizado_en)` de sus predicciones, ascendente. La columna `actualizado_en` la mantiene el trigger `set_actualizado_en`: se fija al guardar y se **actualiza en cada edición** del marcador. |

> **Jerarquía deportiva:** el orden 5→6→7 sigue la lógica de "qué tan buena fue la
> predicción", de más exigente a menos. Acertar la **diferencia** casi siempre
> implica acertar el **ganador**, así que ganador va después: atrapa a quien no
> clavó el margen pero sí el sentido. Goles individuales es la red más granular.

> **Criterio temporal (8):** premia comprometerse temprano. Si editás un marcador
> a último momento, tu `actualizado_en` se mueve hacia adelante y perdés prioridad
> en este criterio. Es el **último criterio real**; debajo solo queda el UUID como
> salvaguarda técnica invisible.

---

## 4. Ejemplo paso a paso

Polla con el orden por defecto (`exactos → unicas → aciertos`). Tres
participantes empatados en **40 puntos**:

| Participante | Puntos | Marcadores exactos | Únicas acertadas | Aciertos |
|--------------|:------:|:------------------:|:----------------:|:--------:|
| Ana          | 40 | **6** | 2 | 12 |
| Beto         | 40 | 5 | 3 | 14 |
| Caro         | 40 | 5 | 3 | 11 |

Resolución:

1. **Puntos:** los tres en 40 → empate, se pasa al criterio 1 de desempate.
2. **Marcadores exactos:** Ana tiene 6 (más) → **Ana queda 1ª**. Beto y Caro siguen empatados con 5.
3. **Predicciones únicas:** Beto y Caro tienen 3 → siguen empatados, se pasa al siguiente.
4. **Aciertos:** Beto tiene 14 vs. 11 de Caro → **Beto 2º, Caro 3º**.

**Ranking final:** 1º Ana · 2º Beto · 3º Caro.

> Si Beto y Caro hubieran empatado también en aciertos, se seguiría bajando por
> los criterios deportivos: **diferencia de gol acertada → ganador (1X2) → goles
> individuales** y, si aún así fueran idénticos, gana **quien guardó su quiniela
> primero** (`max(actualizado_en)` más temprano). El nombre ya **no** participa.

---

## 5. Notas de implementación

- **Dónde se ordena:** todo el cálculo vive en la vista SQL `vwTablaPosiciones`,
  usando `row_number()` con la secuencia de `ORDER BY` descrita arriba. No hay
  ordenamiento en el cliente; la posición llega ya calculada desde la base de datos.
- **Sin SQL dinámico:** el orden configurable se resuelve con un `CASE` sobre cada
  posición del array `criterios_desempate[1..3]`, no construyendo SQL en tiempo de
  ejecución.
- **Criterios deportivos "por detrás":** los criterios 5-8 solo viven en el
  `ORDER BY` del `row_number()`; **no** se agregan como columnas de salida de la
  vista, así que `grupo_detalle`, los tipos generados y el frontend no cambian.
  Si en el futuro se quieren mostrar, hay que exponerlos explícitamente.
- **Privacidad:** los conteos son agregados por participante; la vista respeta
  `es_miembro_grupo` y se mantiene como `security_invoker = off` porque agrega
  predicciones.
- **Columnas expuestas al frontend** (vía RPC `grupo_detalle`):
  `puntos_totales`, `aciertos`, `marcadores_exactos`, `unicas_acertadas` y
  `posicion`.

---

## 6. Resumen de una línea

> **Más puntos → (exactos · únicas · aciertos, reordenables por polla) → más
> diferencias de gol → más ganadores 1X2 → más goles individuales → quien guardó
> primero.** El nombre ya no desempata; el UUID es solo salvaguarda técnica.

---

**Última actualización:** 2026-06-11. Criterios deportivos + temporal agregados
(migración `0033`); el nombre dejó de ser criterio de desempate. `aciertos` ahora
**excluye** los marcadores exactos (migración `0034`).
