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
import type { ListAllResult } from "@packages/seed-bible/seed-bible/managers/OfflineRecordStore";
import { signal } from "@preact/signals";

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
    /** Holds every chapter fetch until this settles. */
    chapterGate?: Promise<void>;
    /** Signed in as this account; null for signed out. */
    userId?: string | null;
    /** Starts with the device offline, so only its own copy can be read. */
    offline?: boolean;
    /** Starts with the device online but the server failing every read. */
    serverDown?: boolean;
  } = {}
) {
  const online = createConnection(!options.offline);
  const server = { down: options.serverDown ?? false };
  // Offline or with the server failing, the real managers read the device
  // alone and say the list may be incomplete; signed out, the device is the
  // whole story either way.
  const reachedServer = (connected: boolean) =>
    (connected && !server.down) || options.userId === null;
  const listAllAnnotations = vi.fn(
    async (): Promise<ListAllResult<Annotation>> => {
      if (options.annotationsError) {
        throw options.annotationsError;
      }
      return {
        items: options.annotations ?? [],
        complete: reachedServer(online.annotations.peek()),
      };
    }
  );
  const listAllHighlights = vi.fn(
    async (): Promise<ListAllResult<StoredHighlight>> => ({
      items: options.highlights ?? [],
      complete: reachedServer(online.highlights.peek()),
    })
  );
  const { login, adoptions, annotationsManager, highlightsManager } =
    createAccount(
      options.userId,
      listAllAnnotations,
      listAllHighlights,
      online
    );

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
      await options.chapterGate;
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
    annotations: annotationsManager,
    highlights: highlightsManager,
    login,
  });

  return {
    manager,
    login,
    adoptions,
    online,
    server,
    listAllAnnotations,
    listAllHighlights,
    getTranslationBookChapter,
    getCachedTranslationBookChapter,
  };
}

/**
 * Whether each manager's sync engine thinks the device is online. The two are
 * separate because each engine hears the browser's `online` event on its own,
 * so they come back one after the other.
 */
function createConnection(connected = true) {
  return { annotations: signal(connected), highlights: signal(connected) };
}

type Connection = ReturnType<typeof createConnection>;

/**
 * The account the screen belongs to, and the two managers it reads from.
 * `adoptions` stands in for the sync engine finishing an "add to your
 * account?" answer.
 */
function createAccount(
  userId: string | null | undefined,
  listAllAnnotations: AnnotationsManager["listAllAnnotations"],
  listAllHighlights: HighlightsManager["listAllHighlights"],
  online: Connection = createConnection()
) {
  const login = {
    userId: signal<string | null>(userId === undefined ? "user-1" : userId),
  };
  const adoptions = signal(0);
  return {
    login,
    adoptions,
    annotationsManager: {
      listAllAnnotations,
      sync: { adoptions, isOnline: online.annotations },
    } as unknown as AnnotationsManager,
    highlightsManager: {
      listAllHighlights,
      sync: { adoptions: signal(0), isOnline: online.highlights },
    } as unknown as HighlightsManager,
  };
}

/**
 * A manager whose annotation fetch can be held open, so a refresh can be
 * looked at while it is still in flight — which is where the difference
 * between a loud and a quiet reload shows up.
 */
function createHoldableManager(options: { offline?: boolean } = {}) {
  const pending: Array<{
    resolve: (annotations: Annotation[], complete?: boolean) => void;
    reject: (error: Error) => void;
  }> = [];
  const listAllAnnotations = vi.fn(
    () =>
      new Promise<ListAllResult<Annotation>>((resolve, reject) => {
        pending.push({
          resolve: (items, complete = true) => resolve({ items, complete }),
          reject,
        });
      })
  );
  const listAllHighlights = vi.fn(
    async (): Promise<ListAllResult<StoredHighlight>> => ({
      items: [],
      complete: true,
    })
  );
  const online = createConnection(!options.offline);
  const { login, annotationsManager, highlightsManager } = createAccount(
    "user-1",
    listAllAnnotations,
    listAllHighlights,
    online
  );

  const manager = createYourContentManager({
    bibleData: {
      getTranslationBookChapter: vi.fn(),
      getCachedTranslationBookChapter: vi.fn(() => null),
    } as unknown as CreateYourContentManagerOptions["bibleData"],
    annotations: annotationsManager,
    highlights: highlightsManager,
    login,
  });

  /** The nth load's controls, once that load has actually been issued. */
  const settle = (index: number) => {
    const controls = pending[index];
    if (!controls) {
      throw new Error(`No load in flight at index ${index}`);
    }
    return controls;
  };

  return { manager, login, online, listAllAnnotations, settle };
}

