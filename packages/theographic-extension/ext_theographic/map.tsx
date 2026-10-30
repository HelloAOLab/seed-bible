import { useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { GeoJsonMap, MaterialIcon, Skeleton } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import type {
  findLocation,
  getPlaceAttribution,
  getPlaceGeoJsonUrl,
  PlaceData,
  toStandardGeoJson,
} from "@seed-bible/bible-locations";
import type {
  Feature,
  GeoJsonObject,
  MapManager,
  Point,
} from "@packages/seed-bible/seed-bible/managers/MapManager";
import type { PanesManager } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import { withoutQualifier } from "./names";
import type { TheographicClient, TheographicPlaceEntry } from "./provider";

/** A place as a GeoJSON point, `[longitude, latitude]` like all GeoJSON. */
export type PlaceGeoJsonFeature = Feature<
  Point,
  { id: string; name: string; featureType?: string }
>;

/**
 * Turns a place's coordinates into a GeoJSON point.
 *
 * Null when the dataset has no position for it — about 20 of its 1,274 places,
 * which callers use to decide there is nothing to show on a map.
 */
export function placeToGeoJson(
  place: TheographicPlaceEntry
): PlaceGeoJsonFeature | null {
  const { latitude, longitude } = place;
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
    properties: {
      id: place.name,
      name: place.name,
      ...(place.featureType ? { featureType: place.featureType } : {}),
    },
  };
}

/** The id a place's floating map pane is opened under, one per place. */
export function placePaneId(place: Pick<TheographicPlaceEntry, "id">): string {
  return `theographic-place-${place.id}`;
}

/**
 * Whether a place's map is currently open in its floating pane.
 *
 * Reads the pane list itself rather than tracking open/close here, so it stays
 * right however the pane goes away — its close button, being displaced, or
 * closed from code. Read during render, it re-renders the reader when that
 * changes.
 */
export function createIsPlaceOpen(
  panes: PanesManager | undefined
): (place: TheographicPlaceEntry) => boolean {
  if (!panes) {
    return () => false;
  }
  return (place) => {
    const id = placePaneId(place);
    return panes.panes.value.some((pane) => pane.id === id);
  };
}

/** The place lookup the map uses: `@seed-bible/bible-locations`, or a stand-in. */
export interface PlaceLocations {
  findLocation: typeof findLocation;
  getPlaceGeoJsonUrl: typeof getPlaceGeoJsonUrl;
  toStandardGeoJson: typeof toStandardGeoJson;
  getPlaceAttribution: typeof getPlaceAttribution;
}

/** Where a place's map data comes from, besides its own coordinates. */
export interface PlaceMapSources {
  /** Fetches, and caches, a place's GeoJSON file. */
  client?: Pick<TheographicClient, "getResource">;
  /** The known places' lookup. Without it, only coordinates are drawn. */
  locations?: PlaceLocations;
}

/**
 * The known-places entry for a place, or null when it has none.
 *
 * Theographic adds a trailing qualifier to tell same-named places apart
 * ("Bethel (of Palestine)"), which the known-places file doesn't use, so the
 * name is tried as given and then without it.
 */
export function findKnownLocation(
  name: string,
  locations: PlaceLocations | undefined
): PlaceData | null {
  if (!locations) {
    return null;
  }
  return (
    locations.findLocation(name) ??
    locations.findLocation(withoutQualifier(name))
  );
}

/** Whether there is anything to draw for a place: a known file or coordinates. */
export function canMapPlace(
  place: TheographicPlaceEntry,
  locations: PlaceLocations | undefined
): boolean {
  return (
    findKnownLocation(place.name, locations) !== null ||
    placeToGeoJson(place) !== null
  );
}

/** What a place's map draws, and the credits that data needs. */
export interface PlaceMapData {
  data: GeoJsonObject;
  attribution: string[];
}

/**
 * What to draw for a place.
 *
 * The known place's file when it has one — an outline or a curated point,
 * rather than the single coordinate the dataset carries — and a point built
 * from the coordinates otherwise, or when that file can't be fetched. Null
 * when there is nothing to draw at all.
 */
export async function resolvePlaceMapData(
  place: TheographicPlaceEntry,
  sources: PlaceMapSources
): Promise<PlaceMapData | null> {
  const { client, locations } = sources;
  const known = findKnownLocation(place.name, locations);
  if (known && client && locations) {
    try {
      const geojson = await client.getResource<unknown>(
        locations.getPlaceGeoJsonUrl(known)
      );
      return {
        data: locations.toStandardGeoJson(known, geojson),
        attribution: locations.getPlaceAttribution(known),
      };
    } catch {
      // Fall through to the coordinates.
    }
  }

  const point = placeToGeoJson(place);
  // The card these maps belong to already credits the dataset beneath them.
  return point ? { data: point, attribution: [] } : null;
}

