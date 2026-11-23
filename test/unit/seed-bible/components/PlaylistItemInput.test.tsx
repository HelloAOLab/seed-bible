import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import {
  PlaylistItemInput,
  type PlaylistItemInputHandle,
} from "@packages/seed-bible/seed-bible/components/PlaylistItemInput/PlaylistItemInput";
import type { TranslationBook } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import type { PlaylistItemData } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const BOOKS = [
  {
    id: "JHN",
    name: "John",
    commonName: "John",
    title: null,
    order: 43,
    numberOfChapters: 21,
    firstChapterNumber: 1,
    totalNumberOfVerses: 879,
  } as TranslationBook,
];

describe("PlaylistItemInput", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("switches between scripture, text and link with the item type dropdown", () => {
    act(() => {
      render(
        <PlaylistItemInput books={BOOKS} onAdd={vi.fn()} onUpdate={vi.fn()} />,
        container
      );
    });
    const dropdown = container.querySelector<HTMLSelectElement>(
      'select[aria-label="Item type"]'
    )!;
    expect(dropdown.value).toBe("scripture");
    expect(container.querySelector('input[type="url"]')).toBeNull();

    act(() => {
      dropdown.value = "link";
      dropdown.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(dropdown.value).toBe("link");
    expect(container.querySelector('input[type="url"]')).not.toBeNull();
  });

  it("keeps a scripture item's fixed translation when it's edited", async () => {
    const onUpdate = vi.fn();
    const handle = createRef<PlaylistItemInputHandle>();
    act(() => {
      render(
        <PlaylistItemInput
          ref={handle}
          books={BOOKS}
          onAdd={vi.fn()}
          onUpdate={onUpdate}
          editItem={{
            type: "bible-verse",
            ref: { bookId: "JHN", chapter: 3 },
            translationId: "KJV",
          }}
          editScriptureText="John 4"
        />,
        container
      );
    });

    await act(async () => {
      container.querySelector<HTMLInputElement>("input")!.focus();
      await handle.current!.commit();
    });

    expect(onUpdate).toHaveBeenCalledWith({
      type: "bible-verse",
      ref: { bookId: "JHN", chapter: 4 },
      translationId: "KJV",
    } satisfies PlaylistItemData);
  });
});
