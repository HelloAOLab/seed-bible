import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    scriptureEmbed: {
      /** Inserts a passage, named by `reference` ("Genesis 16:7-13"), as a block. */
      insertScriptureEmbed: (reference: string) => ReturnType;
    };
  }
}

/**
 * A passage embedded in a text item or note, saved as
 * `<blockquote class="sb-scripture-embed"><p class="sb-scripture-embed-ref">
 * Genesis 16:7-13</p></blockquote>`: plain markup the sanitizer keeps, with
 * the reference as text. The editor shows the reference; the player reads
 * the reference back and fills in the verses beneath it.
 */
export const ScriptureEmbedNode = Node.create({
  name: "scriptureEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      reference: {
        default: "",
        parseHTML: (element) =>
          element
            .querySelector(".sb-scripture-embed-ref")
            ?.textContent?.trim() ??
          element.textContent?.trim() ??
          "",
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    // Ahead of the starter kit's plain blockquote rule (priority 50), which
    // would otherwise claim the element first.
    return [{ tag: "blockquote.sb-scripture-embed", priority: 100 }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, { class: "sb-scripture-embed" }),
      [
        "p",
        { class: "sb-scripture-embed-ref" },
        node.attrs.reference as string,
      ],
    ];
  },

  addCommands() {
    return {
      insertScriptureEmbed:
        (reference) =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { reference } })
            .run(),
    };
  },
});

export default ScriptureEmbedNode;
