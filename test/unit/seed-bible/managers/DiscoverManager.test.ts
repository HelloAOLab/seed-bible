import { effect } from "@preact/signals";
import {
  createDiscoverManager,
  type DiscoverContext,
  type DiscoverProvider,
  type DiscoverProviderResults,
  type DiscoverResult,
} from "@packages/seed-bible/seed-bible/managers/DiscoverManager";

const context: DiscoverContext = {
  translationId: "AAB",
  book: "GEN",
  chapter: 1,
  language: "eng",
};

function makeProvider(
  id: string,
  results: DiscoverResult[],
  delay = 0
): DiscoverProvider {
  return {
    id,
    title: `Provider ${id}`,
    description: `Description for ${id}`,
    discover: () =>
      delay > 0
        ? new Promise((resolve) => setTimeout(() => resolve(results), delay))
        : results,
  };
}

async function collectAll(
  iterable: AsyncIterable<DiscoverProviderResults>
): Promise<DiscoverProviderResults[]> {
  const results: DiscoverProviderResults[] = [];
  for await (const item of iterable) {
    results.push(item);
  }
  return results;
}

describe("createDiscoverManager", () => {
  describe("registerDiscoverProvider", () => {
    it("returns no results when no providers are registered", async () => {
      const manager = createDiscoverManager();
      const results = await collectAll(manager.discover(context));
      expect(results).toEqual([]);
    });

    it("returns results from a single registered provider", async () => {
      const manager = createDiscoverManager();
      const result: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 1, verse: 1 },
        content: null as any,
      };
      manager.registerDiscoverProvider(makeProvider("p1", [result]));

      const results = await collectAll(manager.discover(context));

      expect(results).toEqual([{ providerId: "p1", results: [result] }]);
    });

    it("returns results from multiple registered providers", async () => {
      const manager = createDiscoverManager();
      const r1: DiscoverResult = {
        type: "content",
        title: "T1",
        description: "D1",
        reference: { book: "GEN", chapter: 1 },
        content: null as any,
      };
      const r2: DiscoverResult = {
        type: "cross-reference",
        reference: { book: "GEN", chapter: 1, verse: 2 },
        crossReference: { book: "GEN", chapter: 3, verse: 4 },
      };
      manager.registerDiscoverProvider(makeProvider("p1", [r1]));
      manager.registerDiscoverProvider(makeProvider("p2", [r2]));

      const results = await collectAll(manager.discover(context));

      expect(results).toHaveLength(2);
      expect(results.find((r) => r.providerId === "p1")?.results).toEqual([r1]);
      expect(results.find((r) => r.providerId === "p2")?.results).toEqual([r2]);
    });

    it("publishes each registration on the providers signal, including a replacement", () => {
      const manager = createDiscoverManager();
      expect(manager.providers.value).toEqual([]);

      const first = makeProvider("p1", []);
      manager.registerDiscoverProvider(first);
      expect(manager.providers.value).toEqual([first]);

      const replacement = makeProvider("p1", []);
      manager.registerDiscoverProvider(replacement);
      expect(manager.providers.value).toEqual([replacement]);

      const second = makeProvider("p2", []);
      manager.registerDiscoverProvider(second);
      expect(manager.providers.value).toEqual([replacement, second]);
    });

    it("replaces an existing provider when re-registered with the same id", async () => {
      const manager = createDiscoverManager();
      const original: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 1 },
        content: null as any,
      };
      const replacement: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 2 },
        content: null as any,
      };

      manager.registerDiscoverProvider(makeProvider("p1", [original]));
      manager.registerDiscoverProvider(makeProvider("p1", [replacement]));

      const results = await collectAll(manager.discover(context));

      expect(results).toHaveLength(1);
      expect(results[0]!.results).toEqual([replacement]);
    });
  });

  describe("discover", () => {
    it("passes the context to each provider", async () => {
      const manager = createDiscoverManager();
      const receivedContexts: DiscoverContext[] = [];
      const provider: DiscoverProvider = {
        id: "p1",
        title: "P1",
        description: "D1",
        discover(ctx) {
          receivedContexts.push(ctx);
          return [];
        },
      };
      manager.registerDiscoverProvider(provider);

      await collectAll(manager.discover(context));

      expect(receivedContexts).toHaveLength(1);
      expect(receivedContexts[0]).toBe(context);
    });

    it("yields each provider's results as a separate item", async () => {
      const manager = createDiscoverManager();
      const r1: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 1 },
        content: null as any,
      };
      const r2: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 2 },
        content: null as any,
      };
      manager.registerDiscoverProvider(makeProvider("p1", [r1]));
      manager.registerDiscoverProvider(makeProvider("p2", [r2]));

      const yielded: DiscoverProviderResults[] = [];
      for await (const item of manager.discover(context)) {
        yielded.push(item);
      }

      expect(yielded).toHaveLength(2);
    });

    it("yields a provider with an empty results array when it returns nothing", async () => {
      const manager = createDiscoverManager();
      manager.registerDiscoverProvider(makeProvider("p1", []));

      const results = await collectAll(manager.discover(context));

      expect(results).toEqual([{ providerId: "p1", results: [] }]);
    });

    it("supports providers that return a Promise", async () => {
      const manager = createDiscoverManager();
      const result: DiscoverResult = {
        type: "cross-reference",
        reference: { book: "GEN", chapter: 1, verse: 1 },
        crossReference: { book: "GEN", chapter: 2, verse: 3 },
      };
      const provider: DiscoverProvider = {
        id: "p1",
        title: "P1",
        description: "D1",
        discover: () => Promise.resolve([result]),
      };
      manager.registerDiscoverProvider(provider);

      const results = await collectAll(manager.discover(context));

      expect(results).toEqual([{ providerId: "p1", results: [result] }]);
    });

    it("yields faster providers before slower ones", async () => {
      const manager = createDiscoverManager();
      const fast: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 1 },
        content: null as any,
      };
      const slow: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 2 },
        content: null as any,
      };
      // Register slow first so insertion order would put it first without racing
      manager.registerDiscoverProvider(makeProvider("slow", [slow], 30));
      manager.registerDiscoverProvider(makeProvider("fast", [fast], 0));

      const order: string[] = [];
      for await (const item of manager.discover(context)) {
        order.push(item.providerId);
      }

      expect(order).toEqual(["fast", "slow"]);
    });

    it("can be called multiple times independently", async () => {
      const manager = createDiscoverManager();
      const result: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 1 },
        content: null as any,
      };
      manager.registerDiscoverProvider(makeProvider("p1", [result]));

      const first = await collectAll(manager.discover(context));
      const second = await collectAll(manager.discover(context));

      expect(first).toEqual(second);
    });

    it("calls each provider once per chapter, including after another provider registers and after returning to that chapter", async () => {
      const manager = createDiscoverManager();
      const calls: string[] = [];
      const provider = (id: string): DiscoverProvider => ({
        id,
        title: id,
        description: id,
        discover: (ctx) => {
          calls.push(`${id}:${ctx.chapter}`);
          return [];
        },
      });

      manager.registerDiscoverProvider(provider("p1"));
      await collectAll(manager.discover(context));

      manager.registerDiscoverProvider(provider("p2"));
      await collectAll(manager.discover(context));
      await collectAll(manager.discover(context));
      await collectAll(manager.discover({ ...context, chapter: 2 }));
      await collectAll(manager.discover(context));

      expect(calls).toEqual(["p1:1", "p2:1", "p1:2", "p2:2"]);
      expect(
        manager.cachedResults(context).map((result) => result.providerId)
      ).toEqual(["p1", "p2"]);
    });

    it("reuses an in-flight lookup instead of calling the provider twice", async () => {
      const manager = createDiscoverManager();
      const result: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 1 },
        content: null as any,
      };
      let calls = 0;
      let resolveLookup: ((results: DiscoverResult[]) => void) | undefined;
      manager.registerDiscoverProvider({
        id: "p1",
        title: "P1",
        description: "D1",
        discover: () => {
          calls += 1;
          return new Promise((resolve) => {
            resolveLookup = resolve;
          });
        },
      });

      const pending = Promise.all([
        collectAll(manager.discover(context)),
        collectAll(manager.discover(context)),
      ]);
      expect(calls).toBe(1);
      expect(manager.cachedResults(context)).toEqual([]);

      resolveLookup!([result]);
      const [first, second] = await pending;

      expect(first).toEqual([{ providerId: "p1", results: [result] }]);
      expect(second).toEqual(first);
      expect(calls).toBe(1);
      expect(manager.cachedResults(context)).toEqual([
        { providerId: "p1", results: [result] },
      ]);
    });

    it("calls a replaced provider again and forgets the previous answer", async () => {
      const manager = createDiscoverManager();
      const original: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 1 },
        content: null as any,
      };
      const replacement: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 2 },
        content: null as any,
      };
      let calls = 0;

      manager.registerDiscoverProvider({
        id: "p1",
        title: "P1",
        description: "D1",
        discover: () => {
          calls += 1;
          return [original];
        },
      });
      await collectAll(manager.discover(context));

      manager.registerDiscoverProvider({
        id: "p1",
        title: "P1",
        description: "D1",
        discover: () => {
          calls += 1;
          return [replacement];
        },
      });
      expect(manager.cachedResults(context)).toEqual([]);

      const results = await collectAll(manager.discover(context));

      expect(calls).toBe(2);
      expect(results).toEqual([{ providerId: "p1", results: [replacement] }]);
    });

    it("retries a failed provider and still returns the others", async () => {
      const manager = createDiscoverManager();
      const result: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 1 },
        content: null as any,
      };
      let calls = 0;
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      manager.registerDiscoverProvider({
        id: "bad",
        title: "Bad",
        description: "Fails once",
        discover: () => {
          calls += 1;
          if (calls === 1) {
            return Promise.reject(new Error("fail"));
          }
          return [result];
        },
      });
      manager.registerDiscoverProvider(makeProvider("ok", [result]));

      const first = await collectAll(manager.discover(context));

      expect(first.find((item) => item.providerId === "bad")?.results).toEqual(
        []
      );
      expect(first.find((item) => item.providerId === "ok")?.results).toEqual([
        result,
      ]);
      expect(manager.cachedResults(context)).toEqual([
        { providerId: "ok", results: [result] },
      ]);

      const second = await collectAll(manager.discover(context));

      expect(calls).toBe(2);
      expect(second.find((item) => item.providerId === "bad")?.results).toEqual(
        [result]
      );
      expect(second.find((item) => item.providerId === "ok")?.results).toEqual([
        result,
      ]);
      errorSpy.mockRestore();
    });

    it("calls providers again after the UI language changes", async () => {
      const manager = createDiscoverManager();
      let calls = 0;
      const result: DiscoverResult = {
        type: "study-note",
        reference: { book: "GEN", chapter: 1 },
        content: null as any,
      };
      manager.registerDiscoverProvider({
        id: "p1",
        title: "P1",
        description: "D1",
        discover: () => {
          calls += 1;
          return [result];
        },
      });
      manager.setUiLanguage("en");

      await collectAll(manager.discover(context));
      await collectAll(manager.discover(context));
      expect(calls).toBe(1);

      manager.setUiLanguage("es");
      expect(manager.cachedResults(context)).toEqual([]);

      await collectAll(manager.discover(context));
      expect(calls).toBe(2);

      await collectAll(manager.discover(context));
      expect(calls).toBe(2);
    });

    it("forgets the least recently visited chapters once 50 are cached", async () => {
      const manager = createDiscoverManager();
      const calls: number[] = [];
      manager.registerDiscoverProvider({
        id: "p1",
        title: "P1",
        description: "D1",
        discover: (ctx) => {
          calls.push(ctx.chapter);
          return [];
        },
      });

      for (let chapter = 1; chapter <= 51; chapter++) {
        await collectAll(manager.discover({ ...context, chapter }));
      }
      expect(calls).toEqual(
        Array.from({ length: 51 }, (_, index) => index + 1)
      );

      await collectAll(manager.discover({ ...context, chapter: 1 }));
      await collectAll(manager.discover({ ...context, chapter: 51 }));

      expect(calls).toEqual([
        ...Array.from({ length: 51 }, (_, index) => index + 1),
        1,
      ]);
    });
  });

  describe("view", () => {
    it("defaults to null", () => {
      const manager = createDiscoverManager();
      expect(manager.view.value).toBeNull();
    });

    it("can be set to each sub-view", () => {
      const manager = createDiscoverManager();
      manager.view.value = "discover";
      expect(manager.view.value).toBe("discover");
      manager.view.value = "create_playlist";
      expect(manager.view.value).toBe("create_playlist");
      manager.view.value = "play_playlist";
      expect(manager.view.value).toBe("play_playlist");
      manager.view.value = "create_annotation";
      expect(manager.view.value).toBe("create_annotation");
      manager.view.value = null;
      expect(manager.view.value).toBeNull();
    });
  });

  describe("isDiscoverOpen", () => {
    it("is false when view is null", () => {
      const manager = createDiscoverManager();
      expect(manager.isDiscoverOpen.value).toBe(false);
    });

    it("is true whenever view is non-null", () => {
      const manager = createDiscoverManager();
      manager.view.value = "discover";
      expect(manager.isDiscoverOpen.value).toBe(true);
      manager.view.value = "create_playlist";
      expect(manager.isDiscoverOpen.value).toBe(true);
      manager.view.value = "play_playlist";
      expect(manager.isDiscoverOpen.value).toBe(true);
      manager.view.value = "create_annotation";
      expect(manager.isDiscoverOpen.value).toBe(true);
    });

    it("goes back to false once view is cleared", () => {
      const manager = createDiscoverManager();
      manager.view.value = "discover";
      manager.view.value = null;
      expect(manager.isDiscoverOpen.value).toBe(false);
    });
  });

  describe("resolveActualView", () => {
    it("collapses play_playlist to discover when nothing is playing", () => {
      const manager = createDiscoverManager();
      manager.view.value = "play_playlist";
      expect(manager.resolveActualView(false)).toBe("discover");
    });

    it("keeps play_playlist when something is playing", () => {
      const manager = createDiscoverManager();
      manager.view.value = "play_playlist";
      expect(manager.resolveActualView(true)).toBe("play_playlist");
    });

    it("returns view unchanged for every other value regardless of isPlaying", () => {
      const manager = createDiscoverManager();
      for (const value of [
        null,
        "discover",
        "create_playlist",
        "create_annotation",
      ] as const) {
        manager.view.value = value;
        expect(manager.resolveActualView(false)).toBe(value);
        expect(manager.resolveActualView(true)).toBe(value);
      }
    });
  });
});

