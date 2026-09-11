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

function crossReferencesViz(ref: string) {
  return {
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

/** Routes each verse-context request by its `verse` query param. */
function fetchByVerse(
  handlers: Record<number, () => Promise<Response> | Response>
) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    const verse = Number(url.searchParams.get("verse"));
    const handler = handlers[verse];
    if (!handler) {
      throw new Error(`Unexpected request for verse ${verse}: ${url}`);
    }
    return handler();
  });
}

describe("fetchEntities", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearEntityCache();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("requests verse-context with usfm, chapter and verse", async () => {
    const fetchMock = fetchByVerse({
      6: () => okResponse([entity("abraham")]),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchEntities("GEN", 12, [6]);

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.origin).toBe("https://bible-atlas.com");
    expect(url.pathname).toBe("/api/v1/verse-context");
    expect(url.searchParams.get("usfm")).toBe("GEN");
    expect(url.searchParams.get("chapter")).toBe("12");
    expect(url.searchParams.get("verse")).toBe("6");
  });

  it("does not force-bypass the CDN cache", async () => {
    const fetchMock = fetchByVerse({
      6: () => okResponse([entity("abraham")]),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchEntities("GEN", 12, [6]);

    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.searchParams.has("_")).toBe(false);
  });

  it("merges entities across verses in verse order, dropping duplicates", async () => {
    globalThis.fetch = fetchByVerse({
      1: () => okResponse([entity("abraham"), entity("god")]),
      2: () => okResponse([entity("sarah"), entity("abraham")]),
    }) as unknown as typeof fetch;

    const result = await fetchEntities("GEN", 12, [1, 2]);

    expect(result.map((e) => e.id)).toEqual(["abraham", "god", "sarah"]);
  });

  it("lists the first verse's visualization after every entity, once per type", async () => {
    globalThis.fetch = fetchByVerse({
      1: () =>
        okResponse([entity("abraham")], [crossReferencesViz("Gen.12.1")]),
      2: () => okResponse([entity("sarah")], [crossReferencesViz("Gen.12.2")]),
    }) as unknown as typeof fetch;

    const result = await fetchEntities("GEN", 12, [1, 2]);

    expect(result.map((e) => [e.id, e.type, e.name])).toEqual([
      ["abraham", "person", "abraham"],
      ["sarah", "person", "sarah"],
      [
        "viz:crossReferences:Cross references",
        "visualization",
        "Cross references",
      ],
    ]);
    expect(result[2]!.embed.path).toBe(
      "/embed/viz/cross-references?ref=Gen.12.1"
    );
  });

  it("keeps two distinct visualizations of the same type from one verse", async () => {
    // Acts 15:8 links to both Paul's and Peter's journey maps, both typed
    // "journey" — the type alone isn't enough to identify them.
    globalThis.fetch = fetchByVerse({
      8: () =>
        okResponse(
          [],
          [
            {
              type: "journey",
              label: "Paul's Missionary Journeys",
              href: "",
              embed: {
                path: "/embed/journey/pauls-journey?journey=first-missionary-journey&stop=22",
                title: "Paul's Missionary Journeys",
              },
              image: { light: "", dark: "" },
            },
            {
              type: "journey",
              label: "Peter's Ministry Map",
              href: "",
              embed: {
                path: "/embed/journey/peters-journey?journey=peters-ministry&stop=26",
                title: "Peter's Ministry",
              },
              image: { light: "", dark: "" },
            },
          ]
        ),
    }) as unknown as typeof fetch;

    const result = await fetchEntities("ACT", 15, [8]);

    expect(result.map((e) => e.name)).toEqual([
      "Paul's Missionary Journeys",
      "Peter's Ministry Map",
    ]);
  });

  it("returns the other verses' entities when one request throws", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.fetch = fetchByVerse({
      1: () => Promise.reject(new Error("network down")),
      2: () => okResponse([entity("sarah")]),
    }) as unknown as typeof fetch;

    const result = await fetchEntities("GEN", 12, [1, 2]);

    expect(result.map((e) => e.id)).toEqual(["sarah"]);
  });

  it("treats a success:false body as no entities", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.fetch = fetchByVerse({
      1: () =>
        new Response(
          JSON.stringify({
            success: false,
            errors: [{ message: "Bad request" }],
          }),
          { status: 400 }
        ),
    }) as unknown as typeof fetch;

    await expect(fetchEntities("XYZ", 1, [1])).resolves.toEqual([]);
  });

  it("drops entities that have nothing to embed", async () => {
    globalThis.fetch = fetchByVerse({
      1: () =>
        okResponse([entity("abraham"), entity("no-page", { embed: null })]),
    }) as unknown as typeof fetch;

    const result = await fetchEntities("GEN", 12, [1]);

    expect(result.map((e) => e.id)).toEqual(["abraham"]);
  });

  it("fetches each verse once across calls", async () => {
    const fetchMock = fetchByVerse({
      1: () => okResponse([entity("abraham")]),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await fetchEntities("GEN", 12, [1]);
    await fetchEntities("GEN", 12, [1]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a verse whose earlier request failed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    let calls = 0;
    const fetchMock = fetchByVerse({
      1: () => {
        calls++;
        return calls === 1
          ? Promise.reject(new Error("network down"))
          : okResponse([entity("abraham")]);
      },
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
