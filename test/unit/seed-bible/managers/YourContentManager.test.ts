import type {
  Annotation,
  AnnotationsManager,
} from "@packages/seed-bible/seed-bible/managers/AnnotationsManager";
import type {
  HighlightsManager,
  StoredHighlight,
} from "@packages/seed-bible/seed-bible/managers/HighlightsManager";
import {
  annotationPlainText,
  createYourContentManager,
  sortAnnotationsByRecency,
} from "@packages/seed-bible/seed-bible/managers/YourContentManager";

function annotation(
  id: string,
  overrides: { createdAtMs?: number | null; html?: string } = {}
): Annotation {
  return {
    id,
    bookId: "GEN",
    chapterNumber: 1,
    verseNumber: 1,
    data: {
      type: "comment",
      html: overrides.html ?? `<p>${id}</p>`,
      createdAtMs:
        overrides.createdAtMs === undefined ? 1000 : overrides.createdAtMs,
    },
  } as unknown as Annotation;
}

function highlight(bookId: string): StoredHighlight {
  return {
    translationId: "BSB",
    bookId,
    chapterNumber: 1,
    highlight: { colorId: "yellow", verse: 1 },
  };
}

function createManager(
  options: {
    annotations?: Annotation[];
    highlights?: StoredHighlight[];
    annotationsError?: Error;
  } = {}
) {
  const listAllAnnotations = vi.fn(async () => {
    if (options.annotationsError) {
      throw options.annotationsError;
    }
    return options.annotations ?? [];
  });
  const listAllHighlights = vi.fn(async () => options.highlights ?? []);

  const manager = createYourContentManager({
    annotations: { listAllAnnotations } as unknown as AnnotationsManager,
    highlights: { listAllHighlights } as unknown as HighlightsManager,
  });

  return { manager, listAllAnnotations, listAllHighlights };
}