describe("unregistering providers", () => {
  it("returns a function that removes the provider again", async () => {
    const manager = createDiscoverManager();
    const unregister = manager.registerDiscoverProvider(makeProvider("p1", []));

    unregister();

    expect(manager.providers.value).toEqual([]);
    expect(await collectAll(manager.discover(context))).toEqual([]);
  });

  it("does not remove a newer provider that replaced it", () => {
    // A reinstalled extension replaces its provider; the old install's cleanup
    // running afterwards must not take the new one down with it.
    const manager = createDiscoverManager();
    const unregisterOld = manager.registerDiscoverProvider(
      makeProvider("p1", [])
    );
    const replacement = makeProvider("p1", []);
    manager.registerDiscoverProvider(replacement);

    unregisterOld();

    expect(manager.providers.value).toEqual([replacement]);
  });

  it("publishes the provider list as it changes", () => {
    const manager = createDiscoverManager();
    const seen: number[] = [];
    const stop = effect(() => {
      seen.push(manager.providers.value.length);
    });

    const unregister = manager.registerDiscoverProvider(makeProvider("p1", []));
    unregister();
    stop();

    // Initial read, then one change each way — which is what lets the reader
    // rediscover the chapter when an extension is installed or removed.
    expect(seen).toEqual([0, 1, 0]);
  });
});