/** Lets every queued promise callback run, without waiting on a timer. */
const flushPromises = () => new Promise<void>((resolve) => setTimeout(resolve));

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

    // Every open reloads, and so do an adoption and the connection coming
    // back; a highlight one of those brings in must be findable by its words
    // without the search being cleared and typed again.
    it("reads the wording of a highlight that arrives in a later load", async () => {
      const highlights = [highlight("JHN", 1)];
      const { manager } = createManager({
        highlights,
        verseWords: { "ROM/1/2": "the power of God" },
      });
      await manager.load();
      await manager.readHighlightVerseText();

      highlights.push(highlight("ROM", 2));
      await manager.load({ force: true });

      await vi.waitFor(() =>
        expect([...manager.highlightVerseText.value.values()]).toContain(
          "the power of God"
        )
      );
      expect(manager.highlightVerseText.value.size).toBe(2);
    });

    it("doesn't read a chapter again for highlights it already has", async () => {
      const { manager, getTranslationBookChapter } = createManager({
        highlights: [highlight("JHN", 1)],
      });
      await manager.load();
      await manager.readHighlightVerseText();

      await manager.load({ force: true });
      await manager.readHighlightVerseText();

      expect(getTranslationBookChapter).toHaveBeenCalledTimes(1);
    });

    it("reads nothing on a later load until a search has asked for it", async () => {
      const highlights = [highlight("JHN", 1)];
      const { manager, getTranslationBookChapter } = createManager({
        highlights,
      });
      await manager.load();

      highlights.push(highlight("ROM", 2));
      await manager.load({ force: true });
      await flushPromises();

      expect(getTranslationBookChapter).not.toHaveBeenCalled();
    });

    it("catches a highlight that arrives while a read is still running", async () => {
      let openGate = () => {};
      const highlights = [highlight("JHN", 1)];
      const { manager } = createManager({
        highlights,
        verseWords: { "ROM/1/2": "the power of God" },
        chapterGate: new Promise<void>((resolve) => {
          openGate = resolve;
        }),
      });
      await manager.load();
      const reading = manager.readHighlightVerseText();

      highlights.push(highlight("ROM", 2));
      await manager.load({ force: true });
      openGate();
      await reading;

      await vi.waitFor(() =>
        expect([...manager.highlightVerseText.value.values()]).toContain(
          "the power of God"
        )
      );
      expect(manager.isReadingHighlightVerseText.value).toBe(false);
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

  describe("where the content came from", () => {
    it("is the device for a signed-out user", async () => {
      const { manager } = createManager({
        userId: null,
        annotations: [annotation("a")],
      });

      await manager.load();

      expect(manager.status.value).toBe("ready");
      expect(manager.source.value).toBe("device");
      expect(manager.annotations.value.map((a) => a.id)).toEqual(["a"]);
    });

    // Offline, the screen shows what the device has rather than an error,
    // and says that's what it is showing.
    it("is the device when offline", async () => {
      const { manager } = createManager({
        annotations: [annotation("a")],
        offline: true,
      });

      await manager.load();

      expect(manager.status.value).toBe("ready");
      expect(manager.source.value).toBe("device");
    });

    // Online with the server failing is told apart from offline: the screen
    // can't tell someone already connected to connect to the internet.
    it("says the account couldn't be reached when online but the server failed", async () => {
      const { manager } = createManager({
        annotations: [annotation("a")],
        serverDown: true,
      });

      await manager.load();

      expect(manager.status.value).toBe("ready");
      expect(manager.source.value).toBe("device-unreachable");
      expect(manager.annotations.value.map((a) => a.id)).toEqual(["a"]);
    });

    it("is the account once a retry reaches the server", async () => {
      const { manager, server } = createManager({
        annotations: [annotation("a")],
        serverDown: true,
      });
      await manager.load();

      server.down = false;
      await manager.load({ force: true });

      expect(manager.source.value).toBe("account");
    });

    it("is the account once the server copy was read", async () => {
      const { manager } = createManager({ annotations: [annotation("a")] });

      await manager.load();

      expect(manager.source.value).toBe("account");
    });
  });

  // The device-only card tells a signed-in user to reconnect to see everything
  // in their account, so reconnecting has to bring it in without reopening.
  describe("the connection coming back", () => {
    it("reloads from the account once the device is back online", async () => {
      const { manager, online } = createManager({
        annotations: [annotation("a")],
        offline: true,
      });
      await manager.load();
      expect(manager.source.value).toBe("device");

      online.annotations.value = true;
      online.highlights.value = true;

      await vi.waitFor(() => expect(manager.source.value).toBe("account"));
      expect(manager.status.value).toBe("ready");
    });

    it("also retries a list whose account couldn't be reached before", async () => {
      const { manager, online, server } = createManager({ serverDown: true });
      await manager.load();
      expect(manager.source.value).toBe("device-unreachable");

      online.annotations.value = false;
      online.highlights.value = false;
      server.down = false;
      online.annotations.value = true;
      online.highlights.value = true;

      await vi.waitFor(() => expect(manager.source.value).toBe("account"));
    });

    it("waits until both kinds of content can reach the server", async () => {
      const { manager, online, listAllAnnotations } = createManager({
        offline: true,
      });
      await manager.load();

      online.annotations.value = true;
      await flushPromises();
      expect(listAllAnnotations).toHaveBeenCalledTimes(1);

      online.highlights.value = true;
      await vi.waitFor(() => expect(manager.source.value).toBe("account"));
      expect(listAllAnnotations).toHaveBeenCalledTimes(2);
    });

    it("catches a load that was still running offline when it came back", async () => {
      const { manager, online, settle } = createHoldableManager({
        offline: true,
      });
      const first = manager.load();

      online.annotations.value = true;
      online.highlights.value = true;
      settle(0).resolve([annotation("on-device")], false);
      await first;
      expect(manager.source.value).toBe("device");

      await vi.waitFor(() => settle(1));
      settle(1).resolve([annotation("on-device"), annotation("in-account")]);

      await vi.waitFor(() => expect(manager.source.value).toBe("account"));
      expect([...manager.annotations.value.map((a) => a.id)].sort()).toEqual([
        "in-account",
        "on-device",
      ]);
    });

    it("leaves a list that already came from the account alone", async () => {
      const { manager, online, listAllAnnotations } = createManager();
      await manager.load();

      online.annotations.value = false;
      online.highlights.value = false;
      online.annotations.value = true;
      online.highlights.value = true;
      await flushPromises();

      expect(listAllAnnotations).toHaveBeenCalledTimes(1);
    });

    it("reads nothing if the screen was never opened", async () => {
      const { online, listAllAnnotations } = createManager({ offline: true });

      online.annotations.value = true;
      online.highlights.value = true;
      await flushPromises();

      expect(listAllAnnotations).not.toHaveBeenCalled();
    });

    // Signed out, the device holds everything there is, so there is nothing
    // more to fetch.
    it("doesn't reload for a signed-out user", async () => {
      const { manager, online, listAllAnnotations } = createManager({
        userId: null,
        offline: true,
      });
      await manager.load();

      online.annotations.value = true;
      online.highlights.value = true;
      await flushPromises();

      expect(manager.source.value).toBe("device");
      expect(listAllAnnotations).toHaveBeenCalledTimes(1);
    });
  });

  describe("a change of account", () => {
    it("clears the last account's content at once and reloads", async () => {
      const { manager, login, settle } = createHoldableManager();
      const first = manager.load();
      settle(0).resolve([annotation("theirs")]);
      await first;

      login.userId.value = null;

      expect(manager.annotations.value).toEqual([]);
      expect(manager.status.value).toBe("loading");
      settle(1).resolve([annotation("mine")]);
      await vi.waitFor(() =>
        expect(manager.annotations.value.map((a) => a.id)).toEqual(["mine"])
      );
    });

    it("drops a load that finishes after the account changed", async () => {
      const { manager, login, settle } = createHoldableManager();
      void manager.load();

      login.userId.value = "user-2";
      settle(0).resolve([annotation("user-1-note")]);
      settle(1).resolve([annotation("user-2-note")]);

      await vi.waitFor(() => expect(manager.status.value).toBe("ready"));
      expect(manager.annotations.value.map((a) => a.id)).toEqual([
        "user-2-note",
      ]);
    });

    it("reads nothing if the screen was never opened", () => {
      const { login, listAllAnnotations } = createManager();

      login.userId.value = null;

      expect(listAllAnnotations).not.toHaveBeenCalled();
    });

    // Signed-out notes join the account after the "add to your account?"
    // answer, which lands well after the sign-in itself.
    it("reloads once signed-out content has been added to the account", async () => {
      const { manager, adoptions, listAllAnnotations } = createManager({
        annotations: [annotation("a")],
      });
      await manager.load();

      adoptions.value++;

      await vi.waitFor(() =>
        expect(listAllAnnotations).toHaveBeenCalledTimes(2)
      );
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
