import { signal } from "@preact/signals";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APOLOGIST_DEFAULT_BIBLE,
  getEffectiveSeedTranslationForAi,
  isLikelyUnsupportedApologistBibleError,
  mapCandidateToApologistBible,
  postApologistChatCompletion,
  resolveApologistBible,
} from "@packages/apologist-extension/ext_Apologist/main/apologistBible";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  AAB,
  BSB,
  ENG_CPB,
  ENG_KJA,
  ENG_KJV,
  ENG_NET,
  ENG_WEB,
  ENG_WEBU,
  ENGWEBP,
  FRA_LSG,
  GUJ_IRV,
  HIN_CVB,
  NASB2020,
  NASB95,
  type CatalogTranslation,
} from "../seed-bible/testUtils/catalogTranslations";

function createTabContext(options: {
  translation: CatalogTranslation | null;
  translationId: string;
  catalog: CatalogTranslation[];
}): SeedBibleState {
  return {
    app: {
      selectedTab: signal({
        readingState: {
          translation: signal(options.translation),
          translationId: signal(options.translationId),
        },
      }),
    },
    bibleData: {
      availableTranslations: signal(options.catalog),
    },
  } as unknown as SeedBibleState;
}

describe("mapCandidateToApologistBible", () => {
  it("maps aliases like NASB95/NASB2020, KJAV/KJVA/KJVCP/KJV, and WEB", () => {
    expect(mapCandidateToApologistBible("NASB95")).toBe("nasb1995");
    expect(mapCandidateToApologistBible("NASB2020")).toBe("nasb");
    expect(mapCandidateToApologistBible("KJAV")).toBe("kjv");
    expect(mapCandidateToApologistBible("KJVA")).toBe("kjv");
    expect(mapCandidateToApologistBible("KJVCP")).toBe("kjv");
    expect(mapCandidateToApologistBible("KJV")).toBe("kjv");
    expect(mapCandidateToApologistBible("WEB")).toBe("webu");
    expect(mapCandidateToApologistBible("BSB")).toBe("bsb");
  });
});

describe("resolveApologistBible", () => {
  it("maps real English translations onto their Apologist code without fallback", () => {
    const cases: Array<[CatalogTranslation, string]> = [
      [BSB, "bsb"],
      [ENG_KJV, "kjv"],
      [ENG_KJA, "kjv"],
      [ENG_CPB, "kjv"],
      [ENGWEBP, "webu"],
      // Short name WEBC matches nothing; the stripped id "web" does.
      [ENG_WEB, "webu"],
      [ENG_WEBU, "webu"],
      // Short name NETB matches nothing; the stripped id "net" does.
      [ENG_NET, "net"],
      [NASB95, "nasb1995"],
      [NASB2020, "nasb"],
    ];

    for (const [translation, code] of cases) {
      expect(resolveApologistBible(translation), translation.id).toEqual({
        code,
        usedFallback: false,
      });
    }
  });

  it("falls back to bsb for real translations Apologist doesn't have", () => {
    for (const translation of [AAB, FRA_LSG, HIN_CVB, GUJ_IRV]) {
      expect(resolveApologistBible(translation), translation.id).toEqual({
        code: APOLOGIST_DEFAULT_BIBLE,
        usedFallback: true,
      });
    }
  });

  it("falls back to bsb when there is no translation", () => {
    expect(resolveApologistBible(null)).toEqual({
      code: APOLOGIST_DEFAULT_BIBLE,
      usedFallback: true,
    });
  });
});

describe("getEffectiveSeedTranslationForAi", () => {
  it("uses the active tab's translation", () => {
    const context = createTabContext({
      translation: ENG_KJV,
      translationId: ENG_KJV.id,
      catalog: [BSB, ENG_KJV],
    });

    expect(getEffectiveSeedTranslationForAi(context)).toMatchObject({
      id: "eng_kjv",
      shortName: "KJAV",
    });
  });

  it("looks up the tab translation id in the catalog when the tab object is not loaded yet", () => {
    const context = createTabContext({
      translation: null,
      translationId: ENGWEBP.id,
      catalog: [BSB, ENGWEBP],
    });

    expect(getEffectiveSeedTranslationForAi(context)).toMatchObject({
      id: "ENGWEBP",
      shortName: "WEB",
    });
  });

  it("falls back to bsb for an unsupported tab translation, even when the catalog holds a supported one", () => {
    const context = createTabContext({
      translation: FRA_LSG,
      translationId: FRA_LSG.id,
      catalog: [ENG_KJV, FRA_LSG],
    });

    expect(
      resolveApologistBible(getEffectiveSeedTranslationForAi(context))
    ).toEqual({ code: APOLOGIST_DEFAULT_BIBLE, usedFallback: true });
  });
});

describe("isLikelyUnsupportedApologistBibleError", () => {
  it("only treats bible/translation/metadata 400/422 bodies as rejectable", () => {
    expect(
      isLikelyUnsupportedApologistBibleError(400, 'Unknown bible "lsb"')
    ).toBe(true);
    expect(
      isLikelyUnsupportedApologistBibleError(422, "Invalid translation id")
    ).toBe(true);
    expect(
      isLikelyUnsupportedApologistBibleError(400, "Invalid metadata.bible")
    ).toBe(true);
    expect(isLikelyUnsupportedApologistBibleError(401, "Unauthorized")).toBe(
      false
    );
    expect(isLikelyUnsupportedApologistBibleError(500, "bible boom")).toBe(
      false
    );
    expect(isLikelyUnsupportedApologistBibleError(400, "rate limited")).toBe(
      false
    );
  });
});

describe("postApologistChatCompletion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries once with the default bible when the agent rejects the mapped code", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Unknown bible "lsb"' }), {
          status: 400,
        })
      )
      .mockResolvedValueOnce(
        new Response("data: [DONE]\n\n", {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await postApologistChatCompletion({
      url: "https://apologist.example/api/v1/chat/completions",
      model: "test-model",
      stream: true,
      language: "en",
      bible: "lsb",
      messages: [],
    });

    expect(result.retriedWithDefault).toBe(true);
    expect(result.bible).toBe(APOLOGIST_DEFAULT_BIBLE);
    expect(result.response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(
      (fetchMock.mock.calls[0]![1] as RequestInit).body as string
    );
    const secondBody = JSON.parse(
      (fetchMock.mock.calls[1]![1] as RequestInit).body as string
    );
    expect(firstBody.metadata.bible).toBe("lsb");
    expect(secondBody.metadata.bible).toBe(APOLOGIST_DEFAULT_BIBLE);
  });

  it("does not retry auth or unrelated 400 errors", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
      .mockResolvedValueOnce(new Response("rate limited", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const auth = await postApologistChatCompletion({
      url: "https://apologist.example/api/v1/chat/completions",
      model: "test-model",
      stream: true,
      language: "en",
      bible: "esv",
      messages: [],
    });
    expect(auth.retriedWithDefault).toBe(false);
    expect(auth.bible).toBe("esv");
    expect(auth.response.status).toBe(401);

    const other = await postApologistChatCompletion({
      url: "https://apologist.example/api/v1/chat/completions",
      model: "test-model",
      stream: true,
      language: "en",
      bible: "esv",
      messages: [],
    });
    expect(other.retriedWithDefault).toBe(false);
    expect(other.response.status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