describe("registerContentType", () => {
  it("starts with no types", () => {
    expect(createDiscoverManager().contentTypes.value).toEqual([]);
  });

  it("lists a registered type", () => {
    const manager = createDiscoverManager();
    manager.registerContentType({ id: "sermon", title: "Sermons" });

    expect(manager.contentTypes.value.map((type) => type.id)).toEqual([
      "sermon",
    ]);
  });

  it("sorts by priority, keeping registration order for ties", () => {
    const manager = createDiscoverManager();
    manager.registerContentType({ id: "late", title: "Late", priority: 900 });
    manager.registerContentType({ id: "tie-a", title: "Tie A" });
    manager.registerContentType({ id: "early", title: "Early", priority: 10 });
    manager.registerContentType({ id: "tie-b", title: "Tie B" });

    expect(manager.contentTypes.value.map((type) => type.id)).toEqual([
      "early",
      "tie-a",
      "tie-b",
      "late",
    ]);
  });

  it("replaces an earlier definition with the same id", () => {
    const manager = createDiscoverManager();
    manager.registerContentType({ id: "sermon", title: "Sermons" });
    manager.registerContentType({
      id: "sermon",
      title: "Talks",
      hiddenByDefault: true,
    });

    expect(manager.contentTypes.value).toEqual([
      { id: "sermon", title: "Talks", hiddenByDefault: true },
    ]);
  });

  it("returns a function that removes the type again", () => {
    const manager = createDiscoverManager();
    const unregister = manager.registerContentType({
      id: "sermon",
      title: "Sermons",
    });

    unregister();

    expect(manager.contentTypes.value).toEqual([]);
  });

  it("does not remove a newer definition that replaced it", () => {
    const manager = createDiscoverManager();
    const unregisterOld = manager.registerContentType({
      id: "sermon",
      title: "Sermons",
    });
    const replacement = { id: "sermon", title: "Talks" };
    manager.registerContentType(replacement);

    unregisterOld();

    expect(manager.contentTypes.value).toEqual([replacement]);
  });
});
