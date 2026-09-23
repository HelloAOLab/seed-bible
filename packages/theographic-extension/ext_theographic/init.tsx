import { registerExtension, type SeedBibleState } from "seed-bible";
import {
  EVENT_CONTENT_TYPE,
  PERSON_CONTENT_TYPE,
  PLACE_CONTENT_TYPE,
  THEOGRAPHIC_EXTENSION_ID,
} from "./contentTypes";
import type { VerseRef } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type { LocationsExtensionApi } from "@seed-bible/locations-extension";
import {
  createIndexedDbTheographicStore,
  createTheographicClient,
  createTheographicDiscoverProvider,
  type ReferenceOrigin,
} from "./provider";

/** The locations extension's id, under which its API reaches `init`. */
const LOCATIONS_EXTENSION_ID = "ext_locations";

/**
 * Opens `ref` in the tab the card was showing, rather than in a new one.
 *
 * `openVerseReference` navigates the *selected* tab in place. With several
 * panes open the panel a reader clicked in can belong to a tab that isn't
 * selected, so that tab is selected first — otherwise a mention in another
 * chapter would load into whichever pane last had focus. Two panes can show
 * the same chapter in different translations, so the translation has to
 * match too.
 */
export function openInSameTab(
  context: SeedBibleState,
  ref: VerseRef,
  origin?: ReferenceOrigin
): void {
  if (origin) {
    const { tabs } = context;
    const isShowingOrigin = (tab: (typeof tabs.tabs.value)[number]) =>
      tab.readingState.translationId.value === origin.translationId &&
      tab.readingState.bookId.value === origin.book &&
      tab.readingState.chapterNumber.value === origin.chapter;

    const selected = tabs.tabs.value.find(
      (tab) => tab.id === tabs.selectedTabId.value
    );
    if (!selected || !isShowingOrigin(selected)) {
      const owner = tabs.tabs.value.find(isShowingOrigin);
      if (owner) {
        tabs.selectTab(owner.id);
      }
    }
  }
  void context.app.openVerseReference(ref);
}

export default function initTheographicExtension() {
  registerExtension({
    id: THEOGRAPHIC_EXTENSION_ID,
    // Places are drawn from the locations extension's GeoJSON files where it
    // has one, found through its API rather than by reading its data directly.
    dependencies: [LOCATIONS_EXTENSION_ID],
    init: function* (context: SeedBibleState, dependencies) {
      const locations = dependencies[LOCATIONS_EXTENSION_ID] as
        | LocationsExtensionApi
        | undefined;

      yield context.discover.registerContentType({
        id: PERSON_CONTENT_TYPE,
        title: {
          key: "people",
          ns: "theographic-extension",
          defaultValue: "People",
        },
        hiddenByDefault: true,
        layout: "custom",
        priority: 100,
      });
      yield context.discover.registerContentType({
        id: PLACE_CONTENT_TYPE,
        title: {
          key: "places",
          ns: "theographic-extension",
          defaultValue: "Places",
        },
        hiddenByDefault: true,
        layout: "custom",
        priority: 110,
      });
      yield context.discover.registerContentType({
        id: EVENT_CONTENT_TYPE,
        title: {
          key: "events",
          ns: "theographic-extension",
          defaultValue: "Events",
        },
        hiddenByDefault: true,
        layout: "custom",
        priority: 120,
      });

      yield context.discover.registerDiscoverProvider(
        createTheographicDiscoverProvider({
          client: createTheographicClient(
            context.bibleData.api.endpoint,
            createIndexedDbTheographicStore()
          ),
          data: context.bibleData,
          onReferenceClick: (ref, origin) =>
            openInSameTab(context, ref, origin),
          panes: context.panes,
          locations,
          isMobile: context.app.isMobile,
        })
      );
    },
  });
}
