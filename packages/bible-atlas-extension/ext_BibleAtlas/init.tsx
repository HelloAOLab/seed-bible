import { effect, signal } from "@preact/signals";
import { registerExtension } from "seed-bible";
import { MaterialIcon } from "seed-bible/components";
import {
  BIBLE_ATLAS_ORIGIN,
  fetchEntities,
  fetchVisualizationCatalog,
  type AtlasEntity,
  type AtlasVisualization,
} from "./bibleAtlasApi";

const ICON_BY_TYPE: Record<string, string> = {
  person: "person",
  place: "place",
  event: "event",
  visualization: "graph_3",
};

const SKELETON_ROW_STYLE = `
  @keyframes bible-atlas-skeleton-pulse {
    0%, 100% { opacity: 0.1; }
    50% { opacity: 0.25; }
  }
  .bible-atlas-skeleton-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
  }
  .bible-atlas-skeleton-dot,
  .bible-atlas-skeleton-bar {
    background: currentColor;
    opacity: 0.15;
    animation: bible-atlas-skeleton-pulse 1.2s ease-in-out infinite;
  }
  .bible-atlas-skeleton-dot {
    width: 1.25rem;
    height: 1.25rem;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .bible-atlas-skeleton-bar {
    height: 0.75rem;
    border-radius: 0.25rem;
    flex: 1;
  }
`;

function SkeletonIcon({ barWidth }: { barWidth: string }) {
  return (
    <span className="bible-atlas-skeleton-row">
      <style>{SKELETON_ROW_STYLE}</style>
      <span className="bible-atlas-skeleton-dot" />
      <span
        className="bible-atlas-skeleton-bar"
        style={{ maxWidth: barWidth }}
      />
    </span>
  );
}

// Placeholder rows shown in the verse toolbar menu while fetchEntities() is
// in flight, so the tool can appear the instant a verse is selected instead
// of popping in once results arrive.
const SKELETON_ITEMS = [
  {
    id: "bible-atlas-skeleton-1",
    title: "",
    icon: () => <SkeletonIcon barWidth="70%" />,
    isDisabled: () => true,
  },
  {
    id: "bible-atlas-skeleton-2",
    title: "",
    icon: () => <SkeletonIcon barWidth="45%" />,
    isDisabled: () => true,
  },
];

export default function initBibleAtlasExtension() {
  registerExtension({
    id: "bible-atlas",
    init: function* (context) {
      const entities = signal<AtlasEntity[]>([]);
      const entitiesLoading = signal(false);
      // Bumped per selection so a slow response for an older selection can't
      // overwrite the entities of a newer one.
      let requestId = 0;

      yield effect(() => {
        const selected =
          context.app.currentReadingState.value?.tab.readingState.selectedVerses
            .value ?? [];
        const id = ++requestId;
        const first = selected[0];
        if (!first) {
          entities.value = [];
          entitiesLoading.value = false;
          return;
        }
        entitiesLoading.value = true;
        fetchEntities(
          first.bookId,
          first.chapterNumber,
          selected.map((v) => v.verse.number)
        ).then((result) => {
          if (id === requestId) {
            entities.value = result;
            entitiesLoading.value = false;
          }
        });
      });

      const openAtlasPane = (
        title: string,
        embed: { path: string; title: string }
      ) => {
        const src = BIBLE_ATLAS_ORIGIN + embed.path;
        context.panes.openPane({
          id: "bible-atlas-pane",
          placement: "floating",
          title,
          component: () => (
            <iframe
              src={src}
              title={embed.title}
              referrerPolicy="strict-origin-when-cross-origin"
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          ),
        });
      };

      // The catalog is global, not tied to the current verse, so it's fetched
      // once at startup rather than lazily on tool activation (registerToolbarTool
      // treats onSelect and getItems as mutually exclusive, so there's no
      // load-on-first-open hook to use instead).
      const catalog = signal<AtlasVisualization[]>([]);
      fetchVisualizationCatalog().then((result) => {
        catalog.value = result;
      });

      yield context.tools.registerToolbarTool({
        id: "bible-atlas-catalog",
        priority: 110,
        title: {
          key: "browse-title",
          ns: "bible-atlas",
          defaultValue: "Bible Atlas",
        },
        icon: () => <MaterialIcon>public</MaterialIcon>,
        isVisible: () => catalog.value.length > 0,
        getItems: () =>
          catalog.value.map((viz) => ({
            id: `bible-atlas-catalog-${viz.id}`,
            title: viz.title,
            icon: () => <MaterialIcon>graph_3</MaterialIcon>,
            onSelect: () => openAtlasPane(viz.title, viz.embed),
          })),
      });

      const openEntityPane = (entity: AtlasEntity) =>
        openAtlasPane(entity.name, entity.embed);

      yield context.tools.registerVerseToolbarTool({
        id: "bible-atlas",
        priority: 110,
        title: { key: "title", ns: "bible-atlas", defaultValue: "Bible Atlas" },
        icon: () => <MaterialIcon>travel_explore</MaterialIcon>,
        isVisible: () => entitiesLoading.value || entities.value.length > 0,
        getItems: () =>
          entitiesLoading.value && entities.value.length === 0
            ? SKELETON_ITEMS
            : entities.value.map((entity) => ({
                id: `bible-atlas-${entity.id}`,
                title: entity.name,
                icon: () => (
                  <MaterialIcon>
                    {ICON_BY_TYPE[entity.type] ?? "public"}
                  </MaterialIcon>
                ),
                onSelect: () => openEntityPane(entity),
              })),
      });
    },
  });
}