type MapDataState = PlaceMapData | null | "loading";

/**
 * Loads a place's map data, again whenever the place changes.
 *
 * `key` stands in for `load` as the dependency: callers pass a fresh closure
 * every render, which would otherwise reload on each one.
 */
function useMapData(
  key: string,
  load: () => Promise<PlaceMapData | null>
): MapDataState {
  const mapData = useSignal<MapDataState>("loading");

  useEffect(() => {
    let isCurrent = true;
    mapData.value = "loading";
    void load().then((loaded) => {
      if (isCurrent) {
        mapData.value = loaded;
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [key]);

  return mapData.value;
}

/** A place's map, or a placeholder while its data loads. */
function PlaceMapView(props: {
  map: MapManager;
  place: TheographicPlaceEntry;
  mapData: PlaceMapData | "loading";
  inline?: boolean;
  controls?: ComponentChildren;
}) {
  const { map, place, mapData, inline, controls } = props;
  if (mapData === "loading") {
    return (
      <Skeleton
        shape="block"
        width="100%"
        height="100%"
        className="sb-theographic-map-loading"
      />
    );
  }
  return (
    <GeoJsonMap
      map={map}
      data={mapData.data}
      attribution={mapData.attribution}
      label={place.name}
      inline={inline}
      controls={controls}
    />
  );
}

/** A place's map filling its floating pane. */
function PlacePane(props: {
  map: MapManager;
  place: TheographicPlaceEntry;
  sources: PlaceMapSources;
}) {
  const { map, place, sources } = props;
  const { t } = useI18n("theographic-extension");
  const mapData = useMapData(place.id, () =>
    resolvePlaceMapData(place, sources)
  );

  if (mapData === null) {
    return (
      <p className="sb-theographic-card-hint">
        {t("map-unavailable", {
          defaultValue: "This place can't be shown on the map.",
        })}
      </p>
    );
  }
  return <PlaceMapView map={map} place={place} mapData={mapData} />;
}

/**
 * Opens a place's map in its own floating pane.
 *
 * Undefined without a `PanesManager` and `MapManager`, which is how the card
 * decides whether to offer the control at all.
 */
export function createOpenPlace(
  panes: PanesManager | undefined,
  map: MapManager | undefined,
  sources: PlaceMapSources = {}
): ((place: TheographicPlaceEntry) => void) | undefined {
  if (!panes || !map) {
    return undefined;
  }

  return (place) => {
    if (!canMapPlace(place, sources.locations)) {
      return;
    }

    // Starts Leaflet's download alongside the place data rather than after.
    void map.loadLeaflet().catch(() => undefined);

    panes.openPane({
      id: placePaneId(place),
      placement: "floating",
      title: place.name,
      component: () => <PlacePane map={map} place={place} sources={sources} />,
    });
  };
}

/** "33.0920, 44.1292" — the position shown on the inline map. */
export function formatCoordinates(
  latitude?: number,
  longitude?: number
): string | null {
  if (latitude == null || longitude == null) {
    return null;
  }
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/**
 * A place's map, inline in its card.
 *
 * The same map the floating pane draws, sized to sit in the card. Renders
 * nothing for a place there turns out to be nothing to draw for.
 */
export function PlaceMap(props: {
  map: MapManager;
  place: TheographicPlaceEntry;
  label: string;
  sources: PlaceMapSources;
  /** Opens this map in its own pane. Omit and no control is shown. */
  onOpen?: () => void;
  /** The control's accessible name, already translated. */
  openLabel?: string;
}) {
  const { map, place, label, sources, onOpen, openLabel } = props;
  const mapData = useMapData(place.id, () =>
    resolvePlaceMapData(place, sources)
  );

  if (mapData === null) {
    return null;
  }

  const coordinates = formatCoordinates(place.latitude, place.longitude);

  return (
    // A group rather than an image: it holds a real control as well.
    <div className="sb-theographic-map" role="group" aria-label={label}>
      <PlaceMapView
        map={map}
        place={place}
        mapData={mapData}
        inline
        controls={
          onOpen ? (
            <button
              type="button"
              className="sb-geojson-map-control sb-theographic-map-open"
              title={openLabel}
              aria-label={openLabel}
              onClick={onOpen}
            >
              <MaterialIcon>float_landscape_2</MaterialIcon>
            </button>
          ) : null
        }
      />
      {coordinates ? (
        <span className="sb-theographic-map-coords">{coordinates}</span>
      ) : null}
    </div>
  );
}
