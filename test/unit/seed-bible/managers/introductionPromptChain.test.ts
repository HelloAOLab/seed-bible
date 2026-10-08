import { createInMemoryTranslationStore } from "@packages/seed-bible/seed-bible/managers/OfflineTranslationStore";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import {
  aabBooks,
  createResponse,
  makeChapter,
  makeUrl,
  translations,
} from "./testUtils/mockBibleApiData";

/**
 * Declining the introduction ("No, thanks") or leaving that tour before the
 * end keeps both follow-up prompts quiet for the rest of the visit. Install
 * is the only one with a later trigger: the next visit shows it, unless this
 * device already dismissed it. Download is not deferred on its own — it keeps
 * its existing rules, and this visit it simply never gets a turn because the
 * install offer does not resolve.
 */

const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";
const TUTORIAL_SEEN_KEY = "sb-tutorial-seen";
const INSTALL_DISMISSED_KEY = "sb-install-dismissed";
const PROMPT_SHOWN_KEY = "sb-offline-prompt-shown";

function responsesWithAChapter() {
  return {
    [makeUrl("/api/available_translations.json", PRIVATE_API_ENDPOINT)]:
      createResponse(translations),
    [makeUrl("/api/AAB/books.json", PRIVATE_API_ENDPOINT)]:
      createResponse(aabBooks),
    [makeUrl("/api/AAB/GEN/1.json", PRIVATE_API_ENDPOINT)]: createResponse(
      makeChapter(aabBooks, "GEN", 1)
    ),
  };
}

async function createState() {
  const state = await createTestSeedBibleState({
    responses: responsesWithAChapter(),
    offlineStore: createInMemoryTranslationStore(),
  });
  await waitFor(
    () =>
      state.app.currentReadingState.value?.tab.readingState.chapterData.value !=
      null,
    2000
  );
  return state;
}

async function offerCard(state: SeedBibleState) {
  await waitFor(() => state.tutorial.promptVisible.value, 2000);
}

function finishTour(state: SeedBibleState) {
  let guard = 0;
  while (state.tutorial.running.value && guard < 30) {
    state.tutorial.next();
    guard += 1;
  }
  expect(state.tutorial.running.value).toBe(false);
}

describe("introduction tutorial follow-up prompts", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows scripture only after No thanks, then install on the next visit", async () => {
    const first = await createState();
    await offerCard(first);

    first.tutorial.dismissPrompt();

    expect(first.tutorial.promptVisible.value).toBe(false);
    expect(first.tutorial.running.value).toBe(false);
    expect(first.tutorial.skipPromptVisible.value).toBe(false);
    expect(first.tutorial.leftIntroductionEarly.value).toBe(true);
    expect(first.onboarding.step.value).toBe("done");
    expect(first.bibleData.offline.downloadPrompt.value).toBeNull();
    // Not dismissed — the next visit is allowed to show it.
    expect(window.localStorage.getItem(INSTALL_DISMISSED_KEY)).toBeNull();
    // Download was not offered, so its "already shown" record stays empty.
    expect(window.localStorage.getItem(PROMPT_SHOWN_KEY)).toBeNull();
    expect(window.localStorage.getItem(TUTORIAL_SEEN_KEY)).toBe("true");

    const second = await createState();

    expect(second.tutorial.leftIntroductionEarly.value).toBe(false);
    expect(second.onboarding.step.value).toBe("install");
    // Download still waits until install has had its turn.
    expect(second.bibleData.offline.downloadPrompt.value).toBeNull();

    second.onboarding.dismissInstall();

    await waitFor(
      () => second.bibleData.offline.downloadPrompt.value != null,
      2000
    );

    const third = await createState();

    // Dismissed on this device: never again.
    expect(third.onboarding.step.value).toBe("done");
    expect(third.bibleData.offline.downloadPrompt.value).toBeNull();
  });

  it("does not follow an early exit from the introduction tour with install or download", async () => {
    const state = await createState();
    await offerCard(state);

    state.tutorial.acceptPrompt();
    expect(state.tutorial.running.value).toBe(true);

    state.tutorial.skip();

    expect(state.tutorial.leftIntroductionEarly.value).toBe(true);
    expect(state.tutorial.skipPromptVisible.value).toBe(true);
    expect(state.onboarding.step.value).toBe("done");
    expect(state.bibleData.offline.downloadPrompt.value).toBeNull();
    expect(window.localStorage.getItem(INSTALL_DISMISSED_KEY)).toBeNull();
    expect(window.localStorage.getItem(PROMPT_SHOWN_KEY)).toBeNull();

    state.tutorial.keepTutorials();

    expect(state.onboarding.step.value).toBe("done");
    expect(state.bibleData.offline.downloadPrompt.value).toBeNull();
  });

  it("still offers install, then download, after the introduction tour is finished", async () => {
    const state = await createState();
    await offerCard(state);

    state.tutorial.acceptPrompt();
    finishTour(state);

    expect(state.tutorial.leftIntroductionEarly.value).toBe(false);
    expect(state.onboarding.step.value).toBe("install");
    expect(state.bibleData.offline.downloadPrompt.value).toBeNull();

    state.onboarding.dismissInstall();

    await waitFor(
      () => state.bibleData.offline.downloadPrompt.value != null,
      2000
    );
  });

  it("does not let a skipped contextual tip cancel the install prompt", async () => {
    const state = await createState();
    await offerCard(state);

    state.tutorial.startContextual("search");
    expect(state.tutorial.running.value).toBe(true);

    state.tutorial.skip();

    expect(state.tutorial.leftIntroductionEarly.value).toBe(false);
    expect(state.onboarding.step.value).toBe("done");

    state.tutorial.keepTutorials();
    state.tutorial.acceptPrompt();
    finishTour(state);

    expect(state.onboarding.step.value).toBe("install");
  });

  it("keeps download on its own rules when install was already dismissed", async () => {
    // Install was shown and dismissed on this device before the visitor ever
    // reached the introduction. That must stick. Download is a separate
    // prompt: quiet for the visit where the introduction is declined, then
    // offered on the next visit because nothing is saved and it has never
    // been shown — not because the introduction deferred it.
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "true");

    const first = await createState();
    await offerCard(first);
    first.tutorial.dismissPrompt();

    expect(first.onboarding.step.value).toBe("done");
    expect(first.bibleData.offline.downloadPrompt.value).toBeNull();
    expect(window.localStorage.getItem(PROMPT_SHOWN_KEY)).toBeNull();
    expect(window.localStorage.getItem(INSTALL_DISMISSED_KEY)).toBe("true");

    const second = await createState();

    expect(second.onboarding.step.value).toBe("done");
    expect(second.bibleData.offline.downloadPrompt.value).not.toBeNull();
  });
});
