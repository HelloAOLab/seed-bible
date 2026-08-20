import { Mark, mergeAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { MarkType } from "@tiptap/pm/model";
import { parseVerseReferences } from "../../managers/BibleDataManager";
import { getVerseReferenceLinkHref } from "../../app/verseReferenceLink";

/**
 * Re-scans every textblock touched by a transaction for verse references and
 * (re)applies the `verseReference` mark to exactly the ranges that currently
 * match — so edits inside an already-linked reference un-link it once it no
 * longer parses, and freshly typed references get linked as they're
 * completed.
 *
 * Scans one textblock at a time (rather than flattening a multi-block touched
 * range into a single string via `doc.textBetween`) because a block
 * separator character doesn't correspond 1:1 to the extra document position
 * between sibling blocks — match offsets computed against a flattened
 * multi-block string would land on the wrong absolute positions. A verse
 * reference never spans a block boundary, so per-block scanning loses
 * nothing.
 */
function verseReferencePlugin(markType: MarkType) {
  return new Plugin({
    key: new PluginKey("verseReferenceAutolink"),
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some((transaction) => transaction.docChanged)) {
        return null;
      }

      let minFrom = Infinity;
      let maxTo = -Infinity;
      for (const transaction of transactions) {
        for (const stepMap of transaction.mapping.maps) {
          stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
            minFrom = Math.min(minFrom, newStart);
            maxTo = Math.max(maxTo, newEnd);
          });
        }
      }
      if (minFrom === Infinity) {
        return null;
      }

      const docSize = newState.doc.content.size;
      minFrom = Math.max(0, Math.min(minFrom, docSize));
      maxTo = Math.max(0, Math.min(maxTo, docSize));

      const tr = newState.tr;
      newState.doc.nodesBetween(minFrom, maxTo, (node, pos) => {
        if (!node.isTextblock) {
          return;
        }
        const contentFrom = pos + 1;
        const contentTo = contentFrom + node.content.size;
        const matches = parseVerseReferences(node.textContent);

        tr.removeMark(contentFrom, contentTo, markType);
        for (const match of matches) {
          tr.addMark(
            contentFrom + match.start,
            contentFrom + match.end,
            markType.create({ href: getVerseReferenceLinkHref(match.ref) })
          );
        }
      });

      tr.setMeta("addToHistory", false);
      return tr.steps.length > 0 ? tr : null;
    },
  });
}

/**
 * Auto-links Bible verse references (e.g. "John 3:16") as they're typed into
 * the annotation comment editor, turning them into real `<a>` elements that
 * are saved as part of the comment's HTML. Independent of
 * `@tiptap/extension-link` so it never interacts with (or needs to disable)
 * that extension's own autolink/paste-link behavior.
 */
export const VerseReferenceMark = Mark.create({
  name: "verseReference",
  // Typing right after a linked reference shouldn't extend the link onto it.
  inclusive: false,

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: (attributes) => {
          if (!attributes.href) {
            return {};
          }
          return { href: attributes.href };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "a.sb-verse-reference-link" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, { class: "sb-verse-reference-link" }),
      0,
    ];
  },

  addProseMirrorPlugins() {
    return [verseReferencePlugin(this.type)];
  },
});

export default VerseReferenceMark;
