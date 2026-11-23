import type { DiscoverContentTypeDefinition } from "./DiscoverManager";

/**
 * Content types any provider can file results under — built-in extensions
 * and sandboxed ones alike — so that, say, every provider's people land in
 * one "People" section instead of one each. They're only registered while
 * someone holds them; see `DiscoverManager.retainSharedContentTypes`.
 */
export const SHARED_CONTENT_TYPES = {
  person: "person",
  place: "place",
  event: "event",
  group: "group",
  object: "object",
  topic: "topic",
  video: "video",
  website: "website",
} as const;

/**
 * People, places and the like are hidden by default: datasets like
 * Theographic list dozens per chapter, which would bury the reader's own
 * notes in the "All" view.
 */
export const SHARED_CONTENT_TYPE_DEFINITIONS: readonly DiscoverContentTypeDefinition[] =
  [
    {
      id: SHARED_CONTENT_TYPES.person,
      title: { key: "discover-people", defaultValue: "People" },
      hiddenByDefault: true,
      priority: 100,
    },
    {
      id: SHARED_CONTENT_TYPES.place,
      title: { key: "discover-places", defaultValue: "Places" },
      hiddenByDefault: true,
      priority: 110,
    },
    {
      id: SHARED_CONTENT_TYPES.event,
      title: { key: "discover-events", defaultValue: "Events" },
      hiddenByDefault: true,
      priority: 120,
    },
    {
      id: SHARED_CONTENT_TYPES.group,
      title: { key: "discover-groups", defaultValue: "Groups" },
      hiddenByDefault: true,
      priority: 130,
    },
    {
      id: SHARED_CONTENT_TYPES.object,
      title: { key: "discover-objects", defaultValue: "Objects" },
      hiddenByDefault: true,
      priority: 140,
    },
    {
      id: SHARED_CONTENT_TYPES.topic,
      title: { key: "discover-topics", defaultValue: "Topics" },
      hiddenByDefault: true,
      priority: 150,
    },
    {
      id: SHARED_CONTENT_TYPES.video,
      title: { key: "discover-videos", defaultValue: "Videos" },
      priority: 200,
    },
    {
      id: SHARED_CONTENT_TYPES.website,
      title: { key: "discover-websites", defaultValue: "Websites" },
      priority: 210,
    },
  ];
