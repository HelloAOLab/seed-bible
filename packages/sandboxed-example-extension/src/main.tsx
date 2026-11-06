import { effect, useSignal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import {
  defineExtension,
  type SandboxContext,
  type SandboxDiscoverResult,
} from "seed-bible/extensions";

/*
 * `packages/seed-bible-refresh-example-extension`, ported to the sandbox: the
 * same tools, pane, Discover provider, settings, sensitive request and
 * portals, written against `sb` instead of `SeedBibleState`. Comments point
 * out where the sandboxed version has to differ.
 */

type SettingValue = string | number | boolean | null;

/** The settings the greeting pane shows, from `extension.json`. */
const GREETING_SETTINGS = [
  "greeting",
  "greetingSize",
  "subtitle",
  "showBanner",
  "repeatCount",
  "tone",
] as const;

/** Cross-references between the first chapters of Genesis and John. */
export function exampleDiscoverResults(
  bookId: string,
  chapter: number
): SandboxDiscoverResult[] {
  const pair = (from: string, to: string): SandboxDiscoverResult => ({
    type: "cross-reference",
    reference: { bookId: from, chapter: 1, verse: 1 },
    crossReference: { bookId: to, chapter: 1, verse: 1 },
  });
  if (chapter !== 1) return [];
  if (bookId === "JHN") return [pair("JHN", "GEN")];
  if (bookId === "GEN") return [pair("GEN", "JHN")];
  return [];
}

/**
 * Opens one of the two portals. They share a pane id, so opening either
 * replaces the other. Showing CasualOS is optional for this extension, so
 * it asks first, while the user is clicking.
 */
async function openPortal(
  sb: SandboxContext,
  portalType: "grid" | "map",
  title: string
) {
  if (!(await sb.permissions.request("embed:casualos"))) {
    await sb.app.toast(sb.i18n.t("portal-permission-declined"));
    return;
  }
  await sb.portals.open({
    id: "example-portal-pane",
    portalType,
    portal: portalType === "grid" ? "home" : "map_portal",
    placement: "floating",
    title,
  });
}

function GreetingPane({ sb }: { sb: SandboxContext }) {
  // Settings arrive by message, not by reading a signal while rendering,
  // so the pane shows them once they've loaded.
  const settings = useSignal<Record<string, SettingValue> | null>(null);
  useEffect(() => {
    void Promise.all(
      GREETING_SETTINGS.map(
        async (key) => [key, await sb.settings.get(key)] as const
      )
    ).then((values) => (settings.value = Object.fromEntries(values)));
  }, []);

  if (!settings.value) {
    return <p style={{ padding: 20 }}>{sb.i18n.t("loading")}</p>;
  }
  const { greeting, greetingSize, subtitle, showBanner, repeatCount, tone } =
    settings.value;
  return (
    <div style={{ padding: 20, color: "var(--sb-font-color, #333)" }}>
      {showBanner === true && (
        <div
          style={{
            marginBottom: 12,
            padding: "8px 12px",
            borderRadius: 8,
            background: "var(--sb-primary-color, #e07b4c)",
            color: "var(--sb-primary-font-color, #fff)",
          }}
        >
          {sb.i18n.t("example-banner")}
        </div>
      )}
      {typeof greeting === "string" && greeting && (
        <p
          style={{
            fontSize:
              typeof greetingSize === "number"
                ? `${greetingSize}rem`
                : undefined,
            fontWeight: tone === "bold" ? 700 : undefined,
            fontStyle: tone === "plain" ? "normal" : "italic",
          }}
        >
          {typeof repeatCount === "number"
            ? greeting.repeat(repeatCount)
            : greeting}
        </p>
      )}
      {typeof subtitle === "string" && subtitle && (
        <p style={{ opacity: 0.75 }}>{subtitle}</p>
      )}
      <button
        type="button"
        onClick={async () => {
          // The host adds the API key and client ID on the server, through
          // the user's proxy for httpbin.org; the values never reach here.
          try {
            const response = await sb.sensitive.fetch({
              url: "https://httpbin.org/post",
              method: "POST",
              body: { hello: "world" },
            });
            await sb.app.toast(
              sb.i18n.t("sensitive-result", undefined, {
                status: response.status,
              })
            );
          } catch (error) {
            await sb.app.toast(String(error));
          }
        }}
      >
        {sb.i18n.t("send-sensitive-request")}
      </button>
    </div>
  );
}

export default defineExtension({
  main: async (sb) => {
    const title = (key: string) => ({ key, defaultValue: sb.i18n.t(key) });

    // Needs `reading:position`: each request says which chapter is open.
    await sb.discover.registerProvider({
      id: "example-discover-provider",
      title: "Example Discover Provider",
      description: "An example discover provider that returns dummy results.",
      discover: (request) =>
        exampleDiscoverResults(request.bookId, request.chapter),
    });

    await sb.tools.registerToolbarTool({
      id: "my-example-tool",
      title: title("my-example-tool"),
      // Icons are data the host draws: a Material Symbols name or an SVG.
      icon: { material: "construction" },
      priority: 200,
      onSelect: () =>
        void sb.panes.open({
          view: "greeting",
          placement: "side",
          title: title("my-example-tool"),
        }),
    });

    await sb.tools.registerVerseToolbarTool({
      id: "my-verse-tool",
      title: title("my-verse-tool"),
      icon: { material: "format_quote" },
      priority: 200,
      // Items are a fixed list here; `update({ items })` changes them.
      items: (["item-1", "item-2"] as const).map((id, index) => ({
        id,
        title: title(id),
        icon: { material: index === 0 ? "looks_one" : "looks_two" },
        onSelect: () =>
          void sb.app.toast(
            sb.i18n.t("item-clicked", undefined, { item: sb.i18n.t(id) })
          ),
      })),
    });

    await sb.tools.registerBelowReaderTool({
      id: "my-below-reader-tool",
      title: title("my-below-reader-tool"),
      icon: { material: "south" },
      priority: 200,
    });

    await sb.tools.registerToolbarTool({
      id: "open-grid-portal",
      title: title("open-grid-portal"),
      icon: { material: "view_in_ar" },
      priority: 210,
      onSelect: () => openPortal(sb, "grid", sb.i18n.t("open-grid-portal")),
    });

    await sb.tools.registerToolbarTool({
      id: "open-map-portal",
      title: title("open-map-portal"),
      icon: { material: "map" },
      priority: 220,
      onSelect: () => openPortal(sb, "map", sb.i18n.t("open-map-portal")),
    });

    // Reacts to the reader moving, like the original's effect. The position
    // is a signal the host keeps current, since this extension may read it.
    effect(() => {
      const position = sb.reading.position.value;
      if (position) {
        console.log(
          "Current reading state in effect:",
          position.translationId,
          position.bookId,
          position.chapterNumber
        );
      }
    });

    // The original also returns `{ abc }` for other extensions to call.
    // A sandboxed extension can't export functions: nothing but messages
    // crosses its frame, and it can't declare dependencies yet.
  },

  views: {
    greeting: ({ sb }) => <GreetingPane sb={sb} />,
  },
});
