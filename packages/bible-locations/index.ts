import type { ChapterVerse } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
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

/** Where a place's GeoJSON file lives. */
export function getPlaceGeoJsonUrl(place: PlaceData): string {
  return place.place === place.geojson
    ? `https://raw.githubusercontent.com/Bored-Wizard/isreal_geojson/main/${place.geojson}.geojson`
    : `https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/geometry/${place.geojson}.geojson`;
}
