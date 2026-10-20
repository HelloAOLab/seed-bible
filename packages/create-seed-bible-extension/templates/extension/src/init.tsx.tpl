import { defineExtension } from "seed-bible/extensions";

// A starting point that shows how a sandboxed extension fits together. It
// runs in its own iframe, isolated from Seed Bible, and reaches the app only
// through `sb`, which checks every call against the permissions the user
// granted. For the whole API, see §7 of docs/developer-guide.md in the
// seed-bible repository.
export default defineExtension({
  // Runs once, in a hidden frame, when the extension starts.
  main: async (sb) => {
    await sb.tools.registerToolbarTool({
      id: "open",
      title: { key: "tool-title", defaultValue: "{{extensionId}}" },
      icon: { material: "star" },
      onSelect: async () => {
        // Seeing the passage is optional (see extension.json), so ask for it
        // here, while the user is clicking. If they say no, the pane still
        // opens; it just can't show where they are.
        await sb.permissions.request("reading:position");
        const opened = Number((await sb.storage.get("opened")) ?? 0) + 1;
        await sb.storage.set("opened", opened);
        await sb.panes.open({
          view: "main",
          placement: "side",
          title: { key: "tool-title", defaultValue: "{{extensionId}}" },
          props: { opened },
        });
      },
    });
  },

  // One entry per kind of pane. Each renders in a frame of its own, inside
  // a pane Seed Bible draws, and gets its own `sb`.
  views: {
    main: ({ sb, props }) => {
      const { opened } = props as { opened: number };
      const position = sb.reading.position.value;
      return (
        <div style={{ padding: "1rem" }}>
          <p>{sb.i18n.t("opened", undefined, { count: opened })}</p>
          <p>
            {position
              ? sb.i18n.t("reading", undefined, {
                  book: position.bookId ?? "",
                  chapter: position.chapterNumber ?? "",
                })
              : sb.i18n.t("not-reading")}
          </p>
        </div>
      );
    },
  },
});
