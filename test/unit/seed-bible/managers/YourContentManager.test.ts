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
  type CreateYourContentManagerOptions,
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

function highlight(
  bookId: string,
  verse: number | [number, number] = 1,
  overrides: Partial<Omit<StoredHighlight, "bookId" | "highlight">> = {}
): StoredHighlight {
  return {
    translationId: "BSB",
    chapterNumber: 1,
    ...overrides,
    bookId,
    highlight: { colorId: "yellow", verse },
  };
}

function createManager(
  options: {
    annotations?: Annotation[];
    highlights?: StoredHighlight[];
    annotationsError?: Error;
    /** Verse text by "book/chapter/verse", for planting a searchable word. */
    verseWords?: Record<string, string>;
    /** Answer every chapter from the synchronous cache instead of a fetch. */
    cachedChapters?: boolean;
    chapterError?: Error;
  } = {}
) {
  const listAllAnnotations = vi.fn(async () => {
    if (options.annotationsError) {
      throw options.annotationsError;
    }
    return options.annotations ?? [];
  });
  const listAllHighlights = vi.fn(async () => options.highlights ?? []);

  // A stand-in chapter reader. Every verse reads "verse N of BOOK CHAPTER"
  // unless `verseWords` plants something searchable in one of them.
  const chapterFor = (book: string, chapter: number) => ({
    chapter: {
      content: [1, 2, 3, 4].map((number) => ({
        type: "verse" as const,
        number,
        content: [
          options.verseWords?.[`${book}/${chapter}/${number}`] ??
            `verse ${number} of ${book} ${chapter}`,
        ],
      })),
    },
  });

  const getTranslationBookChapter = vi.fn(
    async (_translationId: string, book: string, chapter: number | string) => {
      if (options.chapterError) {
        throw options.chapterError;
      }
      return chapterFor(book, Number(chapter));
    }
  );
  const getCachedTranslationBookChapter = vi.fn(
    (_translationId: string, book: string, chapter: number | string) =>
      options.cachedChapters ? chapterFor(book, Number(chapter)) : null
  );

  const manager = createYourContentManager({
    bibleData: {
      getTranslationBookChapter,
      getCachedTranslationBookChapter,
    } as unknown as CreateYourContentManagerOptions["bibleData"],
    annotations: { listAllAnnotations } as unknown as AnnotationsManager,
    highlights: { listAllHighlights } as unknown as HighlightsManager,
  });

  return {
    manager,
    listAllAnnotations,
    listAllHighlights,
    getTranslationBookChapter,
    getCachedTranslationBookChapter,
  };
}

/**
 * A manager whose annotation fetch can be held open, so a refresh can be
 * looked at while it is still in flight — which is where the difference
 * between a loud and a quiet reload shows up.
 */
