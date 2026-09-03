import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Validação mínima de uma Feature GeoJSON (LineString ou Polygon). */
export function isValidTrailGeoJSON(value: unknown): value is {
  type: "Feature";
  geometry: {
    type: "LineString" | "Polygon";
    coordinates: unknown;
  };
  properties?: Record<string, unknown>;
} {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (obj.type !== "Feature") return false;
  if (typeof obj.geometry !== "object" || obj.geometry === null) return false;
  const geometry = obj.geometry as Record<string, unknown>;
  if (geometry.type !== "LineString" && geometry.type !== "Polygon") {
    return false;
  }
  return Array.isArray(geometry.coordinates);
}
