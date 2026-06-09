import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  // `@serwist/next` agrega una config de `webpack` (incluso deshabilitado en dev).
  // Next 16 corre con Turbopack por defecto y exige un `turbopack` presente para
  // no abortar al detectar esa config de webpack. Vacío basta: en dev no usamos
  // webpack y el build de producción corre con `--webpack`.
  turbopack: {},
};

/**
 * Serwist: genera el service worker (`public/sw.js`) desde `app/sw.ts`.
 * El SW es el requisito para que Chrome/Android dispare `beforeinstallprompt`
 * y permita instalar la PWA. Deshabilitado en desarrollo para no cachear de más.
 */
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
