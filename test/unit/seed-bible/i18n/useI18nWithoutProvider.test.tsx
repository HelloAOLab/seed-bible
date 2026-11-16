import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  addTranslations,
  createI18nManager,
  I18nProvider,
  setDefaultI18n,
  useI18n,
  type I18nManager,
} from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import type { NavigationManager } from "@packages/seed-bible/seed-bible/managers/NavigationManager";

// An extension's own root: rendered with `render(..., container)`, so no
// I18nProvider is above it.
function Label(props: { ns?: string; k: string; values?: object }) {
  const { t, language, isRtl } = useI18n(props.ns);
  return (
    <span data-language={language} dir={isRtl ? "rtl" : "ltr"}>
      {t(props.k, props.values as Record<string, unknown>)}
    </span>
  );
}

function createManager() {
  const currentUrl = signal(new URL("https://example.com/"));
  const nav = {
    currentUrl,
    initialUrl: currentUrl.peek(),
    basePath: "",
  } as NavigationManager;
  return createI18nManager(nav, []);
}

describe("useI18n() without an I18nProvider", () => {
  let container: HTMLDivElement;
  let manager: I18nManager | null = null;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    setDefaultI18n(null);
    manager?.dispose();
    manager = null;
  });

  function label() {
    return container.querySelector("span")!;
  }

  it("shows the app's English strings when nothing is set", () => {
    act(() => {
      render(<Label k="close" />, container);
    });

    expect(label().textContent).toBe("Close");
    expect(label().dataset.language).toBe("en");
    expect(label().dir).toBe("ltr");
  });

  it("fills in values and falls back to the default text in English", () => {
    act(() => {
      render(
        <>
          <Label
            k="image-details-dimensions-value"
            values={{ width: 640, height: 480 }}
          />
          <Label k="no-such-key" values={{ defaultValue: "Fallback" }} />
        </>,
        container
      );
    });

    const [dimensions, fallback] = container.querySelectorAll("span");
    expect(dimensions!.textContent).toBe("640 × 480 px");
    expect(fallback!.textContent).toBe("Fallback");
  });

  it("speaks the app's language once the app's translations are set as the default", async () => {
    manager = createManager();
    await manager.ready;
    await manager.changeLanguage("es");
    setDefaultI18n(manager);

    act(() => {
      render(<Label k="close" />, container);
    });
    expect(label().textContent).toBe("Cerca");
    expect(label().dataset.language).toBe("es");

    await act(async () => {
      await manager!.changeLanguage("ar");
    });
    expect(label().textContent).toBe("يغلق");
    expect(label().dir).toBe("rtl");
  });

  it("translates an extension's own keys", async () => {
    manager = createManager();
    await manager.ready;
    await manager.changeLanguage("es");
    setDefaultI18n(manager);
    addTranslations("test-extension", {
      en: { greeting: "Hello" },
      es: { greeting: "Hola" },
    });

    act(() => {
      render(<Label ns="test-extension" k="greeting" />, container);
    });

    expect(label().textContent).toBe("Hola");
  });

  it("prefers the nearest I18nProvider over the default", async () => {
    manager = createManager();
    await manager.ready;
    await manager.changeLanguage("es");
    setDefaultI18n(manager);
    const provided = {
      ...manager,
      i18n: { t: () => "From the provider", language: "en" },
      language: signal("en"),
    } as unknown as I18nManager;

    act(() => {
      render(
        <I18nProvider i18n={provided}>
          <Label k="close" />
        </I18nProvider>,
        container
      );
    });

    expect(label().textContent).toBe("From the provider");
  });
});
