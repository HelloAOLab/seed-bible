import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearEntityCache,
  fetchEntities,
  fetchVisualizationCatalog,
} from "@packages/bible-atlas-extension/ext_BibleAtlas/bibleAtlasApi";

interface FakeEntity {
  id: string;
  type: string;
  name: string;
  embed: { path: string; title: string } | null;
}

function entity(id: string, overrides: Partial<FakeEntity> = {}): FakeEntity {
  return {
    id,
    type: "person",
    name: id,
    embed: { path: `/embed/family/${id}`, title: id },
    ...overrides,
  };
}

function crossReferencesViz(id: string, ref: string) {
  return {
    id,
    type: "crossReferences",
    label: "Cross references",
    href: `/visualizations/cross-references?ref=${ref}`,
    embed: {
      path: `/embed/viz/cross-references?ref=${ref}`,
      title: "Bible Cross References",
    },
    image: { light: "/light.jpg", dark: "/dark.jpg" },
  };
}

function okResponse(
  entities: FakeEntity[],
  visualizations: ReturnType<typeof crossReferencesViz>[] = []
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data: {
        osisRef: "x",
        reference: "x",
        entities: entities.map((e) => ({
          ...e,
          geocoded: false,
          href: `/${e.id}`,
          image: "/og/person.png",
        })),
        entitiesTruncated: false,
        visualizations,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

describe("fetchEntities", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearEntityCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("requests verse-context with usfm, chapter and comma-joined verses", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      okResponse([entity("abraham")])
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchEntities("GEN", 12, [6, 7]);

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.origin).toBe("https://bible-atlas.com");
    expect(url.pathname).toBe("/api/v1/verse-context");
    expect(url.searchParams.get("usfm")).toBe("GEN");
    expect(url.searchParams.get("chapter")).toBe("12");
    expect(url.searchParams.get("verses")).toBe("6,7");
  });

  it("does not force-bypass the CDN cache", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      okResponse([entity("abraham")])
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchEntities("GEN", 12, [6]);

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.searchParams.has("_")).toBe(false);
  });

  it("returns entities followed by visualizations, in the order the server sent them", async () => {
    globalThis.fetch = vi.fn(async () =>
      okResponse(
        [entity("abraham"), entity("sarah")],
        [crossReferencesViz("crossReferences", "Gen.12.1-Gen.12.2")]
      )
    ) as unknown as typeof fetch;

    const result = await fetchEntities("GEN", 12, [1, 2]);

    expect(result.map((e) => [e.id, e.type, e.name])).toEqual([
      ["abraham", "person", "abraham"],
      ["sarah", "person", "sarah"],
      ["crossReferences", "visualization", "Cross references"],
    ]);
  });

  it("uses the visualization's own stable id, unmodified", async () => {
    // The API assigns each CTA a stable id — its slug, plus :subject when
    // the hit picks one subject within that chart — since the server (not
    // the client) now owns dedupe.
    globalThis.fetch = vi.fn(async () =>
      okResponse(
        [],
        [crossReferencesViz("wars-of-the-bible:battle-of-michmash", "1Sa.14.1")]
      )
    ) as unknown as typeof fetch;

    const result = await fetchEntities("1SA", 14, [1]);

    expect(result[0]!.id).toBe("wars-of-the-bible:battle-of-michmash");
  });

  it("returns an empty list when the request throws", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    await expect(fetchEntities("GEN", 12, [1, 2])).resolves.toEqual([]);
  });

  it("treats a success:false body as no entities", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: false,
            errors: [{ message: "Bad request" }],
          }),
          { status: 400 }
        )
    ) as unknown as typeof fetch;

    await expect(fetchEntities("XYZ", 1, [1])).resolves.toEqual([]);
  });

  it("drops entities that have nothing to embed", async () => {
    globalThis.fetch = vi.fn(async () =>
      okResponse([entity("abraham"), entity("no-page", { embed: null })])
    ) as unknown as typeof fetch;

    const result = await fetchEntities("GEN", 12, [1]);

    expect(result.map((e) => e.id)).toEqual(["abraham"]);
  });

  it("fetches the same selection once across calls", async () => {
    const fetchMock = vi.fn(async () => okResponse([entity("abraham")]));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchEntities("GEN", 12, [1, 2]);
    await fetchEntities("GEN", 12, [1, 2]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refetches when the verse selection changes", async () => {
    const fetchMock = vi.fn(async () => okResponse([entity("abraham")]));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchEntities("GEN", 12, [1]);
    await fetchEntities("GEN", 12, [1, 2]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a selection whose earlier request failed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls++;
      return calls === 1
        ? Promise.reject(new Error("network down"))
        : okResponse([entity("abraham")]);
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(fetchEntities("GEN", 12, [1])).resolves.toEqual([]);
    const second = await fetchEntities("GEN", 12, [1]);

    expect(second.map((e) => e.id)).toEqual(["abraham"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

interface CatalogItem {
  slug: string;
  title: string;
  embeds?: Array<{ path: string; title: string }>;
}

function catalogResponse(items: CatalogItem[]): Response {
  return new Response(JSON.stringify({ success: true, data: { items } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("fetchVisualizationCatalog", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearEntityCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("requests the visualizations catalog", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      catalogResponse([])
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchVisualizationCatalog();

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.origin).toBe("https://bible-atlas.com");
    expect(url.pathname).toBe("/api/v1/visualizations");
  });

  it("does not force-bypass the CDN cache", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      catalogResponse([])
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchVisualizationCatalog();

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.searchParams.has("_")).toBe(false);
  });

  it("lists every embed of a catalog item, not just the first", async () => {
    globalThis.fetch = vi.fn(async () =>
      catalogResponse([
        {
          slug: "judges",
          title: "Judges",
          embeds: [
            {
              path: "/embed/viz/judges-timeline",
              title: "Judges — overlap timeline",
            },
            { path: "/embed/viz/judges-map", title: "Judges — oppressor map" },
            {
              path: "/embed/viz/judges-cycle",
              title: "Judges — deliverance cycle",
            },
          ],
        },
        {
          slug: "bloodline",
          title: "God's Bloodline",
          embeds: [{ path: "/embed/viz/bloodline", title: "God's Bloodline" }],
        },
      ])
    ) as unknown as typeof fetch;

    const result = await fetchVisualizationCatalog();

    expect(result.map((v) => v.title)).toEqual([
      "Judges — overlap timeline",
      "Judges — oppressor map",
      "Judges — deliverance cycle",
      "God's Bloodline",
    ]);
    expect(result.map((v) => v.embed.path)).toEqual([
      "/embed/viz/judges-timeline",
      "/embed/viz/judges-map",
      "/embed/viz/judges-cycle",
      "/embed/viz/bloodline",
    ]);
    // Ids stay unique even though every embed shares its item's slug.
    expect(new Set(result.map((v) => v.id)).size).toBe(result.length);
  });

  it("skips an item with no embeds instead of crashing the catalog", async () => {
    globalThis.fetch = vi.fn(async () =>
      catalogResponse([
        { slug: "broken", title: "Broken" },
        {
          slug: "bloodline",
          title: "God's Bloodline",
          embeds: [{ path: "/embed/viz/bloodline", title: "God's Bloodline" }],
        },
      ])
    ) as unknown as typeof fetch;

    const result = await fetchVisualizationCatalog();

    expect(result.map((v) => v.id)).toEqual(["bloodline:0"]);
  });

  it("returns an empty list when the catalog request fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    await expect(fetchVisualizationCatalog()).resolves.toEqual([]);
  });

  it("fetches the catalog once across calls", async () => {
    const fetchMock = vi.fn(async () =>
      catalogResponse([
        {
          slug: "bloodline",
          title: "God's Bloodline",
          embeds: [{ path: "/embed/viz/bloodline", title: "God's Bloodline" }],
        },
      ])
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchVisualizationCatalog();
    await fetchVisualizationCatalog();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
