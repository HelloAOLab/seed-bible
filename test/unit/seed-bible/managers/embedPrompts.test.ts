import { createInMemoryTranslationStore } from "@packages/seed-bible/seed-bible/managers/OfflineTranslationStore";
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
 * First-run chrome that a partner-site embed must never start: the tutorial
 * offer, the install-to-home-screen modal, and the offline-download offer.
 * Each is gated where it is triggered, the same way Today refuses to open.
 *
 * A chapter has to actually load, or `readerVisible` stays false and these
 * assertions would hold no matter what the embed gate did. The non-embed
 * cases are the control: the same loaded chapter starts the prompt, so a
 * passing embed case is the gate.
 */

const PRIVATE_API_ENDPOINT = "https://vmfnri.helloao.org";
const TUTORIAL_SEEN_KEY = "sb-tutorial-seen";
const INSTALL_DISMISSED_KEY = "sb-install-dismissed";

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

async function createState(options: { embed?: boolean; offline?: boolean }) {
  const state = await createTestSeedBibleState({
    responses: responsesWithAChapter(),
    embed: options.embed,
    offlineStore: options.offline
      ? createInMemoryTranslationStore()
      : undefined,
  });
  await waitFor(
    () =>
      state.app.currentReadingState.value?.tab.readingState.chapterData.value !=
      null,
    2000
  );
  return state;
}

describe("first-run prompts in a compact embed", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("offers the tutorial once a chapter is loaded", async () => {
    const state = await createState({});

    expect(state.today.isOpen.value).toBe(false);
    await waitFor(() => state.tutorial.promptVisible.value, 2000);
    expect(state.tutorial.promptVisible.value).toBe(true);
  });

  it("does not offer, run, or follow up the tutorial in an embed", async () => {
    const state = await createState({ embed: true });

    expect(state.today.isOpen.value).toBe(false);
    expect(state.tutorial.promptVisible.value).toBe(false);
    expect(state.tutorial.running.value).toBe(false);
    expect(state.tutorial.skipPromptVisible.value).toBe(false);
  });

  it("opens the install prompt once the tutorial is already resolved", async () => {
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, "true");

    const state = await createState({});

    expect(state.onboarding.step.value).toBe("install");
  });

  it("does not open the install prompt in an embed", async () => {
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, "true");

    const state = await createState({ embed: true });

    expect(state.today.isOpen.value).toBe(false);
    expect(state.onboarding.step.value).toBe("done");
  });

  it("offers to save the current translation once install has been dismissed", async () => {
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "true");

    const state = await createState({ offline: true });

    expect(state.bibleData.offline.downloadPrompt.value).not.toBeNull();
  });

  it("does not offer to save the translation in an embed", async () => {
    window.localStorage.setItem(TUTORIAL_SEEN_KEY, "true");
    window.localStorage.setItem(INSTALL_DISMISSED_KEY, "true");

    const state = await createState({ embed: true, offline: true });

    expect(state.bibleData.offline.downloadPrompt.value).toBeNull();
  });
});
