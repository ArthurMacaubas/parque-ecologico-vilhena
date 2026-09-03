"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  type MapMouseEvent,
  type GeoJSONSource,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { INITIAL_CENTER, INITIAL_ZOOM, SATELLITE_STYLE } from "@/lib/satellite-style";
import type { Point, Trail } from "@/types/models";

interface Coordinates {
  lat: number;
  lng: number;
}

const TRAILS_SOURCE_ID = "trails";

function trailsToFeatureCollection(trails: Trail[]) {
  return {
    type: "FeatureCollection" as const,
    features: trails.map((trail) => ({
      ...trail.geojson,
      properties: {
        ...trail.geojson.properties,
        name: trail.name,
        color: trail.category?.color ?? "#2a9d8f",
      },
    })),
  };
}

function pointPopupHtml(point: Point): string {
  const category = point.category
    ? `<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:${point.category.color};color:#fff;font-size:11px;margin-bottom:6px;">${point.category.name}</span><br/>`
    : "";
  const description = point.description
    ? `<p style="margin:4px 0 8px;font-size:13px;">${point.description}</p>`
    : "";
  const photos = point.photos.length
    ? `<div style="display:flex;gap:4px;overflow-x:auto;max-width:220px;">${point.photos
        .map(
          (photo) =>
            `<img src="${photo.url}" alt="${point.name}" style="height:64px;border-radius:4px;object-fit:cover;" />`,
        )
        .join("")}</div>`
    : "";

  return `
    <div style="font-family:system-ui,sans-serif;max-width:220px;">
      ${category}
      <strong style="font-size:14px;">${point.name}</strong>
      ${description}
      ${photos}
    </div>
  `;
}

async function loadPoints(map: MapLibreMap, pointMarkersRef: { current: Marker[] }) {
  try {
    const response = await fetch("/api/points");
    if (!response.ok) return;
    const points: Point[] = await response.json();

    pointMarkersRef.current.forEach((marker) => marker.remove());
    pointMarkersRef.current = points.map((point) => {
      const marker = new Marker({ color: point.category?.color ?? "#2a9d8f" })
        .setLngLat([point.lng, point.lat])
        .setPopup(new Popup({ offset: 16 }).setHTML(pointPopupHtml(point)))
        .addTo(map);
      return marker;
    });
  } catch {
    // Falha silenciosa: mapa continua funcional sem os pontos persistidos.
  }
}

async function loadTrails(map: MapLibreMap) {
  try {
    const response = await fetch("/api/trails");
    if (!response.ok) return;
    const trails: Trail[] = await response.json();
    const source = map.getSource(TRAILS_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData(trailsToFeatureCollection(trails));
  } catch {
    // Falha silenciosa: mapa continua funcional sem as trilhas persistidas.
  }
}

export default function Map() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const clickMarkerRef = useRef<Marker | null>(null);
  const pointMarkersRef = useRef<Marker[]>([]);

  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  useEffect(() => {
    // Evita inicializar o mapa mais de uma vez (ex.: React StrictMode)
    if (mapRef.current || !mapContainerRef.current) {
      return;
    }

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: SATELLITE_STYLE,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });

    map.addControl(new NavigationControl(), "top-right");

    const handleClick = (event: MapMouseEvent) => {
      const { lat, lng } = event.lngLat;
      setCoordinates({ lat, lng });

      if (clickMarkerRef.current) {
        clickMarkerRef.current.setLngLat([lng, lat]);
      } else {
        clickMarkerRef.current = new Marker({ color: "#e63946" })
          .setLngLat([lng, lat])
          .addTo(map);
      }
    };

    map.on("click", handleClick);

    map.on("load", () => {
      map.addSource(TRAILS_SOURCE_ID, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });

      map.addLayer({
        id: "trails-fill",
        type: "fill",
        source: TRAILS_SOURCE_ID,
        filter: ["==", ["geometry-type"], "Polygon"],
        paint: {
          "fill-color": ["coalesce", ["get", "color"], "#2a9d8f"],
          "fill-opacity": 0.25,
        },
      });

      map.addLayer({
        id: "trails-line",
        type: "line",
        source: TRAILS_SOURCE_ID,
        paint: {
          "line-color": ["coalesce", ["get", "color"], "#2a9d8f"],
          "line-width": 3,
        },
      });

      loadPoints(map, pointMarkersRef);
      loadTrails(map);
    });

    mapRef.current = map;

    return () => {
      map.off("click", handleClick);
      clickMarkerRef.current?.remove();
      clickMarkerRef.current = null;
      pointMarkersRef.current.forEach((marker) => marker.remove());
      pointMarkersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1,
          background: "rgba(0, 0, 0, 0.7)",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: 8,
          fontFamily: "monospace",
          fontSize: 14,
          lineHeight: 1.5,
          pointerEvents: "none",
        }}
      >
        {coordinates ? (
          <>
            <div>Latitude: {coordinates.lat.toFixed(6)}</div>
            <div>Longitude: {coordinates.lng.toFixed(6)}</div>
          </>
        ) : (
          <div>Clique no mapa para obter as coordenadas</div>
        )}
      </div>

      <a
        href="/login"
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          zIndex: 1,
          background: "rgba(0, 0, 0, 0.7)",
          color: "#fff",
          padding: "8px 12px",
          borderRadius: 8,
          fontFamily: "system-ui, sans-serif",
          fontSize: 12,
          textDecoration: "none",
        }}
      >
        Acesso da equipe (SUAP) →
      </a>
    </div>
  );
}
