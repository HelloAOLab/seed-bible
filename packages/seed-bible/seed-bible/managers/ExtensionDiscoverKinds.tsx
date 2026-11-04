import { useI18n } from "../i18n";
import type {
  DiscoverContentType,
  DiscoverContentTypeDefinition,
  DiscoverManager,
} from "./DiscoverManager";
import type {
  SandboxDiscoverFact,
  SandboxDiscoverMetadataKind,
} from "../extensions/protocol";

/** The content type each sandboxed `metadata` kind is shown under. */
export const EXTENSION_METADATA_CONTENT_TYPES: Record<
  SandboxDiscoverMetadataKind,
  DiscoverContentType
> = {
  person: "extension_person",
  place: "extension_place",
  event: "extension_event",
  group: "extension_group",
  object: "extension_object",
  topic: "extension_topic",
};

export const EXTENSION_VIDEO_CONTENT_TYPE: DiscoverContentType =
  "extension_video";
export const EXTENSION_WEBSITE_CONTENT_TYPE: DiscoverContentType =
  "extension_website";

const EXTENSION_CONTENT_TYPES: readonly DiscoverContentTypeDefinition[] = [
  {
    id: EXTENSION_VIDEO_CONTENT_TYPE,
    title: { key: "discover-videos", defaultValue: "Videos" },
    priority: 200,
  },
  {
    id: EXTENSION_WEBSITE_CONTENT_TYPE,
    title: { key: "discover-websites", defaultValue: "Websites" },
    priority: 210,
  },
  {
    id: EXTENSION_METADATA_CONTENT_TYPES.person,
    title: { key: "discover-people", defaultValue: "People" },
    priority: 300,
  },
  {
    id: EXTENSION_METADATA_CONTENT_TYPES.place,
    title: { key: "discover-places", defaultValue: "Places" },
    priority: 310,
  },
  {
    id: EXTENSION_METADATA_CONTENT_TYPES.event,
    title: { key: "discover-events", defaultValue: "Events" },
    priority: 320,
  },
  {
    id: EXTENSION_METADATA_CONTENT_TYPES.group,
    title: { key: "discover-groups", defaultValue: "Groups" },
    priority: 330,
  },
  {
    id: EXTENSION_METADATA_CONTENT_TYPES.object,
    title: { key: "discover-objects", defaultValue: "Objects" },
    priority: 340,
  },
  {
    id: EXTENSION_METADATA_CONTENT_TYPES.topic,
    title: { key: "discover-topics", defaultValue: "Topics" },
    priority: 350,
  },
];

/**
 * Every sandboxed extension shares these types, so they're counted rather
 * than registered per provider: with two extensions installed, removing one
 * must not take the sections away from the other.
 */
type ContentTypeRegistry = Pick<DiscoverManager, "registerContentType">;

const retained = new WeakMap<
  ContentTypeRegistry,
  { count: number; unregister: () => void }
>();

/**
 * Registers the sections sandboxed results are shown in, for as long as at
 * least one caller holds them. Returns the release; calling it twice is safe.
 */
export function retainExtensionContentTypes(
  discover: ContentTypeRegistry
): () => void {
  let entry = retained.get(discover);
  if (!entry) {
    const unregisters = EXTENSION_CONTENT_TYPES.map((definition) =>
      discover.registerContentType(definition)
    );
    entry = {
      count: 0,
      unregister: () => unregisters.forEach((unregister) => unregister()),
    };
    retained.set(discover, entry);
  }
  const held = entry;
  held.count++;

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    held.count--;
    if (held.count === 0) {
      held.unregister();
      retained.delete(discover);
    }
  };
}

/** `url` if it's an `https:` link, normalized; otherwise undefined. */
export function httpsUrl(url: string): URL | undefined {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** `95` → `"1:35"`, `3725` → `"1:02:05"`. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Aliases and facts under a `metadata` card's description. */
export function MetadataDetails(props: {
  aliases?: readonly string[];
  facts?: readonly SandboxDiscoverFact[];
}) {
  const { t } = useI18n();
  const aliases = props.aliases ?? [];
  const facts = props.facts ?? [];
  if (aliases.length === 0 && facts.length === 0) {
    return null;
  }

  return (
    <dl className="sb-discover-facts">
      {aliases.length > 0 ? (
        <div className="sb-discover-fact">
          <dt>
            {t("discover-also-known-as", { defaultValue: "Also known as" })}
          </dt>
          <dd>{aliases.join(", ")}</dd>
        </div>
      ) : null}
      {facts.map((fact, index) => (
        <div key={index} className="sb-discover-fact">
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Where a `video` or `website` card leads, shown before the reader follows
 * it: the site's host name is the part an extension can't disguise.
 */
export function LinkDetails(props: {
  url: URL;
  author?: string;
  durationSeconds?: number;
}) {
  const parts = [
    props.author,
    props.url.host,
    props.durationSeconds != null
      ? formatDuration(props.durationSeconds)
      : undefined,
  ].filter((part): part is string => !!part);

  return <span className="sb-discover-link-details">{parts.join(" · ")}</span>;
}
