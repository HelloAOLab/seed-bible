/** A heading of a definition's outline, with the headings nested under it. */
export interface OutlineItem {
  /** The heading's marker without the underscores, such as "I.", "1." or "(a)". */
  marker: string;
  text: string;
  children: OutlineItem[];
}

export type DefinitionBlock =
  | { type: "paragraph"; text: string }
  | { type: "outline"; items: OutlineItem[] };

const HEADING_PATTERN = /^__(\S+)\s*([\s\S]*)$/;

/**
 * How deep a marker sits in the lexicon's outline. Abbott-Smith's Greek
 * entries nest Roman numerals, then numbers, then letters, then numbers in
 * brackets, then Greek letters: "__I.", "__1.", "__(a)", "__(1)", "__(α)".
 */
function markerRank(marker: string): number {
  if (/^[IVXL]+\.$/.test(marker)) {
    return 0;
  }
  if (/^\d+\.?$/.test(marker)) {
    return 1;
  }
  if (/^\([a-z]+\)$/.test(marker)) {
    return 2;
  }
  if (/^\(\d+\)$/.test(marker)) {
    return 3;
  }
  return 4;
}

/**
 * Splits a lexicon definition into paragraphs and outlines, for rendering as
 * text and lists. Never produces markup: the definition is data from another
 * site, so it is only ever shown as text.
 *
 * Blank lines separate paragraphs. A paragraph starting with "__" and a
 * marker is an outline heading; consecutive headings form one outline, each
 * nested under the nearest earlier heading of a shallower kind.
 */
export function parseDefinition(definition: string): DefinitionBlock[] {
  const blocks: DefinitionBlock[] = [];
  let stack: { rank: number; item: OutlineItem }[] = [];
  let outline: OutlineItem[] | null = null;

  for (const raw of definition.split(/\n\s*\n/)) {
    const paragraph = raw.trim();
    if (!paragraph) {
      continue;
    }

    const heading = HEADING_PATTERN.exec(paragraph);
    if (!heading) {
      outline = null;
      stack = [];
      blocks.push({
        type: "paragraph",
        text: stripStrayUnderscores(paragraph),
      });
      continue;
    }

    const [, marker = "", text = ""] = heading;
    const rank = markerRank(marker);
    const item: OutlineItem = {
      marker,
      text: stripStrayUnderscores(text.trim()),
      children: [],
    };

    if (!outline) {
      outline = [];
      blocks.push({ type: "outline", items: outline });
    }

    while (stack.length > 0 && stack[stack.length - 1]!.rank >= rank) {
      stack.pop();
    }
    const parent = stack[stack.length - 1];
    (parent ? parent.item.children : outline).push(item);
    stack.push({ rank, item });
  }

  return blocks;
}

/** Drops heading underscores that turn up mid-line, such as "{ __(b) aor.". */
function stripStrayUnderscores(text: string): string {
  return text.replace(/(^|\s)__(?=\S)/g, "$1");
}
