import { render } from "preact";
import { act } from "preact/test-utils";
import {
  createSandboxClient,
  defineExtension,
  useI18n,
  type SandboxContext,
} from "@packages/seed-bible/seed-bible/extensions";
import {
  createTestHost,
  type TestHost,
  type TestHostOptions,
} from "@packages/seed-bible/seed-bible/extensions/testing";
import {
  SANDBOX_PROTOCOL_VERSION,
  type SandboxInit,
  type SandboxState,
  type SandboxStrings,
} from "@packages/seed-bible/seed-bible/extensions/protocol";
import { setDefaultI18n } from "@packages/seed-bible/seed-bible/i18n/I18nContext";
import { BottomSheet } from "@packages/seed-bible/seed-bible/components/BottomSheet/BottomSheet";
import { CloseButton } from "@packages/seed-bible/seed-bible/components/CloseButton/CloseButton";

/*
 * Translations inside a sandboxed extension's frame: `sb.i18n`, `useI18n`, and
 * the shared components, all reading the strings the host sends, through one
 * i18next.
 */

const TRANSLATIONS = {
  en: {
    greeting: "Hello",
    farewell: "Goodbye",
    verses_one: "{{count}} verse",
    verses_other: "{{count}} verses",
  },
  es: { greeting: "Hola" },
  ar: { greeting: "مرحبا" },
};

const APP_TRANSLATIONS = {
  en: { close: "Close", greeting: "The app's hello" },
  es: { close: "Cerrar" },
  ar: { close: "إغلاق" },
};

let seen: SandboxContext | null = null;

const extension = defineExtension({
  main: async (sb) => {
    seen = sb;
  },
  views: {
    hooks: ({ sb }) => {
      const own = useI18n(sb.extensionId);
      const app = useI18n();
      return (
        <p>
          <span class="own">{own.t("greeting")}</span>
          <span class="app">{app.t("close")}</span>
          <span class="sb">{sb.i18n.t("greeting")}</span>
        </p>
      );
    },
    // The extension's own hook, borrowing one of the app's strings by `ns`.
    borrowing: ({ sb }) => {
      const { t } = useI18n(sb.extensionId);
      const close = { ns: "seed-bible", defaultValue: "Close" };
      return (
        <p>
          <span class="hook">{t("close", close)}</span>
          <span class="sb">{sb.i18n.t("close", close)}</span>
          <span class="undefined-ns">{t("greeting", { ns: undefined })}</span>
        </p>
      );
    },
    // Nothing but `sb.i18n.t`, so only it can make the view redraw.
    sbOnly: ({ sb }) => <p class="sb-only">{sb.i18n.t("greeting")}</p>,
    components: () => (
      <BottomSheet label="Sheet" onClose={() => {}} portal={false}>
        <CloseButton onClose={() => {}} />
      </BottomSheet>
    ),
  },
});

