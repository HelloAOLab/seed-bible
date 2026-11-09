import type { GeoJsonObject } from "geojson";
import locationData from "./locations.json";

export interface PlaceData {
  place: string;
  geojson: string;
}

const locations = locationData as Record<string, PlaceData>;

/** The entry for one place name, whatever its case, or null. */
export function findLocation(name: string): PlaceData | null {
  return locations[name.toLowerCase()] ?? null;
}

/**
 * Whether a place's file is one of the hand-built set (`isreal_geojson`) rather
 * than OpenBible's: their entries name the file after the place itself.
 */
function isHandBuilt(place: PlaceData): boolean {
  return place.place === place.geojson;
}

/** Where a place's GeoJSON file lives. */
export function getPlaceGeoJsonUrl(place: PlaceData): string {
  return isHandBuilt(place)
    ? `https://raw.githubusercontent.com/Bored-Wizard/isreal_geojson/main/${place.geojson}.geojson`
    : `https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/geometry/${place.geojson}.geojson`;
}

/** The credit OpenBible.info's Bible Geocoding Data asks for (CC BY 4.0). */
export const OPENBIBLE_ATTRIBUTION =
  'Places: <a href="https://www.openbible.info/geo/" target="_blank" rel="noopener noreferrer">OpenBible.info</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>)';

/**
 * The credits a map of this place has to show, as HTML. The hand-built files
 * are this project's own, so only OpenBible's need one.
 */
export function getPlaceAttribution(place: PlaceData): string[] {
  return isHandBuilt(place) ? [] : [OPENBIBLE_ATTRIBUTION];
}

/**
 * What a map should draw for a place, from its fetched file, in standard
 * `[longitude, latitude]` order with numbers for coordinates.
 *
 * The hand-built files store each point the other way round, as text — Acco
 * is `["32.9213", "35.0875"]` — because the CasualOS map they were made for
 * read them that way. They're flipped here rather than in their repo, which
 * that map still reads live.
 *
 * OpenBible's files are already standard, but hold several versions of each
 * place to choose from (see {@link selectOpenBibleFeatures}).
 */
export function toMapGeoJson(
  place: PlaceData,
  geojson: unknown
): GeoJsonObject {
  return (
    isHandBuilt(place)
      ? flipPositions(geojson)
      : selectOpenBibleFeatures(geojson)
  ) as GeoJsonObject;
}

/**
 * How strongly each of a region's confidence bands is shaded. They nest, so
 * the middle, where all of them overlap, comes out darkest.
 */
const BAND_SHADE = 0.07;

type OpenBibleFeature = {
  type: "Feature";
  geometry: { type: string; coordinates?: unknown } | null;
  properties?: { role?: string } & Record<string, unknown>;
};

/**
 * The features of an OpenBible file worth drawing, marked for `GeoJsonMap`.
 *
 * Each feature has a `role` (documented in the dataset's readme), and a file
 * holds several: the same outline from OpenStreetMap and from OpenBible, each
 * again simplified; a point for labelling a region; a circle for how precise a
 * point is. Drawn together they stack into doubled edges and rings. So:
 *
 * - A place with a known outline (an island, a lake, a province) gets one:
 *   OpenStreetMap's (`precise`) when there is one, in full.
 * - A region with no fixed border gets its confidence bands (`isobands`, 10%
 *   to 90% sure the region reached that far) as shading, darker where
 *   scholars are surer.
 * - A settlement gets its point, plus the outline of its ancient remains
 *   (`local`) as a detail the view doesn't frame, so it opens like any town.
 *
 * A file without roles comes back as given.
 */
function selectOpenBibleFeatures(geojson: unknown): unknown {
  const collection = geojson as { type?: string; features?: unknown };
  if (collection?.type !== "FeatureCollection") {
    return geojson;
  }
  const features = asArray(collection.features) as OpenBibleFeature[];
  const byRole = (...roles: string[]) =>
    roles
      .map((role) => features.find((f) => f.properties?.role === role))
      .find((feature) => feature !== undefined);

  const outline = byRole(
    "precise",
    "geometry",
    "simplified_precise",
    "simplified_geometry"
  );
  if (outline) {
    return { ...collection, features: [outline] };
  }

  const bands = byRole("isobands")?.geometry;
  if (bands?.type === "MultiPolygon" || bands?.type === "Polygon") {
    const polygons =
      bands.type === "Polygon"
        ? [bands.coordinates]
        : asArray(bands.coordinates);
    return {
      ...collection,
      features: polygons.map((coordinates) => ({
        type: "Feature",
        geometry: { type: "Polygon", coordinates },
        properties: { mapShade: BAND_SHADE },
      })),
    };
  }

  const point = byRole("point", "settlement", "center", "representative_point");
  if (!point) {
    return geojson;
  }
  const remains = byRole("local", "simplified_local");
  return {
    ...collection,
    features: remains
      ? [
          point,
          {
            ...remains,
            properties: { ...remains.properties, mapDetail: true },
          },
        ]
      : [point],
  };
}

/** Swaps the first two numbers of every position in a GeoJSON object. */
function flipPositions(value: unknown): unknown {
  if (typeof value !== "object" || value === null) {
    return value;
  }
  const object = value as Record<string, unknown>;
  switch (object.type) {
    case "FeatureCollection":
      return {
        ...object,
        features: asArray(object.features).map(flipPositions),
      };
    case "Feature":
      return { ...object, geometry: flipPositions(object.geometry) };
    case "GeometryCollection":
      return {
        ...object,
        geometries: asArray(object.geometries).map(flipPositions),
      };
    default:
      return "coordinates" in object
        ? { ...object, coordinates: flipCoordinates(object.coordinates) }
        : object;
  }
}

/** A position is an array of numbers; anything deeper is a list of them. */
function flipCoordinates(coordinates: unknown): unknown {
  // An empty list holds no position, not one missing both its numbers.
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return coordinates;
  }
  if (Array.isArray(coordinates[0])) {
    return coordinates.map(flipCoordinates);
  }
  const [latitude, longitude, ...rest] = coordinates.map(Number);
  return [longitude, latitude, ...rest];
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
