# Marca · Polla

Sistema de identidad visual de **Polla** (pollas/quinielas del Mundial 2026).
Estética **Spring Turf / Modern Bento**: verde esmeralda, tinta navy, esquinas
redondeadas, tipografía **Mulish**. Ver `guia/portada.png`.

## Paleta

| Rol | Hex |
|---|---|
| Emerald (marca/acción) | `#22C55E` |
| Emerald 600 (botón AA) | `#16A34A` |
| Navy (tinta/cuadro) | `#0B1C30` |
| Ink (fondo oscuro) | `#07111F` |
| Teal (acento) | `#14B8A6` / `#0D9488` |
| Slate (fondo claro) | `#F8FAFC` |
| Blanco | `#FFFFFF` |

## Estructura

```
marca/
├─ isotipo/      Símbolo (cuadro bento + "P")
│   ├─ isotipo-navy.{png,svg}     ← PRIMARIO (cuadro navy + P verde)
│   ├─ isotipo-green.{png,svg}    alt (cuadro verde + P blanca)
│   ├─ isotipo-ondark.png         para fondos oscuros (cuadro elevado)
│   ├─ isotipo-mono-{white,navy}.png   silueta a 1 color
│   ├─ isotipo-construccion.png   grilla de construcción
│   └─ isotipo-safezone.png       área de respeto
├─ logotipo/     Wordmark "polla" (navy / white / green) · png + svg
├─ imagotipo/    Símbolo + texto separados (horizontal y vertical) · png + svg
├─ isologo/      Lockup integrado en pastilla (navy / green)
├─ favicon/      favicon.ico (16–64) + favicon-{16,32,48,180}.png
├─ pwa/          icon-192, icon-512, icon-maskable-512, apple-icon-180
└─ guia/         portada.png (hoja de marca)
```

## Cuándo usar cada uno

- **Isotipo** → favicon, ícono de app, avatar, espacios cuadrados pequeños.
- **Logotipo** → cuando el contexto ya identifica la marca (footer, espacios anchos).
- **Imagotipo** → encabezados, landing, material donde se presenta la marca completa.
- **Isologo** → sellos, stickers, watermark; cuando se quiere una unidad compacta.

## Reglas

- **Área de respeto:** mínimo `X/4` (X = lado del isotipo) libre alrededor.
- **Tamaño mínimo** del isotipo: 24 px (digital).
- Versiones **navy** sobre fondos claros; **green / white / ondark** sobre oscuros.
- **No**: deformar, rotar, recolorear fuera de paleta, sombras duras, ni el
  isotipo navy sobre fondos oscuros (usa `ondark` o `green`).

## Vectores

Los `.svg` (isotipo, logotipo, imagotipo) llevan los contornos de **Mulish**
convertidos a trazo — escalan sin pérdida. Los `.png` están a alta resolución
(isotipo 2048 px) con fondo transparente.

## Assets en producción

Los íconos que consume la app se derivan de aquí: `app/apple-icon.png`,
`app/favicon.ico`, `public/icon-192.png`, `public/icon-512.png`,
`public/icon-maskable-512.png`, `public/icon.svg`. Si cambia la marca,
regenerar con `marca/` y volver a copiarlos.
