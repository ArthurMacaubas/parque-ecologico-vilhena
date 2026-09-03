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
import {
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
} from "terra-draw";
import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
import { INITIAL_CENTER, INITIAL_ZOOM, SATELLITE_STYLE } from "@/lib/satellite-style";
import { useCategories } from "@/lib/use-categories";
import type { Point, Trail, TrailGeoJSON } from "@/types/models";

type EditorMode = "view" | "add-point" | "draw-line" | "draw-polygon";

const TRAILS_SOURCE_ID = "trails";

export default function AdminMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const drawRef = useRef<TerraDraw | null>(null);
  const pointMarkersRef = useRef<Marker[]>([]);

  const { categories } = useCategories();

  const [mode, setMode] = useState<EditorMode>("view");
  const [points, setPoints] = useState<Point[]>([]);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [pendingPoint, setPendingPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingTrail, setPendingTrail] = useState<TrailGeoJSON | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // --- inicialização do mapa (uma única vez) ---
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: SATELLITE_STYLE,
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
    });
    map.addControl(new NavigationControl(), "top-right");

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

      const draw = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map, coordinatePrecision: 6 }),
        modes: [new TerraDrawLineStringMode(), new TerraDrawPolygonMode()],
      });

      draw.on("finish", (id) => {
        const feature = draw.getSnapshotFeature(id);
        if (
          feature &&
          (feature.geometry.type === "LineString" || feature.geometry.type === "Polygon")
        ) {
          setPendingTrail({
            type: "Feature",
            geometry: feature.geometry,
            properties: {},
          } as TrailGeoJSON);
        }
        draw.clear();
        draw.stop();
        setMode("view");
      });

      drawRef.current = draw;

      refreshPoints(map);
      refreshTrails(map);
    });

    mapRef.current = map;

    return () => {
      pointMarkersRef.current.forEach((marker) => marker.remove());
      pointMarkersRef.current = [];
      drawRef.current?.stop();
      drawRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // --- clique no mapa: só cria um ponto pendente no modo "add-point" ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function handleClick(event: MapMouseEvent) {
      if (mode !== "add-point") return;
      const { lat, lng } = event.lngLat;
      setPendingPoint({ lat, lng });
    }

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [mode]);

  // --- liga/desliga o terra-draw conforme o modo do editor ---
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;

    if (mode === "draw-line") {
      draw.start();
      draw.setMode("linestring");
    } else if (mode === "draw-polygon") {
      draw.start();
      draw.setMode("polygon");
    } else {
      draw.stop();
    }
  }, [mode]);

  async function refreshPoints(map: MapLibreMap) {
    const response = await fetch("/api/points");
    if (!response.ok) return;
    const data: Point[] = await response.json();
    setPoints(data);

    pointMarkersRef.current.forEach((marker) => marker.remove());
    pointMarkersRef.current = data.map((point) => {
      const marker = new Marker({ color: point.category?.color ?? "#2a9d8f" })
        .setLngLat([point.lng, point.lat])
        .setPopup(new Popup({ offset: 16 }).setHTML(`<strong>${point.name}</strong>`))
        .addTo(map);
      return marker;
    });
  }

  async function refreshTrails(map: MapLibreMap) {
    const response = await fetch("/api/trails");
    if (!response.ok) return;
    const data: Trail[] = await response.json();
    setTrails(data);

    const source = map.getSource(TRAILS_SOURCE_ID) as GeoJSONSource | undefined;
    source?.setData({
      type: "FeatureCollection",
      features: data.map((trail) => ({
        ...trail.geojson,
        properties: {
          ...trail.geojson.properties,
          name: trail.name,
          color: trail.category?.color ?? "#2a9d8f",
        },
      })),
    });
  }

  async function savePoint(input: {
    name: string;
    description: string;
    categoryId: string;
    photos: FileList | null;
  }) {
    if (!pendingPoint) return;

    const response = await fetch("/api/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        description: input.description || undefined,
        lat: pendingPoint.lat,
        lng: pendingPoint.lng,
        categoryId: input.categoryId || undefined,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setStatusMessage(err.error ?? "Erro ao salvar ponto.");
      return;
    }

    const created: Point = await response.json();

    if (input.photos && input.photos.length > 0) {
      for (const file of Array.from(input.photos)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("pointId", created.id);
        await fetch("/api/upload", { method: "POST", body: formData });
      }
    }

    setPendingPoint(null);
    setMode("view");
    setStatusMessage(`Ponto "${created.name}" salvo.`);
    if (mapRef.current) refreshPoints(mapRef.current);
  }

  async function deletePoint(id: string) {
    if (!confirm("Remover este ponto? Esta ação não pode ser desfeita.")) return;
    await fetch(`/api/points/${id}`, { method: "DELETE" });
    if (mapRef.current) refreshPoints(mapRef.current);
  }

  async function saveTrail(input: { name: string; description: string; categoryId: string }) {
    if (!pendingTrail) return;

    const response = await fetch("/api/trails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        description: input.description || undefined,
        categoryId: input.categoryId || undefined,
        geojson: pendingTrail,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      setStatusMessage(err.error ?? "Erro ao salvar trilha.");
      return;
    }

    setPendingTrail(null);
    setStatusMessage("Trilha salva.");
    if (mapRef.current) refreshTrails(mapRef.current);
  }

  async function deleteTrail(id: string) {
    if (!confirm("Remover esta trilha? Esta ação não pode ser desfeita.")) return;
    await fetch(`/api/trails/${id}`, { method: "DELETE" });
    if (mapRef.current) refreshTrails(mapRef.current);
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "calc(100vh - 56px)" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      <Toolbar mode={mode} onModeChange={setMode} />

      {statusMessage && (
        <div style={toastStyle} onClick={() => setStatusMessage(null)}>
          {statusMessage}
        </div>
      )}

      {pendingPoint && (
        <PointForm
          coordinates={pendingPoint}
          categories={categories}
          onCancel={() => {
            setPendingPoint(null);
            setMode("view");
          }}
          onSave={savePoint}
        />
      )}

      {pendingTrail && (
        <TrailForm
          categories={categories}
          onCancel={() => setPendingTrail(null)}
          onSave={saveTrail}
        />
      )}

      <Sidebar points={points} trails={trails} onDeletePoint={deletePoint} onDeleteTrail={deleteTrail} />
    </div>
  );
}

