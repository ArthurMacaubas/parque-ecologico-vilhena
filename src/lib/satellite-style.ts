import type { StyleSpecification } from "maplibre-gl";

// Coordenadas iniciais aproximadas de Vilhena-RO
export const INITIAL_CENTER: [number, number] = [-60.1458, -12.7406];
export const INITIAL_ZOOM = 14;

// Fonte de satélite: Esri World Imagery.
// Tile raster público, sem necessidade de API key, amplamente usado em
// desenvolvimento/testes com MapLibre e Leaflet. Para uso em produção com
// alto volume de requisições, consulte os termos de uso da Esri.
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    "esri-satellite": {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    },
  },
  layers: [
    {
      id: "esri-satellite-layer",
      type: "raster",
      source: "esri-satellite",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};
