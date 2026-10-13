import { render } from "preact";
import type { ComponentChild } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { createPanes } from "@packages/seed-bible/seed-bible/managers/PanesManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { VerseRef } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type { CrossReference } from "@packages/references-extension/references/manager/interfaces";

export function ref(overrides: Partial<CrossReference> = {}): CrossReference {
  return { book: "GEN", chapter: 1, verse: 1, score: 1, ...overrides };
}

/** The book names the fake translation knows; anything else shows its id. */
const BOOKS = [
  { id: "GEN", name: "Genesis", commonName: "Genesis" },
  { id: "EXO", name: "Exodus", commonName: "Exodus" },
  { id: "RUT", name: "Ruth", commonName: "Ruth" },
  { id: "PSA", name: "Psalms", commonName: "Psalms" },
  { id: "ISA", name: "Isaiah", commonName: "Isaiah" },
  { id: "MAT", name: "Matthew", commonName: "Matthew" },
  { id: "JHN", name: "John", commonName: "John" },
  { id: "ROM", name: "Romans", commonName: "Romans" },
];

type ChapterContent = { type: string; number: number; content: unknown[] }[];

export interface FakeState {
  state: SeedBibleState;
  /** Every verse the app was asked to navigate to. */
  navigations: VerseRef[];
  /** Every tab the extension opened, with the options it opened it with. */
  openedTabs: { id: string; options: Record<string, unknown> }[];
  /** Every temporary verse decoration put on an opened tab. */
  decorations: { book: string; chapter: number; verses: number[] }[];
}

/**
 * The app as far as the extension reaches into it: the real pane manager, and
 * stand-ins for the reader's tabs, navigation and Bible data.
 *
 * `chapters` holds the text each `BOOK.chapter` returns; a chapter missing
 * from it fails to load, the way one missing from a translation does.
 */
export function createFakeState(options?: {
  chapters?: Record<string, ChapterContent>;
  isMobile?: boolean;
  /** Book names fail to load, leaving only book ids. */
  booksUnavailable?: boolean;
}): FakeState {
  const navigations: VerseRef[] = [];
  const openedTabs: FakeState["openedTabs"] = [];
  const decorations: FakeState["decorations"] = [];
  const isMobile = signal(options?.isMobile ?? false);
  const chapters = options?.chapters ?? {};
  const books = options?.booksUnavailable ? null : { books: BOOKS };

  const state = {
    panes: createPanes(isMobile),
    app: {
      isMobile,
      openVerseReference: async (verseRef: VerseRef) => {
        navigations.push(verseRef);
      },
      selectTab: () => {},
    },
    tabs: {
      addTab: (_: unknown, tabOptions: Record<string, unknown>) => {
        const tab = {
          id: `tab-${openedTabs.length + 1}`,
          options: tabOptions,
          readingState: {
            decorateVerses: (
              book: string,
              chapter: number,
              verses: number | number[]
            ) => {
              decorations.push({
                book,
                chapter,
                verses: Array.isArray(verses) ? verses : [verses],
              });
              return `decoration-${decorations.length}`;
            },
          },
        };
        openedTabs.push(tab);
        return tab;
      },
    },
    bibleData: {
      getCachedTranslationBooks: () => books,
      getTranslationBooks: async () => {
        if (!books) {
          throw new Error("Book names unavailable");
        }
        return books;
      },
      getTranslationBookChapter: async (
        _translationId: string,
        book: string,
        chapter: number
      ) => {
        const content = chapters[`${book}.${chapter}`];
        if (!content) {
          throw new Error(`No chapter loaded for ${book} ${chapter}`);
        }
        return { chapter: { content }, translation: { shortName: "WEB" } };
      },
    },
  } as unknown as SeedBibleState;

  return { state, navigations, openedTabs, decorations };
}

/** A one-verse chapter whose verse reads `text`. */
export function verseChapter(verse: number, text: string): ChapterContent {
  return [{ type: "verse", number: verse, content: [text] }];
}

export function renderInto(node: ComponentChild): HTMLElement {
  const container = document.createElement("div");
  document.body.appendChild(container);
  act(() => {
    render(node, container);
  });
  return container;
}

export async function waitForCondition(
  check: () => boolean,
  timeoutMs = 1000
): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(
        `waitForCondition timed out. Page: ${document.body.textContent}`
      );
    }
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
}

export function buttonNamed(
  container: ParentNode,
  name: string
): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) =>
      candidate.textContent?.trim() === name ||
      candidate.getAttribute("aria-label") === name ||
      candidate.getAttribute("title") === name
  );
  if (!button) {
    throw new Error(
      `No "${name}" button in: ${container.textContent ?? "(empty)"}`
    );
  }
  return button;
}

export function click(element: HTMLElement): void {
  act(() => {
    element.click();
  });
}