describe("createYourContentManager", () => {
  it("starts idle and empty, before anything is asked of it", () => {
    const { manager, listAllAnnotations } = createManager();

    expect(manager.status.value).toBe("idle");
    expect(manager.annotations.value).toEqual([]);
    expect(manager.highlights.value).toEqual([]);
    expect(listAllAnnotations).not.toHaveBeenCalled();
  });

  it("loads annotations and highlights together", async () => {
    const { manager } = createManager({
      annotations: [annotation("a")],
      highlights: [highlight("JHN")],
    });

    await manager.load();

    expect(manager.status.value).toBe("ready");
    expect(manager.annotations.value.map((a) => a.id)).toEqual(["a"]);
    expect(manager.highlights.value.map((h) => h.bookId)).toEqual(["JHN"]);
  });

  it("does not refetch once loaded", async () => {
    const { manager, listAllAnnotations } = createManager({
      annotations: [annotation("a")],
    });

    await manager.load();
    await manager.load();

    expect(listAllAnnotations).toHaveBeenCalledTimes(1);
  });

  it("refetches when forced, so an edit elsewhere shows up", async () => {
    const { manager, listAllAnnotations } = createManager({
      annotations: [annotation("a")],
    });

    await manager.load();
    await manager.load({ force: true });

    expect(listAllAnnotations).toHaveBeenCalledTimes(2);
  });

  it("shares one request between concurrent callers", async () => {
    const { manager, listAllAnnotations } = createManager({
      annotations: [annotation("a")],
    });

    await Promise.all([manager.load(), manager.load(), manager.load()]);

    expect(listAllAnnotations).toHaveBeenCalledTimes(1);
  });

  // A failure must not read as "you have no content" — that would invite the
  // user to conclude their notes are gone.
  it("reports a failed load as an error, not as empty", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { manager } = createManager({
      annotationsError: new Error("network down"),
    });

    await manager.load();

    expect(manager.status.value).toBe("error");
    expect(manager.annotations.value).toEqual([]);
    consoleError.mockRestore();
  });

  it("retries after a failure", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const { manager, listAllAnnotations } = createManager({
      annotationsError: new Error("network down"),
    });

    await manager.load();
    await manager.load();

    // Not "ready", so the second call is allowed through rather than skipped.
    expect(listAllAnnotations).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it("drops a deleted annotation from the list", async () => {
    const { manager } = createManager({
      annotations: [annotation("a"), annotation("b")],
    });

    await manager.load();
    manager.removeAnnotation("a");

    expect(manager.annotations.value.map((x) => x.id)).toEqual(["b"]);
  });

  it("puts an annotation back when its delete turned out to fail", async () => {
    const { manager } = createManager({
      annotations: [
        annotation("a", { createdAtMs: 3000 }),
        annotation("b", { createdAtMs: 2000 }),
        annotation("c", { createdAtMs: 1000 }),
      ],
    });

    await manager.load();
    const removed = manager.annotations.value[1]!;
    manager.removeAnnotation("b");
    manager.restoreAnnotation(removed);

    // Back in its place by date, not appended to the end.
    expect(manager.annotations.value.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("doesn't duplicate an annotation that is already in the list", async () => {
    const { manager } = createManager({ annotations: [annotation("a")] });

    await manager.load();
    manager.restoreAnnotation(manager.annotations.value[0]!);

    expect(manager.annotations.value.map((x) => x.id)).toEqual(["a"]);
  });

  it("clears the search box and chips together", () => {
    const { manager } = createManager();
    manager.query.value = "psalm";
    manager.filter.value = "highlights";

    manager.resetFilters();

    expect(manager.query.value).toBe("");
    expect(manager.filter.value).toBe("all");
  });
});

describe("sortAnnotationsByRecency", () => {
  it("puts the newest first", () => {
    const sorted = sortAnnotationsByRecency([
      annotation("old", { createdAtMs: 1 }),
      annotation("new", { createdAtMs: 99 }),
      annotation("mid", { createdAtMs: 50 }),
    ]);

    expect(sorted.map((a) => a.id)).toEqual(["new", "mid", "old"]);
  });

  // Undated notes predate `createdAtMs` being recorded. Treating a missing
  // timestamp as 0 would be fine; treating it as "newest" would not.
  it("sorts undated annotations last, not first", () => {
    const sorted = sortAnnotationsByRecency([
      annotation("undated", { createdAtMs: null }),
      annotation("dated", { createdAtMs: 5 }),
    ]);

    expect(sorted.map((a) => a.id)).toEqual(["dated", "undated"]);
  });

  it("orders two undated annotations stably by id", () => {
    const sorted = sortAnnotationsByRecency([
      annotation("b", { createdAtMs: null }),
      annotation("a", { createdAtMs: null }),
    ]);

    expect(sorted.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("leaves the input array alone", () => {
    const input = [
      annotation("old", { createdAtMs: 1 }),
      annotation("new", { createdAtMs: 99 }),
    ];

    sortAnnotationsByRecency(input);

    expect(input.map((a) => a.id)).toEqual(["old", "new"]);
  });
});

describe("annotationPlainText", () => {
  it("strips markup so the body can be searched", () => {
    const text = annotationPlainText(
      annotation("a", { html: "<p>The <em>Word</em> was God.</p>" })
    );

    expect(text).toBe("The Word was God.");
  });

  it("decodes the entities the editor writes", () => {
    const text = annotationPlainText(
      annotation("a", { html: "<p>Alpha &amp; Omega &quot;first&quot;</p>" })
    );

    expect(text).toBe('Alpha & Omega "first"');
  });

  // "&amp;lt;" is how the editor stores the literal text "&lt;". Decoding
  // "&amp;" first would turn it into "&lt;" and then into "<", showing markup
  // the note never contained.
  it("doesn't decode an escaped entity twice", () => {
    const text = annotationPlainText(
      annotation("a", { html: "<p>write &amp;lt;b&amp;gt; for bold</p>" })
    );

    expect(text).toBe("write &lt;b&gt; for bold");
  });

  it("collapses the whitespace left behind by removed tags", () => {
    const text = annotationPlainText(
      annotation("a", { html: "<p>one</p>\n<p>two</p>" })
    );

    expect(text).toBe("one two");
  });
});