function createHoldableManager() {
  const pending: Array<{
    resolve: (annotations: Annotation[]) => void;
    reject: (error: Error) => void;
  }> = [];
  const listAllAnnotations = vi.fn(
    () =>
      new Promise<Annotation[]>((resolve, reject) => {
        pending.push({ resolve, reject });
      })
  );
  const listAllHighlights = vi.fn(async () => [] as StoredHighlight[]);

  const manager = createYourContentManager({
    bibleData: {
      getTranslationBookChapter: vi.fn(),
      getCachedTranslationBookChapter: vi.fn(() => null),
    } as unknown as CreateYourContentManagerOptions["bibleData"],
    annotations: { listAllAnnotations } as unknown as AnnotationsManager,
    highlights: { listAllHighlights } as unknown as HighlightsManager,
  });

  /** The nth load's controls, once that load has actually been issued. */
  const settle = (index: number) => {
    const controls = pending[index];
    if (!controls) {
      throw new Error(`No load in flight at index ${index}`);
    }
    return controls;
  };

  return { manager, listAllAnnotations, settle };
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

  // Highlights have no id: where a highlight is *is* its identity, so these
  // pin down what counts as the same highlight.
  it("drops a cleared highlight from the list", async () => {
    const { manager } = createManager({
      highlights: [highlight("GEN"), highlight("JHN")],
    });

    await manager.load();
    manager.removeHighlight(manager.highlights.value[0]!);

    expect(manager.highlights.value.map((h) => h.bookId)).toEqual(["JHN"]);
  });

  it("leaves the same verse in another chapter, book or translation alone", async () => {
    const { manager } = createManager({
      highlights: [
        highlight("GEN"),
        highlight("GEN", 1, { chapterNumber: 2 }),
        highlight("GEN", 1, { translationId: "ESV" }),
        highlight("JHN"),
      ],
    });

    await manager.load();
    manager.removeHighlight(manager.highlights.value[0]!);

    expect(
      manager.highlights.value.map(
        (h) => `${h.translationId}/${h.bookId}/${h.chapterNumber}`
      )
    ).toEqual(["BSB/GEN/2", "ESV/GEN/1", "BSB/JHN/1"]);
  });

  it("tells a single verse apart from a range starting at it", async () => {
    const { manager } = createManager({
      highlights: [highlight("GEN", 1), highlight("GEN", [1, 3])],
    });

    await manager.load();
    manager.removeHighlight(manager.highlights.value[0]!);

    expect(manager.highlights.value.map((h) => h.highlight.verse)).toEqual([
      [1, 3],
    ]);
  });

  it("puts a highlight back when clearing it turned out to fail", async () => {
    const { manager } = createManager({
      highlights: [highlight("GEN"), highlight("JHN")],
    });

    await manager.load();
    const removed = manager.highlights.value[0]!;
    manager.removeHighlight(removed);
    manager.restoreHighlight(removed);

    // On the end: the list is in record order, with no timestamp to sort by.
    expect(manager.highlights.value.map((h) => h.bookId)).toEqual([
      "JHN",
      "GEN",
    ]);
  });

  it("doesn't duplicate a highlight that is already in the list", async () => {
    const { manager } = createManager({ highlights: [highlight("GEN")] });

    await manager.load();
    manager.restoreHighlight(manager.highlights.value[0]!);

    expect(manager.highlights.value.map((h) => h.bookId)).toEqual(["GEN"]);
  });

  // Nothing stores the wording of a highlighted verse, so search has to read
  // it back out of the chapter.
  describe("reading highlighted verse text", () => {
    it("reads each highlight's verse so search can match its words", async () => {
      const { manager } = createManager({
        highlights: [highlight("JHN", 3)],
        verseWords: { "JHN/1/3": "For God so loved the world" },
      });

      await manager.load();
      await manager.readHighlightVerseText();

      expect([...manager.highlightVerseText.value.values()]).toEqual([
        "For God so loved the world",
      ]);
    });

    it("joins every verse of a range, not just the one the row quotes", async () => {
      const { manager } = createManager({
        highlights: [highlight("JHN", [2, 3])],
        verseWords: {
          "JHN/1/2": "the second verse",
          "JHN/1/3": "the third verse",
        },
      });

      await manager.load();
      await manager.readHighlightVerseText();

      expect([...manager.highlightVerseText.value.values()]).toEqual([
        "the second verse the third verse",
      ]);
    });

    it("reads a chapter once however many highlights are in it", async () => {
      const { manager, getTranslationBookChapter } = createManager({
        highlights: [highlight("JHN", 1), highlight("JHN", 2)],
      });

      await manager.load();
      await manager.readHighlightVerseText();

      expect(getTranslationBookChapter).toHaveBeenCalledTimes(1);
      expect(manager.highlightVerseText.value.size).toBe(2);
    });

    it("takes an already-fetched chapter from cache without a request", async () => {
      const {
        manager,
        getTranslationBookChapter,
        getCachedTranslationBookChapter,
      } = createManager({
        highlights: [highlight("JHN", 1)],
        cachedChapters: true,
      });

      await manager.load();
      await manager.readHighlightVerseText();

      expect(getCachedTranslationBookChapter).toHaveBeenCalled();
      expect(getTranslationBookChapter).not.toHaveBeenCalled();
      expect(manager.highlightVerseText.value.size).toBe(1);
    });

    it("does not read twice, and shares a run in progress", async () => {
      const { manager, getTranslationBookChapter } = createManager({
        highlights: [highlight("JHN", 1)],
      });

      await manager.load();
      await Promise.all([
        manager.readHighlightVerseText(),
        manager.readHighlightVerseText(),
      ]);
      await manager.readHighlightVerseText();

      expect(getTranslationBookChapter).toHaveBeenCalledTimes(1);
    });

    it("reports while it is working and once it is done", async () => {
      const { manager } = createManager({ highlights: [highlight("JHN", 1)] });
      await manager.load();

      expect(manager.isReadingHighlightVerseText.value).toBe(false);
      const run = manager.readHighlightVerseText();
      expect(manager.isReadingHighlightVerseText.value).toBe(true);

      await run;
      expect(manager.isReadingHighlightVerseText.value).toBe(false);
    });

    it("leaves a highlight searchable by reference when its chapter will not load", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const { manager } = createManager({
        highlights: [highlight("JHN", 1)],
        chapterError: new Error("offline"),
      });

      await manager.load();
      await manager.readHighlightVerseText();

      // No entry rather than a rejected promise: the row is still there and
      // still findable by its reference.
      expect(manager.highlightVerseText.value.size).toBe(0);
      expect(manager.isReadingHighlightVerseText.value).toBe(false);
      expect(consoleError).toHaveBeenCalled();
    });
  });

  // Reopening the screen re-reads the record, so a verse highlighted or
  // annotated in the reader since the last visit turns up. What must not
  // happen is the lists the user was reading blanking to a spinner while
  // that runs.
  describe("refreshing content that is already loaded", () => {
    it("leaves the lists and the ready status up while the refresh runs", async () => {
      const { manager, settle } = createHoldableManager();

      const first = manager.load();
      expect(manager.status.value).toBe("loading");
      settle(0).resolve([annotation("a")]);
      await first;
      expect(manager.status.value).toBe("ready");

      const refresh = manager.load({ force: true });

      expect(manager.status.value).toBe("ready");
      expect(manager.annotations.value.map((a) => a.id)).toEqual(["a"]);

      settle(1).resolve([annotation("a"), annotation("b")]);
      await refresh;

      expect([...manager.annotations.value.map((a) => a.id)].sort()).toEqual([
        "a",
        "b",
      ]);
    });

    it("keeps the loaded lists when the refresh fails", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { manager, settle } = createHoldableManager();

      const first = manager.load();
      settle(0).resolve([annotation("a")]);
      await first;

      const refresh = manager.load({ force: true });
      settle(1).reject(new Error("network down"));
      await refresh;

      // A slightly stale list beats an error page over content that loaded.
      expect(manager.status.value).toBe("ready");
      expect(manager.annotations.value.map((a) => a.id)).toEqual(["a"]);
      consoleError.mockRestore();
    });

    it("still shows loading for a retry after a failed first load", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const { manager, settle } = createHoldableManager();

      const first = manager.load();
      settle(0).reject(new Error("network down"));
      await first;
      expect(manager.status.value).toBe("error");

      // Nothing is on screen to protect, so the retry is allowed to say so.
      void manager.load({ force: true });
      expect(manager.status.value).toBe("loading");
      consoleError.mockRestore();
    });
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
