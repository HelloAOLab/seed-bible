import { render } from "preact";
import { act } from "preact/test-utils";
import { ExtensionInfoPage } from "@packages/seed-bible/seed-bible/components/SettingsPage/ExtensionInfoPage";
import {
  createExtensionManager,
  type Extension,
  type ExtensionMeta,
  type ExtensionListEntry,
} from "@packages/seed-bible/seed-bible/managers/ExtensionManager";
import { createLoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";
import {
  createI18nManager,
  I18nProvider,
  type I18nManager,
} from "@packages/seed-bible/seed-bible/i18n/I18nManager";

const screenshots = [
  { src: "/map.png", caption: "shot-map" },
  { src: "/timeline.png", caption: "shot-timeline" },
  { src: "/uncaptioned.png" },
];

describe("extension screenshot strip", () => {
  let root: HTMLDivElement;
  let i18n: I18nManager;

  beforeEach(async () => {
    localStorage.clear();
    root = document.createElement("div");
    document.body.append(root);
    i18n = createI18nManager(createNavigationManager(), ["en"]);
    await i18n.ready;
    for (const language of ["en", "es"]) {
      i18n.i18n.removeResourceBundle(language, "test.screenshots");
    }
  });

  afterEach(() => {
    act(() => render(null, root));
    root.remove();
    i18n.dispose();
    vi.unstubAllGlobals();
  });

  async function show(
    options: {
      screenshots?: ExtensionMeta["screenshots"];
      omitScreenshots?: boolean;
      language?: string;
      installed?: boolean;
      layout?: "narrow" | "wide";
      loadFullTranslations?: Extension["loadFullTranslations"];
    } = {}
  ) {
    if (options.language) await i18n.changeLanguage(options.language);
    const extension: Extension = {
      import: async () => {
        throw new Error("Screenshots must not install the extension");
      },
      meta: {
        id: "test.screenshots",
        translations: {
          en: {
            title: "Demo",
            description: "Demo extension",
            "shot-map": "Explore the map",
            "shot-timeline": "Read a timeline",
          },
        },
        screenshots: options.omitScreenshots
          ? undefined
          : (options.screenshots ?? screenshots),
      },
      loadFullTranslations: options.loadFullTranslations,
    };
    const extensions = createExtensionManager(
      createLoginManager({ os: CasualOSManager() })
    );
    await extensions.loadExtensionSet(
      { id: "test.set", extensions: [extension] },
      () => false
    );
    const entry: ExtensionListEntry = {
      id: extension.meta.id,
      extension,
      extensionSet: null,
      registration: null,
      installed: options.installed ?? false,
      pendingInstallation: false,
    };
    act(() =>
      render(
        <I18nProvider i18n={i18n}>
          <ExtensionInfoPage
            entry={entry}
            name="Demo"
            description="Demo extension"
            extensions={extensions}
            builtIn
            installState={options.installed ? "installed" : "none"}
            layout={options.layout}
            settings={<p>Extension settings</p>}
            onInstall={() => {}}
            onUninstall={() => {}}
          />
        </I18nProvider>,
        root
      )
    );
    return extensions;
  }

  const thumbnails = () => {
    const heading = [...root.querySelectorAll("h2")].find(
      (element) => element.textContent === i18n.t("extension-screenshots")
    );
    return [
      ...(heading?.parentElement?.querySelectorAll<HTMLButtonElement>(
        "button[aria-label]"
      ) ?? []),
    ];
  };
  const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
  function open(index = 0) {
    act(() => {
      thumbnails()[index]!.focus();
      thumbnails()[index]!.click();
    });
  }
  function fail(image: HTMLImageElement) {
    act(() => {
      image.dispatchEvent(new Event("error"));
    });
  }

  it.each(["narrow", "wide"] as const)(
    "shows ordered lazy thumbnails and captions before installation in %s layout",
    async (layout) => {
      const extensions = await show({ layout });
      expect(root.querySelector("h2")?.textContent).toBe("Screenshots");
      expect(
        thumbnails().map((button) => button.getAttribute("aria-label"))
      ).toEqual(["Explore the map", "Read a timeline", "Screenshot 3"]);
      expect(
        thumbnails().map((button) =>
          button.querySelector("img")!.getAttribute("src")
        )
      ).toEqual(screenshots.map((shot) => shot.src));
      expect(
        thumbnails().every(
          (button) =>
            button.querySelector("img")!.getAttribute("loading") === "lazy"
        )
      ).toBe(true);
      open(1);
      expect(dialog().textContent).toContain("2 of 3");
      expect(dialog().textContent).toContain("Read a timeline");
      expect(extensions.extensions.value[0]?.installed).toBe(false);
      act(() => {
        dialog().dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
      });
      expect(document.activeElement).toBe(thumbnails()[1]);
    }
  );

  it("uses screenshot names when caption keys have no translation", async () => {
    await show({
      screenshots: [
        { src: "/one.png", caption: "missing" },
        { src: "/two.png", caption: "toString" },
      ],
    });
    expect(
      thumbnails().map((button) => button.getAttribute("aria-label"))
    ).toEqual(["Screenshot 1", "Screenshot 2"]);
    open(0);
    expect(dialog().textContent).not.toContain("missing");
  });

  it.each([undefined, []])(
    "omits the section for absent or empty screenshots (%s)",
    async (screenshots) => {
      await show({ screenshots, omitScreenshots: screenshots === undefined });
      expect(
        [...root.querySelectorAll("h2")].some(
          (heading) => heading.textContent === "Screenshots"
        )
      ).toBe(false);
    }
  );

  it.each(["narrow", "wide"] as const)(
    "shows screenshots only in About when installed in %s layout",
    async (layout) => {
      await show({ installed: true, layout });
      expect(thumbnails()).toHaveLength(3);
      const settings = [
        ...root.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
      ].find((tab) => tab.textContent?.includes("Settings"))!;
      act(() => settings.click());
      expect(thumbnails()).toHaveLength(0);
      const about = [
        ...root.querySelectorAll<HTMLButtonElement>('[role="tab"]'),
      ].find((tab) => tab.textContent?.includes("About"))!;
      act(() => about.click());
      expect(thumbnails()).toHaveLength(3);
    }
  );

  it("removes failed thumbnails from the strip and the viewer's count", async () => {
    await show();
    fail(thumbnails()[1]!.querySelector("img")!);
    expect(thumbnails()).toHaveLength(2);
    open();
    expect(dialog().textContent).toContain("1 of 2");
    act(() =>
      dialog()
        .querySelector<HTMLButtonElement>('[aria-label="Next screenshot"]')!
        .click()
    );
    expect(dialog().textContent).toContain("2 of 2");
    expect(dialog().querySelector("img")!.alt).toBe("Screenshot 3");
  });

  it("removes images failing inside the viewer too, and closes when none remain", async () => {
    await show({ screenshots: screenshots.slice(0, 2) });
    open(1);
    fail(dialog().querySelector("img")!);
    expect(thumbnails()).toHaveLength(1);
    expect(dialog().textContent).toContain("1 of 1");
    expect(dialog().querySelector("img")!.alt).toBe("Explore the map");
    fail(dialog().querySelector("img")!);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(
      [...root.querySelectorAll("h2")].some(
        (heading) => heading.textContent === "Screenshots"
      )
    ).toBe(false);
  });

  it("loads localized captions on opening an uninstalled page, retaining English for missing translations", async () => {
    let respond!: (response: Response) => void;
    vi.stubGlobal(
      "fetch",
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        })
    );
    const extensions = await show({
      language: "es",
      loadFullTranslations: async () =>
        (await fetch("https://example.com/translations.json")).json(),
    });
    expect(thumbnails()[0]!.getAttribute("aria-label")).toBe("Explore the map");
    await vi.waitFor(() => expect(respond).toBeDefined());
    await act(async () => {
      respond(
        new Response(
          JSON.stringify({
            en: {
              title: "Demo",
              description: "Demo extension",
              "shot-map": "Explore the map",
              "shot-timeline": "Read a timeline",
            },
            es: {
              title: "Demo",
              description: "Extensión",
              "shot-map": "Explora el mapa",
            },
          })
        )
      );
    });
    await vi.waitFor(() =>
      expect(thumbnails()[0]!.getAttribute("aria-label")).toBe(
        "Explora el mapa"
      )
    );
    expect(thumbnails()[1]!.getAttribute("aria-label")).toBe("Read a timeline");
    open();
    expect(dialog().textContent).toContain("Explora el mapa");
    expect(extensions.extensions.value[0]?.installed).toBe(false);
  });

  it("updates thumbnail and viewer captions when the language changes while open", async () => {
    await show({
      loadFullTranslations: async () => ({
        en: {
          title: "Demo",
          description: "Demo extension",
          "shot-map": "Explore the map",
          "shot-timeline": "Read a timeline",
        },
        es: {
          title: "Demo",
          description: "Extensión",
          "shot-map": "Explora el mapa",
          "shot-timeline": "Lee una cronología",
        },
      }),
    });
    open();
    expect(thumbnails()[0]!.getAttribute("aria-label")).toBe("Explore the map");
    expect(dialog().textContent).toContain("Explore the map");

    await act(async () => {
      await i18n.changeLanguage("es");
    });
    await vi.waitFor(() => {
      expect(thumbnails()[0]!.getAttribute("aria-label")).toBe(
        "Explora el mapa"
      );
      expect(dialog().textContent).toContain("Explora el mapa");
    });
  });

  it("retains English captions when full translations cannot be loaded", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new Error("offline");
    });
    await show({
      language: "es",
      loadFullTranslations: async () =>
        (await fetch("https://example.com/offline.json")).json(),
    });
    await act(async () => {});
    expect(thumbnails()[0]!.getAttribute("aria-label")).toBe("Explore the map");
  });

  it.each([
    { language: "en", captioned: true },
    { language: "es", captioned: false },
  ])("keeps translations deferred for %j", async ({ language, captioned }) => {
    let requested = false;
    vi.stubGlobal("fetch", async () => {
      requested = true;
      return new Response("{}");
    });
    await show({
      language,
      screenshots: captioned ? screenshots : [{ src: "/plain.png" }],
      loadFullTranslations: async () =>
        (await fetch("https://example.com/translations.json")).json(),
    });
    await act(async () => {});
    expect(requested).toBe(false);
  });
});
