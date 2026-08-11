import { render } from "preact";
import { act } from "preact/test-utils";
import type { Translation } from "@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI";
import { groupTranslationsByLanguage } from "@packages/seed-bible/seed-bible/managers/translationGrouping";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        let text = (options?.defaultValue as string | undefined) ?? key;
        for (const [name, value] of Object.entries(options ?? {})) {
          if (name === "defaultValue") continue;
          text = text.replaceAll(`{{${name}}}`, String(value));
        }
        return text;
      },
      language: "en",
    }),
  };
});

const { TranslationList } =
  await import("@packages/seed-bible/seed-bible/components/TranslationList/TranslationList");
const { TranslationViewModeMenu } =
  await import("@packages/seed-bible/seed-bible/components/TranslationList/TranslationViewModeMenu");

function translations(count: number): Translation[] {
  return Array.from(
    { length: count },
    (_, index) =>
      ({
        id: `t${index}`,
        name: `Translation ${index}`,
        englishName: `Translation ${index}`,
        shortName: `T${index}`,
        language: `l${index}`,
        languageEnglishName: `Lang ${index}`,
        languageName: `Lang ${index}`,
        numberOfBooks: 66,
        textDirection: "ltr",
      }) as Translation
  );
}

describe("TranslationList load-more control", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const groups = groupTranslationsByLanguage(translations(50));

  function mount(props: Record<string, unknown> = {}) {
    act(() => {
      render(
        <TranslationList
          groups={groups}
          query=""
          viewMode="all"
          selectedTranslationIds={[]}
          onPick={() => undefined}
          onShowAllTranslations={() => undefined}
          {...props}
        />,
        container
      );
    });
  }

  it("is a real button with a readable name, not a bare chevron", () => {
    mount({
      canLoadMore: true,
      onLoadMore: () => undefined,
      totalGroupCount: 120,
    });

    const button = container.querySelector<HTMLButtonElement>(
      ".sb-translation-list-load-more"
    )!;
    expect(button).not.toBeNull();
    expect(button.tagName).toBe("BUTTON");
    expect(button.textContent).toContain("Show more languages");
    // The icon is decorative — the label is what carries the meaning.
    expect(
      button
        .querySelector(".sb-translation-list-chevron")!
        .getAttribute("aria-hidden")
    ).toBe("true");
  });

  it("says how much of the catalog is showing", () => {
    mount({
      canLoadMore: true,
      onLoadMore: () => undefined,
      totalGroupCount: 120,
    });

    expect(
      container.querySelector(".sb-translation-list-load-more-count")!
        .textContent
    ).toBe("Showing 50 of 120");
  });

  it("omits the count when no total is supplied", () => {
    mount({ canLoadMore: true, onLoadMore: () => undefined });

    expect(
      container.querySelector(".sb-translation-list-load-more-count")
    ).toBeNull();
    expect(
      container.querySelector(".sb-translation-list-load-more")
    ).not.toBeNull();
  });

  it("reveals more when pressed", () => {
    const onLoadMore = vi.fn();
    mount({ canLoadMore: true, onLoadMore, totalGroupCount: 120 });

    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-translation-list-load-more")!
        .click();
    });

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("is absent when everything already fits", () => {
    mount({
      canLoadMore: false,
      onLoadMore: () => undefined,
      totalGroupCount: 50,
    });

    expect(
      container.querySelector(".sb-translation-list-load-more")
    ).toBeNull();
  });
});

describe("TranslationViewModeMenu", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function mountMenu(
    viewMode: "complete" | "all" | "popular",
    onChange = vi.fn()
  ) {
    act(() => {
      render(
        <TranslationViewModeMenu viewMode={viewMode} onChange={onChange} />,
        container
      );
    });
    return onChange;
  }

  const options = () => [
    ...container.querySelectorAll<HTMLButtonElement>(
      ".sb-translation-view-mode-option"
    ),
  ];

  it("offers the three catalog filters as radio menu items", () => {
    mountMenu("complete");

    expect(options().map((option) => option.textContent)).toEqual([
      "Complete translations",
      "All translations",
      "Popular translations",
    ]);
    for (const option of options()) {
      expect(option.getAttribute("role")).toBe("menuitemradio");
    }
  });

  it("marks the active filter as checked", () => {
    mountMenu("popular");

    expect(
      options().map((option) => option.getAttribute("aria-checked"))
    ).toEqual(["false", "false", "true"]);
    expect(
      options()[2]!.classList.contains(
        "sb-translation-view-mode-option--selected"
      )
    ).toBe(true);
  });

  it("reports the chosen filter", () => {
    const onChange = mountMenu("complete");

    act(() => {
      options()[1]!.click();
    });

    expect(onChange).toHaveBeenCalledWith("all");
  });
});

describe("TranslationList canon-coverage ring", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function mountWith(
    books: number,
    viewMode: "complete" | "all" | "popular" = "all",
    selectedTranslationIds: string[] = []
  ) {
    const partial = translations(1).map((entry) => ({
      ...entry,
      numberOfBooks: books,
    }));
    act(() => {
      render(
        <TranslationList
          groups={groupTranslationsByLanguage(partial)}
          query=""
          viewMode={viewMode}
          selectedTranslationIds={selectedTranslationIds}
          onPick={() => undefined}
          onShowAllTranslations={() => undefined}
        />,
        container
      );
    });
    return container.querySelector<HTMLSpanElement>(
      ".sb-translation-completion"
    )!;
  }

  it("fills the arc in proportion to the books the translation has", () => {
    const ring = mountWith(33);

    expect(ring.classList.contains("sb-translation-completion--ring")).toBe(
      true
    );
    // 33 of 66 books.
    expect(ring.style.getPropertyValue("--sb-completion-percent")).toBe("50");
  });

  it("carries a label saying what it measures", () => {
    const ring = mountWith(27);

    expect(ring.getAttribute("role")).toBe("img");
    expect(ring.getAttribute("aria-label")).toBe("27 of 66 books");
    expect(ring.getAttribute("title")).toBe("27 of 66 books");
  });

  it("does not claim more than a full canon", () => {
    const ring = mountWith(80);

    expect(ring.style.getPropertyValue("--sb-completion-percent")).toBe("100");
    expect(ring.getAttribute("aria-label")).toBe("66 of 66 books");
  });

  it("renders a silent blank in complete mode, keeping rows aligned", () => {
    const ring = mountWith(66, "complete");

    expect(ring.classList.contains("sb-translation-completion--ring")).toBe(
      false
    );
    expect(ring.getAttribute("aria-hidden")).toBe("true");
    expect(ring.getAttribute("aria-label")).toBeNull();
  });

  it("gives way to the tick once a translation is chosen", () => {
    mountWith(33, "all", ["t0"]);

    expect(container.querySelector(".sb-translation-completion")).toBeNull();
  });
});
