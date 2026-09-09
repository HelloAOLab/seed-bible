import { signal } from "@preact/signals";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APOLOGIST_DEFAULT_BIBLE,
  dismissApologistBibleFallbackWarning,
  isLikelyUnsupportedApologistBibleError,
  mapCandidateToApologistBible,
  pauseChatWhileModalOpen,
  postApologistChatCompletion,
  resolveApologistBible,
  SHOW_APOLOGIST_BIBLE_FALLBACK_WARNING,
  warnIfApologistBibleFallback,
  type SeedTranslationRef,
} from "@packages/apologist-extension/ext_Apologist/main/apologistBible";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { safeLocalStorage } from "@packages/seed-bible/seed-bible/app/ssrEnv";

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
      const result = resolveApologistBible({
        translation: translation({ id, shortName, language: "eng" }),
      });
      expect(result).toMatchObject({
        code: expected,
        usedFallback: false,
      });
    }
  });

  it("maps bare ids like BSB and KJAV without fallback", () => {
    expect(
      resolveApologistBible({
        translation: translation({
          id: "BSB",
          shortName: "BSB",
          language: "eng",
        }),
      })
    ).toMatchObject({ code: "bsb", usedFallback: false });

    expect(
      resolveApologistBible({
        translation: translation({
          id: "KJAV",
          shortName: "KJAV",
          language: "eng",
        }),
      })
    ).toMatchObject({ code: "kjv", usedFallback: false });
  });

  it("falls back to bsb for unsupported hin_cvb / guj_irv", () => {
    for (const id of ["hin_cvb", "guj_irv"] as const) {
      const result = resolveApologistBible({
        translation: translation({
          id,
          shortName: id.toUpperCase(),
          language: id.slice(0, 3),
        }),
        availableTranslations: [],
      });
      expect(result).toMatchObject({
        code: "bsb",
        usedFallback: true,
      });
    }
  });

  it("prefers a same-language supported catalog translation before English bsb", () => {
    const result = resolveApologistBible({
      translation: translation({
        id: "spa_unknown",
        shortName: "UNK",
        language: "spa",
      }),
      availableTranslations: [
        translation({ id: "spa_rv60", shortName: "RV60", language: "spa" }),
        translation({ id: "eng_esv", shortName: "ESV", language: "eng" }),
        translation({ id: "spa_nvi", shortName: "NIV", language: "spa" }),
      ],
    });

    expect(result).toMatchObject({
      code: "niv",
      usedFallback: true,
    });
  });
});

describe("pauseChatWhileModalOpen", () => {
  it("closes chat, waits for modal close, then reopens when chat was open", async () => {
    const isChatPanelOpen = signal(true);
    const closeChatPanel = vi.fn(() => {
      isChatPanelOpen.value = false;
    });
    const openChatPanel = vi.fn(() => {
      isChatPanelOpen.value = true;
    });
    const modals = signal<{ id: string }[]>([]);

    const context = {
      sidebar: {
        isChatPanelOpen,
        closeChatPanel,
        openChatPanel,
      },
      modals: {
        modals,
        openModal: vi.fn(),
        closeModal: (id: string) => {
          modals.value = modals.value.filter((modal) => modal.id !== id);
        },
      },
    } as unknown as Pick<SeedBibleState, "sidebar" | "modals">;

    const done = pauseChatWhileModalOpen(context, () => {
      modals.value = [...modals.value, { id: "test-modal" }];
      return "test-modal";
    });

    expect(closeChatPanel).toHaveBeenCalledTimes(1);
    expect(openChatPanel).not.toHaveBeenCalled();
    expect(isChatPanelOpen.value).toBe(false);

    context.modals.closeModal("test-modal");
    await done;

    expect(openChatPanel).toHaveBeenCalledTimes(1);
    expect(isChatPanelOpen.value).toBe(true);
  });

  it("does not reopen chat when it was already closed", async () => {
    const isChatPanelOpen = signal(false);
    const closeChatPanel = vi.fn();
    const openChatPanel = vi.fn();
    const modals = signal<{ id: string }[]>([]);

    const context = {
      sidebar: {
        isChatPanelOpen,
        closeChatPanel,
        openChatPanel,
      },
      modals: {
        modals,
        closeModal: (id: string) => {
          modals.value = modals.value.filter((modal) => modal.id !== id);
        },
      },
    } as unknown as Pick<SeedBibleState, "sidebar" | "modals">;

    const done = pauseChatWhileModalOpen(context, () => {
      modals.value = [...modals.value, { id: "test-modal" }];
      return "test-modal";
    });

    expect(closeChatPanel).not.toHaveBeenCalled();
    context.modals.closeModal("test-modal");
    await done;

    expect(openChatPanel).not.toHaveBeenCalled();
  });
});