describe("translations in a sandboxed extension", () => {
  const hosts: TestHost[] = [];

  async function start(options: TestHostOptions = {}) {
    const host = await createTestHost(extension, {
      translations: TRANSLATIONS,
      appTranslations: APP_TRANSLATIONS,
      ...options,
    });
    hosts.push(host);
    await host.ready;
    return { host, sb: seen! };
  }

  afterEach(() => {
    for (const host of hosts.splice(0)) host.dispose();
    seen = null;
    setDefaultI18n(null);
    document.body.innerHTML = "";
  });

  describe("sb.i18n.t", () => {
    it("reads the extension's own strings in the current language", async () => {
      const { sb } = await start({ state: { language: "es" } });
      expect(sb.i18n.t("greeting")).toBe("Hola");
    });

    it("falls back to English, then the default text, then the key", async () => {
      const { sb } = await start({ state: { language: "es" } });
      expect(sb.i18n.t("farewell")).toBe("Goodbye");
      expect(sb.i18n.t("missing", { defaultValue: "Default" })).toBe("Default");
      expect(sb.i18n.t("missing")).toBe("missing");
    });

    it("fills in values", async () => {
      const { sb } = await start();
      expect(
        sb.i18n.t("missing", { defaultValue: "Hi {{name}}", name: "Ann" })
      ).toBe("Hi Ann");
    });

    it("picks the plural form for a count", async () => {
      const { sb } = await start();
      expect(sb.i18n.t("verses", { count: 1 })).toBe("1 verse");
      expect(sb.i18n.t("verses", { count: 3 })).toBe("3 verses");
    });

    it("never answers with one of the app's strings", async () => {
      const { sb } = await start();
      expect(sb.i18n.t("close", { defaultValue: "Own default" })).toBe(
        "Own default"
      );
    });

    it("only fills in placeholders with the older way's values, whatever they're called", async () => {
      const { sb } = await start({
        state: { language: "es" },
        translations: {
          ...TRANSLATIONS,
          es: { ...TRANSLATIONS.es, shown: "Mostrado en {{lng}} por {{ns}}" },
        },
      });

      expect(
        sb.i18n.t("shown", "Shown in {{lng}} by {{ns}}", {
          lng: "Genesis",
          ns: "Moses",
        })
      ).toBe("Mostrado en Genesis por Moses");
    });

    it("reads the extension's strings when ns is left undefined", async () => {
      const { sb } = await start({ state: { language: "es" } });
      expect(sb.i18n.t("greeting", { ns: undefined })).toBe("Hola");
    });

    it("still takes the default text and values the older way", async () => {
      const { sb } = await start();
      expect(sb.i18n.t("missing", "Default")).toBe("Default");
      expect(sb.i18n.t("missing", "Hi {{name}}", { name: "Ann" })).toBe(
        "Hi Ann"
      );
      expect(sb.i18n.t("verses", undefined, { count: 3 })).toBe("3 verses");
    });

    it("follows the language when the app changes it", async () => {
      const { host, sb } = await start();
      await host.setState({ language: "es" });
      expect(sb.i18n.t("greeting")).toBe("Hola");
    });

    it("already answers in the new language when sb.i18n.language reports it", async () => {
      const { host, sb } = await start();
      // `subscribe` runs untracked: it reads `t` once, at that moment.
      const seen: string[] = [];
      sb.i18n.language.subscribe((language) =>
        seen.push(`${language}: ${sb.i18n.t("greeting")}`)
      );

      await host.setState({ language: "es" });

      expect(seen).toEqual(["en: Hello", "es: Hola"]);
    });

    it("works with an id like the app gives a published extension", async () => {
      const { sb } = await start({
        extensionId: "https://files.example.com/publisher-a/#verse-art",
        state: { language: "es" },
      });
      expect(sb.i18n.t("greeting")).toBe("Hola");
    });
  });

  describe('sb.i18n.t with ns: "seed-bible"', () => {
    const app = (options: Record<string, unknown> = {}) => ({
      ns: "seed-bible",
      ...options,
    });

    it("reads the app's strings in the current language", async () => {
      const { sb } = await start({ state: { language: "es" } });
      expect(sb.i18n.t("close", app({ defaultValue: "Close" }))).toBe("Cerrar");
    });

    it("never answers with one of the extension's own strings", async () => {
      const { sb } = await start();
      expect(sb.i18n.t("farewell", app({ defaultValue: "App default" }))).toBe(
        "App default"
      );
      expect(sb.i18n.t("greeting", app())).toBe("The app's hello");
    });

    it("shows the default text without the app's strings", async () => {
      const { sb } = await start({ appTranslations: {} });
      expect(sb.i18n.t("close", app({ defaultValue: "Close" }))).toBe("Close");
    });
  });

  describe("in a view", () => {
    it("gives useI18n(sb.extensionId) the extension's strings and useI18n() the app's", async () => {
      const { host } = await start({ state: { language: "es" } });
      const view = await host.renderView("hooks");

      expect(view.querySelector(".own")!.textContent).toBe("Hola");
      expect(view.querySelector(".app")!.textContent).toBe("Cerrar");
      expect(view.querySelector(".sb")!.textContent).toBe("Hola");
    });

    it("lets useI18n(sb.extensionId) read the app's strings when a call names them, as sb.i18n.t does", async () => {
      const { host } = await start({ state: { language: "es" } });
      const view = await host.renderView("borrowing");

      expect(view.querySelector(".hook")!.textContent).toBe("Cerrar");
      expect(view.querySelector(".sb")!.textContent).toBe("Cerrar");
      // An `ns` left undefined still means the extension's own strings.
      expect(view.querySelector(".undefined-ns")!.textContent).toBe("Hola");
    });

    it("re-renders in the new language when the app changes it", async () => {
      const { host } = await start();
      const view = await host.renderView("hooks");
      expect(view.querySelector(".app")!.textContent).toBe("Close");

      await act(() => host.setState({ language: "es" }));

      expect(view.querySelector(".own")!.textContent).toBe("Hola");
      expect(view.querySelector(".app")!.textContent).toBe("Cerrar");
      expect(view.querySelector(".sb")!.textContent).toBe("Hola");
    });

    it("redraws a view that only calls sb.i18n.t when the language changes", async () => {
      const { host } = await start();
      const view = await host.renderView("sbOnly");
      expect(view.textContent).toBe("Hello");

      await act(() => host.setState({ language: "es" }));

      expect(view.textContent).toBe("Hola");
    });

    it("redraws when the strings change and the language doesn't", async () => {
      const { host } = await start({
        translations: undefined,
        state: { language: "es", strings: { greeting: "Hola" } },
      });
      const view = await host.renderView("sbOnly");
      expect(view.textContent).toBe("Hola");

      await act(() => host.setState({ strings: { greeting: "¡Hola!" } }));

      expect(view.textContent).toBe("¡Hola!");
    });

    it("gives each host's views their own frame's strings", async () => {
      const { host: first } = await start();
      const view = await first.renderView("hooks");
      // A second host's view, rendered later, makes its strings the page's
      // default.
      const { host: arabic } = await start({ state: { language: "ar" } });
      await arabic.renderView("hooks");

      // The first view redraws, and must still read its own frame's strings.
      await act(() => first.setState({ language: "es" }));

      expect(view.querySelector(".own")!.textContent).toBe("Hola");
      expect(view.querySelector(".app")!.textContent).toBe("Cerrar");
    });

    it("leaves no strings behind for the next test once disposed", async () => {
      const { host } = await start({ state: { language: "es" } });
      host.dispose();

      const root = document.body.appendChild(document.createElement("div"));
      act(() => render(<CloseButton onClose={() => {}} />, root));

      expect(
        root.querySelector(".sb-close-button")!.getAttribute("aria-label")
      ).toBe("Close");
      render(null, root);
    });

    it("translates shared components and lays them out right to left in Arabic", async () => {
      const { host } = await start({ state: { language: "ar" } });
      const view = await host.renderView("components");

      expect(
        view.querySelector(".sb-close-button")!.getAttribute("aria-label")
      ).toBe("إغلاق");
      expect(view.querySelector(".sb-bottom-sheet")!.getAttribute("dir")).toBe(
        "rtl"
      );
    });
  });

  describe("with the testing helpers' older options", () => {
    it("uses state.strings as the extension's strings", async () => {
      const { sb } = await start({
        translations: undefined,
        state: { language: "es", strings: { greeting: "Hola" } },
      });
      expect(sb.i18n.t("greeting")).toBe("Hola");
    });
  });
});