function Toolbar({
  mode,
  onModeChange,
}: {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
}) {
  const buttons: { key: EditorMode; label: string }[] = [
    { key: "add-point", label: "+ Ponto" },
    { key: "draw-line", label: "Desenhar trilha" },
    { key: "draw-polygon", label: "Desenhar área" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 2,
        display: "flex",
        gap: 8,
        background: "rgba(15, 23, 42, 0.85)",
        padding: 8,
        borderRadius: 10,
      }}
    >
      {buttons.map((button) => (
        <button
          key={button.key}
          onClick={() => onModeChange(mode === button.key ? "view" : button.key)}
          style={{
            background: mode === button.key ? "#2a9d8f" : "#334155",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 13,
            fontFamily: "system-ui, sans-serif",
            cursor: "pointer",
          }}
        >
          {button.label}
        </button>
      ))}
      {mode !== "view" && (
        <span
          style={{
            color: "#e2e8f0",
            fontSize: 12,
            fontFamily: "system-ui, sans-serif",
            alignSelf: "center",
            marginLeft: 4,
          }}
        >
          {mode === "add-point"
            ? "Clique no mapa para posicionar o ponto"
            : "Clique para desenhar; dê duplo clique para finalizar"}
        </span>
      )}
    </div>
  );
}

function PointForm({
  coordinates,
  categories,
  onCancel,
  onSave,
}: {
  coordinates: { lat: number; lng: number };
  categories: { id: string; name: string }[];
  onCancel: () => void;
  onSave: (input: {
    name: string;
    description: string;
    categoryId: string;
    photos: FileList | null;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [photos, setPhotos] = useState<FileList | null>(null);

  return (
    <div style={panelStyle}>
      <h3 style={panelTitleStyle}>Novo ponto</h3>
      <p style={panelHintStyle}>
        {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
      </p>
      <label style={labelStyle}>
        Nome
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label style={labelStyle}>
        Descrição
        <textarea
          style={{ ...inputStyle, height: 60 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label style={labelStyle}>
        Categoria
        <select
          style={inputStyle}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Sem categoria</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label style={labelStyle}>
        Fotos
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => setPhotos(e.target.files)}
        />
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          style={primaryButtonStyle}
          disabled={!name.trim()}
          onClick={() => onSave({ name, description, categoryId, photos })}
        >
          Salvar
        </button>
        <button style={secondaryButtonStyle} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function TrailForm({
  categories,
  onCancel,
  onSave,
}: {
  categories: { id: string; name: string }[];
  onCancel: () => void;
  onSave: (input: { name: string; description: string; categoryId: string }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");

  return (
    <div style={panelStyle}>
      <h3 style={panelTitleStyle}>Nova trilha / área</h3>
      <label style={labelStyle}>
        Nome
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label style={labelStyle}>
        Descrição
        <textarea
          style={{ ...inputStyle, height: 60 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label style={labelStyle}>
        Categoria
        <select
          style={inputStyle}
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Sem categoria</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button
          style={primaryButtonStyle}
          disabled={!name.trim()}
          onClick={() => onSave({ name, description, categoryId })}
        >
          Salvar
        </button>
        <button style={secondaryButtonStyle} onClick={onCancel}>
          Descartar
        </button>
      </div>
    </div>
  );
}

function Sidebar({
  points,
  trails,
  onDeletePoint,
  onDeleteTrail,
}: {
  points: Point[];
  trails: Trail[];
  onDeletePoint: (id: string) => void;
  onDeleteTrail: (id: string) => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        right: 56,
        zIndex: 2,
        width: 260,
        maxHeight: "calc(100% - 24px)",
        overflowY: "auto",
        background: "rgba(15, 23, 42, 0.9)",
        borderRadius: 10,
        padding: 12,
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
      }}
    >
      <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#94a3b8" }}>
        Pontos ({points.length})
      </h4>
      {points.map((point) => (
        <div key={point.id} style={listItemStyle}>
          <span>{point.name}</span>
          <button style={deleteButtonStyle} onClick={() => onDeletePoint(point.id)}>
            ×
          </button>
        </div>
      ))}

      <h4 style={{ margin: "16px 0 8px", fontSize: 13, color: "#94a3b8" }}>
        Trilhas / áreas ({trails.length})
      </h4>
      {trails.map((trail) => (
        <div key={trail.id} style={listItemStyle}>
          <span>{trail.name}</span>
          <button style={deleteButtonStyle} onClick={() => onDeleteTrail(trail.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: 70,
  left: 12,
  zIndex: 3,
  width: 260,
  background: "rgba(15, 23, 42, 0.95)",
  borderRadius: 10,
  padding: 16,
  color: "#e2e8f0",
  fontFamily: "system-ui, sans-serif",
};

const panelTitleStyle: React.CSSProperties = { margin: "0 0 8px", fontSize: 15 };
const panelHintStyle: React.CSSProperties = { margin: "0 0 12px", fontSize: 12, color: "#94a3b8" };

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#94a3b8",
  marginBottom: 10,
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: 4,
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #334155",
  background: "#0f172a",
  color: "#e2e8f0",
  fontSize: 13,
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#2a9d8f",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
  flex: 1,
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "#94a3b8",
  border: "1px solid #334155",
  borderRadius: 6,
  padding: "8px 14px",
  fontSize: 13,
  cursor: "pointer",
};

const toastStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 16,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 3,
  background: "#0f172a",
  color: "#fff",
  padding: "10px 16px",
  borderRadius: 8,
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
  cursor: "pointer",
};

const listItemStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 0",
  borderBottom: "1px solid #1e293b",
};

const deleteButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#f87171",
  fontSize: 16,
  cursor: "pointer",
  lineHeight: 1,
};