describe("warnIfApologistBibleFallback", () => {
  beforeEach(() => {
    safeLocalStorage.removeItem(
      "sb-apologist-bible-fallback-warning-dismissed"
    );
  });

  afterEach(() => {
    safeLocalStorage.removeItem(
      "sb-apologist-bible-fallback-warning-dismissed"
    );
  });

  it("warns once for unsupported translations then skips after dismiss", async () => {
    const isChatPanelOpen = signal(true);
    const closeChatPanel = vi.fn(() => {
      isChatPanelOpen.value = false;
    });
    const openChatPanel = vi.fn(() => {
      isChatPanelOpen.value = true;
    });
    const modals = signal<{ id: string }[]>([]);
    const openModal = vi.fn(
      (registration: { id?: string; content: unknown }) => {
        const id = registration.id ?? "modal";
        modals.value = [...modals.value, { id }];
        return id;
      }
    );

    const context = {
      features: {
        isFeatureEnabled: (key: string) =>
          signal(key === SHOW_APOLOGIST_BIBLE_FALLBACK_WARNING),
      },
      sidebar: {
        isChatPanelOpen,
        closeChatPanel,
        openChatPanel,
      },
      modals: {
        modals,
        openModal,
        closeModal: (id: string) => {
          modals.value = modals.value.filter((modal) => modal.id !== id);
        },
      },
    } as unknown as SeedBibleState;

    const resolution = resolveApologistBible({
      translation: translation({
        id: "hin_cvb",
        shortName: "CVB",
        language: "hin",
        name: "Hindi CVB",
      }),
    });
    expect(resolution.usedFallback).toBe(true);

    const firstWarn = warnIfApologistBibleFallback(context, resolution);
    expect(openModal).toHaveBeenCalledTimes(1);
    dismissApologistBibleFallbackWarning();
    context.modals.closeModal("apologist-bible-fallback-warning");
    await firstWarn;

    openModal.mockClear();
    await warnIfApologistBibleFallback(context, resolution);
    expect(openModal).not.toHaveBeenCalled();
  });
});

describe("isLikelyUnsupportedApologistBibleError", () => {
  it("matches 400/422 bodies that mention bible/translation/metadata", () => {
    expect(
      isLikelyUnsupportedApologistBibleError(400, 'Unknown bible "esv"')
    ).toBe(true);
    expect(
      isLikelyUnsupportedApologistBibleError(
        422,
        "Invalid metadata.translation"
      )
    ).toBe(true);
  });

  it("ignores unrelated failures", () => {
    expect(isLikelyUnsupportedApologistBibleError(401, "Unauthorized")).toBe(
      false
    );
    expect(isLikelyUnsupportedApologistBibleError(500, "Internal error")).toBe(
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

  it("retries once with the default bible when the agent rejects the code", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Unknown bible "esv"' }), {
          status: 400,
        })
      )
      .mockResolvedValueOnce(new Response("ok-stream", { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await postApologistChatCompletion({
      url: "https://apologist.example/api/v1/chat/completions",
      model: "test-model",
      stream: true,
      language: "en",
      bible: "esv",
      messages: [],
    });

    expect(result.retriedWithDefault).toBe(true);
    expect(result.bible).toBe(APOLOGIST_DEFAULT_BIBLE);
    expect(result.response.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(
      (fetchMock.mock.calls[0]?.[1] as RequestInit).body as string
    );
    const secondBody = JSON.parse(
      (fetchMock.mock.calls[1]?.[1] as RequestInit).body as string
    );
    expect(firstBody.metadata.bible).toBe("esv");
    expect(secondBody.metadata.bible).toBe(APOLOGIST_DEFAULT_BIBLE);
  });

  it("does not retry auth failures or when already on the default bible", async () => {
    const authFailure = vi
      .fn()
      .mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    vi.stubGlobal("fetch", authFailure);

    const authResult = await postApologistChatCompletion({
      url: "https://apologist.example/api/v1/chat/completions",
      model: "test-model",
      stream: true,
      language: "en",
      bible: "esv",
      messages: [],
    });
    expect(authResult.retriedWithDefault).toBe(false);
    expect(authResult.bible).toBe("esv");
    expect(authFailure).toHaveBeenCalledTimes(1);

    const defaultFailure = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unknown bible" }), {
        status: 400,
      })
    );
    vi.stubGlobal("fetch", defaultFailure);

    const defaultResult = await postApologistChatCompletion({
      url: "https://apologist.example/api/v1/chat/completions",
      model: "test-model",
      stream: true,
      language: "en",
      bible: APOLOGIST_DEFAULT_BIBLE,
      messages: [],
    });
    expect(defaultResult.retriedWithDefault).toBe(false);
    expect(defaultFailure).toHaveBeenCalledTimes(1);
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
