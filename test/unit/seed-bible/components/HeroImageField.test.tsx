import { render } from "preact";
import { act } from "preact/test-utils";
import {
  HeroImageBanner,
  HeroImageField,
  HeroImageThumb,
} from "@packages/seed-bible/seed-bible/components/HeroImageField/HeroImageField";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

describe("HeroImageThumb", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("renders the cover image when a url is provided", () => {
    act(() => {
      render(<HeroImageThumb url="https://example.com/cover.jpg" />, container);
    });

    const img = container.querySelector(".sb-hero-thumb") as HTMLImageElement;
    expect(img.tagName).toBe("IMG");
    expect(img.src).toBe("https://example.com/cover.jpg");
    expect(container.querySelector(".sb-hero-thumb--empty")).toBeNull();
  });

  it("shows a No image placeholder when the cover is missing", () => {
    act(() => {
      render(<HeroImageThumb />, container);
    });

    const placeholder = container.querySelector(".sb-hero-thumb--empty");
    expect(placeholder).not.toBeNull();
    expect(placeholder?.textContent).toContain("No image");
  });
});

describe("HeroImageBanner", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("renders the cover image when a url is provided", () => {
    act(() => {
      render(
        <HeroImageBanner url="https://example.com/cover.jpg" alt="Evening" />,
        container
      );
    });

    const img = container.querySelector(
      ".sb-hero-banner img"
    ) as HTMLImageElement;
    expect(img.src).toBe("https://example.com/cover.jpg");
    expect(img.alt).toBe("Evening");
    expect(container.querySelector(".sb-hero-banner--empty")).toBeNull();
  });

  it("shows a No image placeholder when the cover is missing", () => {
    act(() => {
      render(<HeroImageBanner alt="Evening" />, container);
    });

    const placeholder = container.querySelector(".sb-hero-banner--empty");
    expect(placeholder).not.toBeNull();
    expect(placeholder?.textContent).toContain("No image");
    expect(placeholder?.getAttribute("aria-label")).toBe("No image");
    expect(container.querySelector(".sb-hero-banner img")).toBeNull();
  });
});

describe("HeroImageField", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  it("puts a delete button on the top left of the cover preview", () => {
    const onRemove = vi.fn();
    const modals = createModalManager();

    act(() => {
      render(
        <HeroImageField
          imageUrl="https://example.com/cover.jpg"
          onUpload={vi.fn()}
          onRemove={onRemove}
          modals={modals}
        />,
        container
      );
    });

    const wrap = container.querySelector(".sb-hero-field-preview-wrap");
    expect(wrap).not.toBeNull();
    const remove = wrap?.querySelector(
      ".sb-hero-field-delete"
    ) as HTMLButtonElement;
    expect(remove).not.toBeNull();
    expect(remove.getAttribute("aria-label")).toBe("Delete");
    expect(
      Array.from(container.querySelectorAll("button")).some(
        (button) => button.textContent === "Remove cover image"
      )
    ).toBe(false);

    act(() => {
      remove.click();
    });
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("opens choose-from-gallery and upload-a-picture when adding a cover", () => {
    const onSelectPhoto = vi.fn();
    const modals = createModalManager();

    act(() => {
      render(
        <HeroImageField
          imageUrl={null}
          onUpload={vi.fn()}
          onRemove={vi.fn()}
          onSelectPhoto={onSelectPhoto}
          photos={[
            { id: "photo_1", url: "https://example.com/saved.jpg" },
            { id: "photo_2", url: "https://example.com/other.jpg" },
          ]}
          modals={modals}
        />,
        container
      );
    });

    act(() => {
      (
        container.querySelector(
          ".sb-hero-field-placeholder"
        ) as HTMLButtonElement
      ).click();
    });

    expect(modals.modals.value).toHaveLength(1);
    expect(modals.modals.value[0]!.title).toEqual({
      key: "recent-uploads",
      defaultValue: "Recent uploads",
    });

    const modalContainer = document.createElement("div");
    document.body.appendChild(modalContainer);
    act(() => {
      render(
        modals.modals.value[0]!.content({
          t: (key, options) => (options?.defaultValue as string) ?? key,
        }),
        modalContainer
      );
    });

    const labels = Array.from(modalContainer.querySelectorAll("button")).map(
      (button) => button.textContent ?? ""
    );
    expect(labels.some((label) => label.includes("Choose from gallery"))).toBe(
      true
    );
    expect(labels.some((label) => label.includes("Upload a picture"))).toBe(
      true
    );

    act(() => {
      (
        Array.from(modalContainer.querySelectorAll("button")).find((button) =>
          (button.textContent ?? "").includes("Choose from gallery")
        ) as HTMLButtonElement
      ).click();
    });
    expect(
      modalContainer.querySelector(".sb-photo-chooser-heading")?.textContent
    ).toBe("Recent uploads");
    act(() => {
      (
        modalContainer.querySelector(
          ".sb-photo-gallery-item"
        ) as HTMLButtonElement
      ).click();
    });
    expect(onSelectPhoto).toHaveBeenCalledWith("https://example.com/saved.jpg");
    expect(modals.modals.value).toHaveLength(0);

    render(null, modalContainer);
    modalContainer.remove();
  });
});
