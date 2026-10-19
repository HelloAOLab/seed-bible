import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    verseLink: {
      /**
       * Links the selection to verse `verse` of the step's passage. With
       * nothing selected, inserts "v13" as the link.
       */
      setVerseLink: (verse: number, fallbackText?: string) => ReturnType;
      /** Removes a verse link from the selection. */
      unsetVerseLink: () => ReturnType;
    };
  }
}

const VERSE_HREF = /^#verse-(\d+)$/;

/** The verse a verse link's href names, or null for any other href. */
export function parseVerseLinkHref(href: string | null): number | null {
  const match = href ? VERSE_HREF.exec(href) : null;
  if (!match) {
    return null;
  }
  const verse = Number(match[1]);
  return Number.isInteger(verse) && verse > 0 ? verse : null;
}

/**
 * A link from a note to a verse of the passage it sits beside, saved as
 * `<a class="sb-verse-link" href="#verse-N">`: a fragment href the sanitizer
 * keeps, which the player turns into a scroll to that verse in the reader.
 */
export const VerseLinkMark = Mark.create({
  name: "verseLink",
  inclusive: false,

  addAttributes() {
    return {
      verse: {
        default: null,
        parseHTML: (element) =>
          parseVerseLinkHref(element.getAttribute("href")),
        renderHTML: (attributes) =>
          attributes.verse ? { href: `#verse-${attributes.verse}` } : {},
      },
    };
  },

  parseHTML() {
    // Ahead of any plain link rule (priority 50), which would otherwise
    // claim the anchor and lose the verse.
    return [{ tag: "a.sb-verse-link", priority: 100 }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, { class: "sb-verse-link" }),
      0,
    ];
  },

  addCommands() {
    return {
      setVerseLink:
        (verse, fallbackText) =>
        ({ chain, state }) => {
          const { from, to } = state.selection;
          if (from === to) {
            const text = fallbackText ?? `v${verse}`;
            return chain()
              .insertContent({
                type: "text",
                text,
                marks: [{ type: this.name, attrs: { verse } }],
              })
              .run();
          }
          return chain().setMark(this.name, { verse }).run();
        },
      unsetVerseLink:
        () =>
        ({ chain }) =>
          chain().extendMarkRange(this.name).unsetMark(this.name).run(),
    };
  },
});

export default VerseLinkMark;
