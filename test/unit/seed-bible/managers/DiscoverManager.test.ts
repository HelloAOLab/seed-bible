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
