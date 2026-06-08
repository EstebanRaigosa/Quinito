/**
 * Splash screens de iOS (`apple-touch-startup-image`). iOS no usa el manifest
 * para esto: sin estos <link> la PWA instalada muestra pantalla BLANCA al abrir
 * (COMPATIBILIDAD-MOVIL.md §13). Una entrada por resolución de iPhone (iOS 15+),
 * solo portrait (la app está bloqueada en portrait en el manifest).
 *
 * Las imágenes se generan en `public/splash/`. Si se agregan nuevos modelos,
 * añadir aquí su media query + PNG.
 */
const SPLASH: { w: number; h: number; r: number }[] = [
  { w: 375, h: 667, r: 2 }, // SE 2/3, 6/7/8
  { w: 414, h: 736, r: 3 }, // 8 Plus
  { w: 375, h: 812, r: 3 }, // X, XS, 11 Pro
  { w: 414, h: 896, r: 2 }, // XR, 11
  { w: 414, h: 896, r: 3 }, // XS Max, 11 Pro Max
  { w: 390, h: 844, r: 3 }, // 12, 13, 14
  { w: 428, h: 926, r: 3 }, // 12/13 Pro Max, 14 Plus
  { w: 393, h: 852, r: 3 }, // 14 Pro, 15, 15 Pro, 16
  { w: 430, h: 932, r: 3 }, // 14 Pro Max, 15 Pro Max, 16 Plus
  { w: 360, h: 780, r: 3 }, // 12/13 mini
  { w: 402, h: 874, r: 3 }, // 16 Pro
  { w: 440, h: 956, r: 3 }, // 16 Pro Max
];

export function AppleSplashLinks() {
  return (
    <>
      {SPLASH.map(({ w, h, r }) => (
        <link
          key={`${w}x${h}@${r}`}
          rel="apple-touch-startup-image"
          media={`(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`}
          href={`/splash/splash-${w * r}x${h * r}.png`}
        />
      ))}
    </>
  );
}
