// Real i18next isn't initialized in unit tests; the manager only needs to
// register translations and read the language.
vi.mock(
  "@packages/seed-bible/seed-bible/i18n/I18nManager",
  async (original) => ({
    ...(await original<object>()),
    addTranslations: vi.fn(),
    i18n: { language: "en", on: () => {} },
  })
);
import type { ExtensionManager } from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import type { SandboxHostMessage } from "@packages/seed-bible/seed-bible/extensions/protocol";
import { createRawFrame, sourced, useSandboxHarness } from "./sandboxHarness";

/*
 * What the host tells a frame about translations: every string it needs when
 * it starts, and again only when the language changes. The app's strings run
 * to over 100 KB, so they must not ride along with every state change.
 */

const TRANSLATIONS = {
  en: { title: "Verse Art", description: "Draws verses.", greeting: "Hello" },
  es: { title: "Arte", description: "Dibuja versículos.", greeting: "Hola" },
  fr: {
    title: "Art",
    description: "Dessine des versets.",
    greeting: "Bonjour",
  },
};

const stringsMessages = (messages: SandboxHostMessage[]) =>
  messages.filter((m) => m.type === "strings");
const stateMessages = (messages: SandboxHostMessage[]) =>
  messages.filter((m) => m.type === "state");

describe("sandboxed extension strings", () => {
  const h = useSandboxHarness();
  let manager: ExtensionManager;

  beforeEach(() => {
    manager = h.createManager();
    h.host.appStrings.en = { close: "Close", cancel: "Cancel" };
    h.host.appStrings.es = { close: "Cerrar" };
    h.host.appStrings.fr = { close: "Fermer" };
  });

  async function loadRawFrame() {
    const frame = createRawFrame();
    await manager.loadExtension(
      await h.publish(frame, { id: "ext.strings", translations: TRANSLATIONS })
    );
    // Messages already in flight from the install have arrived.
    await frame.call("storage.keys", {});
    return frame;
  }

  it("starts a frame with the app's strings and its own, in the current language and English", async () => {
    h.host.language.value = "es";
    const frame = await loadRawFrame();

    expect(frame.init!.strings).toEqual({
      language: "es",
      app: {
        es: { close: "Cerrar" },
        en: { close: "Close", cancel: "Cancel" },
      },
      extension: { es: TRANSLATIONS.es, en: TRANSLATIONS.en },
    });
  });

  it("sends English once when English is the language", async () => {
    const frame = await loadRawFrame();

    expect(Object.keys(frame.init!.strings!.app)).toEqual(["en"]);
    expect(Object.keys(frame.init!.strings!.extension)).toEqual(["en"]);
  });

  it("sends the strings again when the language changes, and not when anything else does", async () => {
    const frame = await loadRawFrame();
    const statesBefore = stateMessages(frame.messages).length;

    h.host.reading.value = { ...h.host.reading.value, chapterNumber: 9 };
    h.host.userId.value = "user-2";
    await frame.call("storage.keys", {});
    expect(stateMessages(frame.messages).length).toBeGreaterThan(statesBefore);
    expect(stringsMessages(frame.messages)).toEqual([]);

    h.host.language.value = "fr";
    await frame.call("storage.keys", {});
    expect(stringsMessages(frame.messages)).toEqual([
      {
        type: "strings",
        strings: {
          language: "fr",
          app: {
            fr: { close: "Fermer" },
            en: { close: "Close", cancel: "Cancel" },
          },
          extension: { fr: TRANSLATIONS.fr, en: TRANSLATIONS.en },
        },
      },
    ]);
  });

  it("sends the new strings before the state that names the new language", async () => {
    const frame = await loadRawFrame();
    const from = frame.messages.length;

    h.host.language.value = "fr";
    await frame.call("storage.keys", {});

    const sent = frame.messages.slice(from);
    const strings = sent.findIndex((m) => m.type === "strings");
    const state = sent.findIndex(
      (m) => m.type === "state" && m.state.language === "fr"
    );
    expect(strings).toBeGreaterThanOrEqual(0);
    expect(strings).toBeLessThan(state);
  });

  it("sends the app's strings once they load, to a frame that started before they had", async () => {
    // A first visit: the app is already in Japanese, but `ja` hasn't loaded.
    h.host.language.value = "ja";
    const frame = await loadRawFrame();
    expect(frame.init!.strings!.app.ja).toEqual({});

    h.host.loadAppStrings("ja", { close: "閉じる" });
    await frame.call("storage.keys", {});

    expect(stringsMessages(frame.messages)).toEqual([
      {
        type: "strings",
        strings: expect.objectContaining({
          language: "ja",
          app: expect.objectContaining({ ja: { close: "閉じる" } }),
        }),
      },
    ]);
  });

  it("doesn't send the strings again when another language loads", async () => {
    const frame = await loadRawFrame();

    h.host.loadAppStrings("de", { close: "Schließen" });
    await frame.call("storage.keys", {});

    expect(stringsMessages(frame.messages)).toEqual([]);
  });

  it("stops listening for loaded strings when the extension stops", async () => {
    // i18next lives as long as the page, so a listener left on it would keep
    // the stopped extension's session alive.
    await loadRawFrame();
    expect(h.host.loadedListenerCount()).toBe(1);

    manager.unloadExtension(sourced("ext.strings"));

    expect(h.host.loadedListenerCount()).toBe(0);
  });

  it("keeps the extension's own strings in the state, for extensions built before the strings message", async () => {
    h.host.language.value = "es";
    const frame = await loadRawFrame();
    expect(frame.init!.state.strings).toEqual({
      ...TRANSLATIONS.en,
      ...TRANSLATIONS.es,
    });

    h.host.language.value = "fr";
    await frame.call("storage.keys", {});
    const last = stateMessages(frame.messages).at(-1);
    expect(last).toMatchObject({
      state: { language: "fr", strings: { greeting: "Bonjour" } },
    });
  });
});
