import { z } from "zod";

export const GEO_JSON_FEATURE_SCHEMA = z.object({
  type: z.literal("Feature"),
  geometry: z.object({
    type: z.string(),
    coordinates: z.array(z.number()).optional(),
  }),
  bbox: z.array(z.number()).length(4).optional(),
});

export const GEO_JSON_FEATURE_COLLECTION_SCHEMA = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(GEO_JSON_FEATURE_SCHEMA),
  bbox: z.array(z.number()).length(4).optional(),
});

export const GEO_JSON_SCHEMA = z.discriminatedUnion("type", [
  GEO_JSON_FEATURE_SCHEMA,
  GEO_JSON_FEATURE_COLLECTION_SCHEMA,
]);

export interface GeoJsonBounds {
  coordinates: [number, number];
  bbox: number[] | null;
  dh?: number;
}

export function getBoundsForGeoJson(geojson: unknown): GeoJsonBounds | null {
  const geo = GEO_JSON_SCHEMA.safeParse(geojson);
  if (!geo.success) {
    console.error("Invalid GeoJSON:", geo.error);
    return null;
  }
  if (geo.data.type === "FeatureCollection") {
    if (!geo.data.bbox) {
      console.error("GeoJSON FeatureCollection is missing bbox");
      return null;
    }
    const bbox = geo.data.bbox;
    const dx = angularDifference(bbox[0]!, bbox[2]!);
    const dy = angularDifference(bbox[1]!, bbox[3]!);
    const dh = Math.sqrt(dx * dx + dy * dy);
    const xPos = bbox[2]! + dx * 0.5;
    const yPos = bbox[3]! + dy * 0.5;

    return {
      coordinates: [yPos, xPos],
      bbox: bbox,
      dh,
    };
  } else if (geo.data.type === "Feature") {
    return {
      coordinates: geo.data.geometry.coordinates as [number, number],
      bbox: geo.data.bbox ?? null,
    };
  }

  return null;
}

function angularDifference(targetA: number, sourceA: number) {
  targetA %= 360;
  sourceA %= 360;
  return ((targetA - sourceA + 180) % 360) - 180;
}
