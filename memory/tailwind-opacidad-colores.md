---
name: tailwind-opacidad-colores
description: En Tailwind 3.4 los colores var() (primary/success/...) NO admiten /opacidad; usar escalas mustard/clay
metadata:
  type: reference
---

En este proyecto (Tailwind 3.4), los colores semánticos están definidos como `var(--primary)` con valor **hex** (ej. `--primary: #16A34A`). Por eso el **modificador de opacidad NO genera CSS**: clases como `bg-primary/15`, `border-success/30`, `bg-success-soft/55`, `bg-clay-… ` (si fuera var)… se **descartan en silencio** (verificado compilando: producen 0 reglas).

Funciona SOLO con:
- Colores **sólidos** sin opacidad: `bg-primary`, `bg-primary-soft`, `bg-sunken` (var() planos), y
- Las **escalas de marca en hex literal** del config: `clay` (→ ink/navy) y `mustard` (→ emerald), `sage`, `sand`, `stone`. Estas SÍ admiten opacidad: `bg-mustard-400/15` → `rgb(34 197 94 / 0.15)`.

**Regla práctica:** para verdes/tintes con alfa (incl. velos translúcidos que sirven en claro y oscuro), usar `mustard-*` (emerald) o `clay-*` (ink), nunca `primary/success/...`. Para verificar: `npx tailwindcss -c tailwind.config.ts -i in.css --content file.html` y grep la clase.

Esto causó un bug real: tarjetas de estadísticas "planas/sin verde" porque los `*/opacity` no renderizaban. Se arregló con `mustard-400/…`. Arreglo de raíz pendiente (opcional): redefinir tokens como canales `--primary: 22 163 74` + `rgb(var(--primary)/<alpha-value>)`.
