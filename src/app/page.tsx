"use client";

import dynamic from "next/dynamic";

// O MapLibre depende de `window`/`document`, então o componente de mapa
// só pode ser renderizado no cliente (evita erros de SSR).
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
});

export default function Home() {
  return <Map />;
}
