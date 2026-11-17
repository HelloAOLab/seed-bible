import { render } from "preact";
import { act } from "preact/test-utils";
import type { Mock } from "vitest";
import { createDiscoverManager } from "@packages/seed-bible/seed-bible/managers/DiscoverManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  setupExtensionContext,
  unregisterExtension,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../seed-bible/testUtils/mockI18n");
  return mockI18nManager();
});

vi.mock(
  "@packages/default-content-extension/ext_DefaultContent/discoveredContent",
  () => ({
    findDiscoveredContentForChapter: vi.fn(() => [
      {
        item: {
          id: "curated-1",
          title: "Curated Title",
          author: "Curated Author",
          description: "Curated description",
          url: "https://youtu.be/abc123",
          imageUrl: "https://example.com/curated-thumb.jpg",
          references: [{ book: "GEN", chapter: 28 }],
        },
        reference: { book: "GEN", chapter: 28 },
      },
    ]),
    findBibleProjectContentForChapter: vi.fn(() => [
      {
        bookId: "GEN",
        chapter: 28,
        chapter_end: 28,
        section_title: "Bible Project Section",
        video: {
          id: 42,
          description: "Bible Project description",
          share_url: "https://bibleproject.com/share/42",
          images: { medium: "https://example.com/bp-thumb.jpg" },
          paths: { mp4: "https://example.com/bp-video.mp4" },
        },
      },
    ]),
  })
);

const { default: initDefaultContentExtension } =
  await import("@packages/default-content-extension/ext_DefaultContent/init");
const { findDiscoveredContentForChapter } =
  await import("@packages/default-content-extension/ext_DefaultContent/discoveredContent");

function createFakeContext(): SeedBibleState {
  return {
    discover: { registerDiscoverProvider: vi.fn() },
    modals: { openModal: vi.fn() },
  } as unknown as SeedBibleState;
}

function findProvider(context: SeedBibleState, id: string) {
  const registerDiscoverProvider = context.discover
    .registerDiscoverProvider as Mock;
  const call = registerDiscoverProvider.mock.calls.find(
    ([provider]) => provider.id === id
  );
  if (!call) {
    throw new Error(`Provider '${id}' was never registered.`);
  }
  return call[0];
}

describe("initDefaultContentExtension", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let container: HTMLDivElement;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    unregisterExtension("default-content-extension");
    errorSpy.mockRestore();
  });

  it("opens a modal that embeds the YouTube video when a curated content card is clicked", async () => {
    const context = createFakeContext();
    setupExtensionContext(context);
    initDefaultContentExtension();

    const provider = findProvider(context, "default-content-extension");
    const results = await provider.discover({
      book: "GEN",
      chapter: 28,
      translationId: "t1",
      language: "en",
    });

    expect(results).toHaveLength(1);
    act(() => results[0].onClick());

    const openModal = context.modals.openModal as Mock;
    expect(openModal).toHaveBeenCalledTimes(1);
    const modal = openModal.mock.calls[0]![0];
    expect(modal.id).toBe("discovered-content-curated-1");
    expect(modal.title).toBe("Curated Title");

    act(() => {
      render(modal.content(), container);
    });
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe(
      "https://www.youtube.com/embed/abc123"
    );
  });

  it("opens a modal that plays the Bible Project video's mp4 URL when its card is clicked", async () => {
    const context = createFakeContext();
    setupExtensionContext(context);
    initDefaultContentExtension();

    const provider = findProvider(context, "bible-project-discover-provider");
    const results = await provider.discover({
      book: "GEN",
      chapter: 28,
      translationId: "t1",
      language: "en",
    });

    expect(results).toHaveLength(1);
    act(() => results[0].onClick());

    const openModal = context.modals.openModal as Mock;
    expect(openModal).toHaveBeenCalledTimes(1);
    const modal = openModal.mock.calls[0]![0];
    expect(modal.id).toBe("bible-project-content-42");
    expect(modal.title).toBe("Bible Project Section");

    act(() => {
      render(modal.content(), container);
    });
    const video = container.querySelector("video");
    expect(video?.getAttribute("src")).toBe("https://example.com/bp-video.mp4");
  });

  it("plays a curated video in the reader instead of a modal when it's marked to play inline", async () => {
    (findDiscoveredContentForChapter as Mock).mockReturnValueOnce([
      {
        item: {
          id: "inline-1",
          title: "Inline Title",
          author: "Inline Author",
          description: "Inline description",
          url: "https://youtu.be/xyz789",
          references: [{ book: "GEN", chapter: 28 }],
          playInline: true,
        },
        reference: { book: "GEN", chapter: 28 },
      },
    ]);
    const discover = createDiscoverManager();
    const context = {
      discover,
      modals: { openModal: vi.fn() },
    } as unknown as SeedBibleState;
    setupExtensionContext(context);
    initDefaultContentExtension();

    const provider = discover.providers.value.find(
      (entry) => entry.id === "default-content-extension"
    );
    const results = await provider!.discover({
      book: "GEN",
      chapter: 28,
      translationId: "t1",
      language: "en",
    });
    act(() => (results[0] as { onClick: () => void }).onClick());

    expect(discover.inlineVideo.value).toEqual({
      id: "discovered-content-inline-1",
      title: "Inline Title",
      author: "Inline Author",
      url: "https://youtu.be/xyz789",
    });
    expect(context.modals.openModal).not.toHaveBeenCalled();
  });
});