describe("translations from a host older than the strings message", () => {
  const DEFAULT_STATE: SandboxState = {
    themeCss: "",
    language: "es",
    direction: "ltr",
    strings: { greeting: "Hola" },
    isMobile: false,
    position: null,
    selection: [],
    identity: null,
    fontStylesheets: [],
    session: null,
    playback: null,
  };

  afterEach(() => {
    setDefaultI18n(null);
    render(null, document.body);
  });

  it("reads the extension's strings from the state, and follows them there", async () => {
    const channel = new MessageChannel();
    const init: SandboxInit = {
      protocol: SANDBOX_PROTOCOL_VERSION,
      extensionId: "old-host-extension",
      mode: { kind: "background" },
      granted: [],
      optional: [],
      state: DEFAULT_STATE,
    };
    const { sb } = createSandboxClient(channel.port2, init);
    expect(sb.i18n.t("greeting")).toBe("Hola");
    expect(
      sb.i18n.t("close", { ns: "seed-bible", defaultValue: "Close" })
    ).toBe("Close");
    const seen: string[] = [];
    sb.i18n.language.subscribe((language) =>
      seen.push(`${language}: ${sb.i18n.t("greeting")}`)
    );

    channel.port1.postMessage({
      type: "state",
      state: { language: "fr", strings: { greeting: "Bonjour" } },
    });
    await vi.waitFor(() => expect(sb.i18n.t("greeting")).toBe("Bonjour"));
    // The language never arrived ahead of its strings.
    expect(seen).toEqual(["es: Hola", "fr: Bonjour"]);

    channel.port1.close();
    channel.port2.close();
  });
});

describe("the app's strings arriving after a frame starts", () => {
  afterEach(() => setDefaultI18n(null));

  it("redraws a shared component already on screen", async () => {
    const channel = new MessageChannel();
    const strings = (close?: string): SandboxStrings => ({
      language: "ja",
      app: { ja: close ? { close } : {}, en: { close: "Close" } },
      extension: { ja: {}, en: {} },
    });
    createSandboxClient(channel.port2, {
      protocol: SANDBOX_PROTOCOL_VERSION,
      extensionId: "late-strings-extension",
      mode: { kind: "background" },
      granted: [],
      optional: [],
      state: {
        themeCss: "",
        language: "ja",
        direction: "ltr",
        strings: {},
        isMobile: false,
        position: null,
        selection: [],
        identity: null,
        fontStylesheets: [],
        session: null,
        playback: null,
      },
      // The app is in Japanese, but its Japanese strings haven't loaded.
      strings: strings(),
    });
    const root = document.body.appendChild(document.createElement("div"));
    act(() => render(<CloseButton onClose={() => {}} />, root));
    const label = () =>
      root.querySelector(".sb-close-button")!.getAttribute("aria-label");
    expect(label()).toBe("Close");

    channel.port1.postMessage({ type: "strings", strings: strings("閉じる") });

    await vi.waitFor(() => expect(label()).toBe("閉じる"));
    render(null, root);
    root.remove();
    channel.port1.close();
    channel.port2.close();
  });
});
