import { signal } from "@preact/signals";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APOLOGIST_DEFAULT_BIBLE,
  getEffectiveSeedTranslationForAi,
  isLikelyUnsupportedApologistBibleError,
  mapCandidateToApologistBible,
  postApologistChatCompletion,
  resolveApologistBible,
  type SeedTranslationRef,
} from "@packages/apologist-extension/ext_Apologist/main/apologistBible";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

function translation(
  partial: Partial<SeedTranslationRef> &
    Pick<SeedTranslationRef, "id" | "shortName" | "language">
): SeedTranslationRef {
  return {
    name: partial.name ?? partial.shortName,
    englishName: partial.englishName ?? partial.shortName,
    ...partial,
  };
}

describe("mapCandidateToApologistBible", () => {
  it("maps aliases like NASB95, KJAV/KJV, and WEB", () => {
    expect(mapCandidateToApologistBible("NASB95")).toBe("nasb1995");
    expect(mapCandidateToApologistBible("KJAV")).toBe("kjv");
    expect(mapCandidateToApologistBible("KJV")).toBe("kjv");
    expect(mapCandidateToApologistBible("WEB")).toBe("webu");
    expect(mapCandidateToApologistBible("BSB")).toBe("bsb");
  });
});

describe("resolveApologistBible", () => {
  it("maps Free Use ids eng_kjv / eng_esv / eng_nasb95 / eng_web without fallback", () => {
    const cases: Array<{
      id: string;
      shortName: string;
      expected: string;
    }> = [
      { id: "eng_kjv", shortName: "KJV", expected: "kjv" },
      { id: "eng_esv", shortName: "ESV", expected: "esv" },
      { id: "eng_nasb95", shortName: "NASB95", expected: "nasb1995" },
      { id: "eng_web", shortName: "WEB", expected: "webu" },
    ];

    for (const { id, shortName, expected } of cases) {
      expect(
        resolveApologistBible(translation({ id, shortName, language: "eng" }))
      ).toMatchObject({
        code: expected,
        usedFallback: false,
      });
    }
  });

  it("maps bare ids like BSB and KJAV without fallback", () => {
    expect(
      resolveApologistBible(
        translation({
          id: "BSB",
          shortName: "BSB",
          language: "eng",
        })
      )
    ).toMatchObject({ code: "bsb", usedFallback: false });

    expect(
      resolveApologistBible(
        translation({
          id: "KJAV",
          shortName: "KJAV",
          language: "eng",
        })
      )
    ).toMatchObject({ code: "kjv", usedFallback: false });
  });

  it("falls back to bsb for unsupported hin_cvb / guj_irv", () => {
    for (const id of ["hin_cvb", "guj_irv"] as const) {
      expect(
        resolveApologistBible(
          translation({
            id,
            shortName: id.toUpperCase(),
            language: id.slice(0, 3),
          })
        )
      ).toMatchObject({
        code: "bsb",
        usedFallback: true,
      });
    }
  });

  it("falls back to bsb when the tab translation is unsupported, even if another catalog translation would map", () => {
    expect(
      resolveApologistBible(
        translation({
          id: "spa_unknown",
          shortName: "UNK",
          language: "spa",
        })
      )
    ).toMatchObject({
      code: APOLOGIST_DEFAULT_BIBLE,
      usedFallback: true,
    });
  });
});

describe("getEffectiveSeedTranslationForAi", () => {
  it("uses the active tab translation, not a pinned AI default", () => {
    const tabTranslation = translation({
      id: "eng_kjv",
      shortName: "KJV",
      language: "eng",
    });
    const context = {
      app: {
        selectedTab: signal({
          readingState: {
            translation: signal(tabTranslation),
            translationId: signal("eng_kjv"),
          },
        }),
      },
      bibleData: {
        availableTranslations: signal([
          tabTranslation,
          translation({ id: "eng_esv", shortName: "ESV", language: "eng" }),
        ]),
      },
    } as unknown as SeedBibleState;

    expect(getEffectiveSeedTranslationForAi(context)).toMatchObject({
      id: "eng_kjv",
      shortName: "KJV",
    });
  });

  it("looks up the tab translation id in the catalog when the tab object is not loaded yet", () => {
    const catalogTranslation = translation({
      id: "eng_web",
      shortName: "WEB",
      language: "eng",
    });
    const context = {
      app: {
        selectedTab: signal({
          readingState: {
            translation: signal(null),
            translationId: signal("eng_web"),
          },
        }),
      },
      bibleData: {
        availableTranslations: signal([catalogTranslation]),
      },
    } as unknown as SeedBibleState;

    expect(getEffectiveSeedTranslationForAi(context)).toMatchObject({
      id: "eng_web",
      shortName: "WEB",
    });
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
