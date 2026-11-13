import { useSignal, type ReadonlySignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { GeoJsonObject } from "geojson";
import { Skeleton } from "seed-bible/components";
import { useI18n } from "seed-bible/i18n";
import type { ModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { PanesManager } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import { GeoJsonMap } from "./GeoJsonMap";
import { leafletLoader } from "./leaflet";
import { addMapTranslations } from "./translations";

/** What a map draws, and the credits that data needs. */
export interface MapData {
  /** In standard `[longitude, latitude]` order. */
  data: GeoJsonObject;
  /** Credits for the data, as HTML, shown beside the base map's. */
  attribution?: readonly string[];
}

/** Where a map opens: a floating pane, or on a phone, a sheet. */
export interface MapHost {
  panes: PanesManager;
  /**
   * With `isMobile`, where the map opens on a phone. A pane there fills the
   * screen and closes the others, while a sheet sits over them and leaves them
   * as they were. Without, the map always opens in a pane.
   */
  modals?: ModalManager;
  isMobile?: ReadonlySignal<boolean>;
}

export interface OpenMapOptions {
  /** One map per id: opening one that's already open brings it forward. */
  id: string;
  title: string;
  /** The place's name, labelled on the map and used as its accessible name. */
  label: string;
  /** Fetches what to draw. Null, or a rejection, shows that there's nothing to. */
  load: () => Promise<MapData | null>;
}

/** Opens a place's map in its own floating pane or sheet, loading its data there. */
export function openMap(host: MapHost, options: OpenMapOptions): void {
  const { panes, modals, isMobile } = host;
  const { id, title } = options;
  // Starts Leaflet's download alongside the place data rather than after.
  void leafletLoader.load().catch(() => undefined);

  if (isMobile?.peek() && modals) {
    if (!modals.modals.peek().some((modal) => modal.id === id)) {
      modals.openModal({
        id,
        title,
        content: () => (
          <div className="sb-map-sheet">
            <MapPane options={options} />
          </div>
        ),
        mobileSheet: true,
      });
    }
    return;
  }

  // Reopening would replace the pane's content, reloading the map and losing
  // where the reader had moved it.
  if (panes.panes.peek().some((pane) => pane.id === id)) {
    panes.selectPane(id);
    return;
  }
  panes.openPane({
    id,
    placement: "floating",
    title,
    component: () => <MapPane options={options} />,
  });
}

/**
 * Whether the map opened under `id` is open, in its pane or sheet.
 *
 * Reads the pane and modal lists themselves, so it stays right however the
 * map goes away: its close button, being displaced, or closed from code. Read
 * during render, it re-renders when that changes.
 */
export function isMapOpen(
  host: Pick<MapHost, "panes" | "modals">,
  id: string
): boolean {
  return (
    host.panes.panes.value.some((pane) => pane.id === id) ||
    (host.modals?.modals.value.some((modal) => modal.id === id) ?? false)
  );
}

type PaneData =
  | { status: "loading" }
  | { status: "loaded"; map: MapData }
  | { status: "empty" };

function MapPane(props: { options: OpenMapOptions }) {
  const { options } = props;
  addMapTranslations();
  const { t } = useI18n();
  const state = useSignal<PaneData>({ status: "loading" });

  useEffect(() => {
    let isCurrent = true;
    options.load().then(
      (map) => {
        if (isCurrent) {
          state.value = map ? { status: "loaded", map } : { status: "empty" };
        }
      },
      (error: unknown) => {
        console.error("Failed to load map data for", options.label, error);
        if (isCurrent) {
          state.value = { status: "empty" };
        }
      }
    );
    return () => {
      isCurrent = false;
    };
  }, [options]);

  const current = state.value;
  if (current.status === "loading") {
    return <Skeleton shape="block" width="100%" height="100%" radius="0" />;
  }
  if (current.status === "empty") {
    return (
      <p className="sb-geojson-map-message">
        {t("place-unavailable", {
          ns: "maps",
          defaultValue: "This place can't be shown on the map.",
        })}
      </p>
    );
  }
  return (
    <GeoJsonMap
      data={current.map.data}
      label={options.label}
      attribution={current.map.attribution}
    />
  );
}
