import type { ChapterVerse } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { GeoJsonObject } from "@packages/seed-bible/seed-bible/managers/MapManager";
import locationData from "./locations.json";

export interface PlaceData {
  place: string;
  geojson: string;
}

const locations = locationData as Record<string, PlaceData>;

export function findLocationsInText(text: string): PlaceData[] {
  const foundPlaces: PlaceData[] = [];
  const seen = new Set<string>();
  for (const word of text.toLowerCase().split(/[^\w]+/)) {
    const place = locations[word];
    if (place && !seen.has(place.place)) {
      seen.add(place.place);
      foundPlaces.push(place);
    }
  }
  return foundPlaces;
}

export function findLocationsInVerses(verses: ChapterVerse[]): PlaceData[] {
  let text = "";
  for (const verse of verses) {
    for (const content of verse.content) {
      if (typeof content === "string") {
        text += content;
      } else if ("text" in content) {
        text += content.text;
      }
    }
  }
  return findLocationsInText(text);
}

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
  'Places: <a href="https://www.openbible.info/geo/">OpenBible.info</a> (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>)';

/**
 * The credits a map of this place has to show, as HTML. The hand-built files
 * are this project's own, so only OpenBible's need one.
 */
export function getPlaceAttribution(place: PlaceData): string[] {
  return isHandBuilt(place) ? [] : [OPENBIBLE_ATTRIBUTION];
}

/**
 * A place's fetched GeoJSON in standard `[longitude, latitude]` order, with
 * numbers for coordinates.
 *
 * The hand-built files store each point the other way round, as text — Acco
 * is `["32.9213", "35.0875"]` — because the CasualOS map they were made for
 * read them that way. They're flipped here rather than in their repo, which
 * that map still reads live. OpenBible's files are already standard and come
 * back as given.
 */
export function toStandardGeoJson(
  place: PlaceData,
  geojson: unknown
): GeoJsonObject {
  return (
    isHandBuilt(place) ? flipPositions(geojson) : geojson
  ) as GeoJsonObject;
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
  if (!Array.isArray(coordinates)) {
    return coordinates;
  }
  if (coordinates.length > 0 && Array.isArray(coordinates[0])) {
    return coordinates.map(flipCoordinates);
  }
  const [latitude, longitude, ...rest] = coordinates.map(Number);
  return [longitude, latitude, ...rest];
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
