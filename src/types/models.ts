export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
}

export interface Photo {
  id: string;
  url: string;
  filename: string;
  pointId: string;
  createdAt: string;
}

export interface Point {
  id: string;
  name: string;
  description: string | null;
  lat: number;
  lng: number;
  categoryId: string | null;
  category: Category | null;
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
}

export type TrailGeometry = GeoJSON.LineString | GeoJSON.Polygon;
export type TrailGeoJSON = GeoJSON.Feature<TrailGeometry>;

export interface Trail {
  id: string;
  name: string;
  description: string | null;
  geojson: TrailGeoJSON;
  categoryId: string | null;
  category: Category | null;
  createdAt: string;
  updatedAt: string;
}
