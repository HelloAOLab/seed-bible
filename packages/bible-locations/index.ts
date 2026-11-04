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

/** Where a place's GeoJSON file lives. */
export function getPlaceGeoJsonUrl(place: PlaceData): string {
  return place.place === place.geojson
    ? `https://raw.githubusercontent.com/Bored-Wizard/isreal_geojson/main/${place.geojson}.geojson`
    : `https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/geometry/${place.geojson}.geojson`;
}
