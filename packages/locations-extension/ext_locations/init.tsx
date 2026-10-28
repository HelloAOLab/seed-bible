import { computed } from "@preact/signals";
import { registerExtension } from "seed-bible";
import { LocationIcon, PortalComponent } from "seed-bible/components";
import {
  findLocationsInVerses,
  getPlaceGeoJsonUrl,
  type PlaceData,
} from "@seed-bible/bible-locations";
import geoImporterPattern from "virtual:@pattern/geo-importer";
import { v4 as uuid } from "uuid";

export default function initLocationsExtension() {
  console.log("Loaded locations extension", geoImporterPattern);

  registerExtension({
    id: "ext_locations",
    init: function* (context) {
      const foundPlaces = computed(() => {
        const readingState = context.app.currentReadingState.value;

        if (!readingState) {
          return [];
        }

        const selectedVerses =
          readingState.tab.readingState.selectedVerses.value;
        return findLocationsInVerses(selectedVerses.map((v) => v.verse));
      });

      const showPlaceOnMap = async (place: PlaceData) => {
        console.log("Show place!", place);

        const url = getPlaceGeoJsonUrl(place);
        const response = await fetch(url);

        if (response.status !== 200) {
          console.error(
            "Failed to fetch geojson data for place:",
            place,
            response
          );
          return;
        }

        const data = await response.text();

        // Generate the portal instance id once, here — not inside the pane's
        // render function — so re-renders (dragging/resizing the pane) reuse the
        // same `inst` and the map iframe keeps its document instead of
        // reloading.
        const inst = uuid();

        context.panes.openPane({
          placement: "floating",
          title: place.place,
          component: () => (
            <PortalComponent
              portal="map"
              portalType="map"
              pattern={geoImporterPattern}
              inst={inst}
              query={{
                mapData: data,
              }}
            />
          ),
        });
      };

      yield context.tools.registerVerseToolbarTool({
        id: "show-locations",
        title: { key: "title", ns: "ext_locations", defaultValue: "Locations" },
        icon: () => <LocationIcon />,
        isVisible: () => foundPlaces.value.length > 0,
        getItems: () => {
          return foundPlaces.value.map((place) => ({
            id: `show-location-${place.place}`,
            title: {
              key: "show-location-place",
              ns: "ext_locations",
              defaultValue: `Show ${place.place} on map`,
              options: { place: place.place },
            },
            icon: () => <span></span>,
            onSelect: async () => {
              await showPlaceOnMap(place);
            },
          }));
        },
        priority: 100,
      });
    },
  });
}
