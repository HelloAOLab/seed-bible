import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  PhotoChooserContent,
  openPhotoChooser,
} from "@packages/seed-bible/seed-bible/components/PhotoChooser/PhotoChooser";
import { createModalManager } from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { createUserGalleryManager } from "@packages/seed-bible/seed-bible/managers/UserGalleryManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function renderModalContent(
  modals: ReturnType<typeof createModalManager>
): HTMLDivElement {
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
  return modalContainer;
}

describe("PhotoChooserContent", () => {
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

  it("offers choose from gallery and upload a picture", () => {
    act(() => {
      render(
        <PhotoChooserContent
          photos={[]}
          onSelectPhoto={vi.fn()}
          onFileChosen={vi.fn()}
        />,
        container
      );
    });

    const labels = Array.from(container.querySelectorAll("button")).map(
      (button) => button.textContent ?? ""
    );
    expect(labels.some((label) => label.includes("Choose from gallery"))).toBe(
      true
    );
    expect(labels.some((label) => label.includes("Upload a picture"))).toBe(
      true
    );
  });

  it("lets the user reuse a saved photo from the gallery", () => {
    const onSelectPhoto = vi.fn();

    act(() => {
      render(
        <PhotoChooserContent
          photos={[
            { id: "photo_1", url: "https://example.com/saved.jpg" },
            { id: "photo_2", url: "https://example.com/other.jpg" },
          ]}
          onSelectPhoto={onSelectPhoto}
          onFileChosen={vi.fn()}
        />,
        container
      );
    });

    act(() => {
      (
        Array.from(container.querySelectorAll("button")).find((button) =>
          (button.textContent ?? "").includes("Choose from gallery")
        ) as HTMLButtonElement
      ).click();
    });

    expect(
      container.querySelector(".sb-photo-chooser-heading")?.textContent
    ).toBe("Recent uploads");
    const items = container.querySelectorAll(".sb-photo-gallery-item img");
    expect(items).toHaveLength(2);
    expect((items[0] as HTMLImageElement).src).toBe(
      "https://example.com/saved.jpg"
    );

    act(() => {
      (
        container.querySelector(".sb-photo-gallery-item") as HTMLButtonElement
      ).click();
    });
    expect(onSelectPhoto).toHaveBeenCalledWith("https://example.com/saved.jpg");
  });

  it("opens the file picker when uploading a picture", () => {
    const clickSpy = vi
      .spyOn(HTMLInputElement.prototype, "click")
      .mockImplementation(() => undefined);

    act(() => {
      render(<PhotoChooserContent onFileChosen={vi.fn()} />, container);
    });

    act(() => {
      (
        Array.from(container.querySelectorAll("button")).find((button) =>
          (button.textContent ?? "").includes("Upload a picture")
        ) as HTMLButtonElement
      ).click();
    });

    expect(clickSpy).toHaveBeenCalled();
  });

  it("shows No photos yet until an upload is saved into the gallery", () => {
    const photos = signal<{ id: string; url: string; createdAtMs: number }[]>(
      []
    );

    act(() => {
      render(
        <PhotoChooserContent
          gallery={{ photos }}
          onSelectPhoto={vi.fn()}
          onFileChosen={vi.fn()}
        />,
        container
      );
    });

    act(() => {
      (
        Array.from(container.querySelectorAll("button")).find((button) =>
          (button.textContent ?? "").includes("Choose from gallery")
        ) as HTMLButtonElement
      ).click();
    });

    expect(
      container.querySelector(".sb-photo-chooser-empty")?.textContent
    ).toContain("No photos yet. Upload a picture to get started.");
    expect(container.querySelector(".sb-photo-gallery-item")).toBeNull();

    act(() => {
      photos.value = [
        {
          id: "photo_1",
          url: "https://example.com/new.jpg",
          createdAtMs: 1,
        },
      ];
    });

    const items = container.querySelectorAll(".sb-photo-gallery-item img");
    expect(items).toHaveLength(1);
    expect((items[0] as HTMLImageElement).src).toBe(
      "https://example.com/new.jpg"
    );
    expect(container.querySelector(".sb-photo-chooser-empty")).toBeNull();
  });

  it("shows a photo in Recent uploads after the common save function runs", async () => {
    localStorage.clear();
    const gallery = createUserGalleryManager(
      {
        recordFile: vi.fn().mockResolvedValue({
          success: true,
          url: "https://example.com/uploaded.jpg",
        }),
        recordData: vi.fn().mockResolvedValue(undefined),
        listAllDataByMarker: vi
          .fn()
          .mockResolvedValue({ success: true, items: [] }),
      },
      { userId: signal("user-1") }
    );
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      render(
        <PhotoChooserContent
          gallery={gallery}
          onSelectPhoto={vi.fn()}
          onFileChosen={vi.fn()}
        />,
        container
      );
    });

    act(() => {
      (
        Array.from(container.querySelectorAll("button")).find((button) =>
          (button.textContent ?? "").includes("Choose from gallery")
        ) as HTMLButtonElement
      ).click();
    });
    expect(
      container.querySelector(".sb-photo-chooser-empty")?.textContent
    ).toContain("No photos yet");

    await act(async () => {
      await gallery.savePhoto(
        new File([new Uint8Array([1])], "cover.jpg", { type: "image/jpeg" })
      );
    });

    expect(container.querySelector(".sb-photo-chooser-empty")).toBeNull();
    expect(
      (
        container.querySelector(
          ".sb-photo-gallery-item img"
        ) as HTMLImageElement
      ).src
    ).toBe("https://example.com/uploaded.jpg");
    localStorage.clear();
  });
});

describe("openPhotoChooser", () => {
  it("opens a modal and reuses a gallery photo", () => {
    const modals = createModalManager();
    const onSelectPhoto = vi.fn();

    act(() => {
      openPhotoChooser(modals, {
        photos: [{ id: "photo_1", url: "https://example.com/saved.jpg" }],
        onSelectPhoto,
        onFileChosen: vi.fn(),
      });
    });

    expect(modals.modals.value).toHaveLength(1);
    expect(modals.modals.value[0]!.title).toEqual({
      key: "recent-uploads",
      defaultValue: "Recent uploads",
    });
    const modalContainer = renderModalContent(modals);

    act(() => {
      (
        Array.from(modalContainer.querySelectorAll("button")).find((button) =>
          (button.textContent ?? "").includes("Choose from gallery")
        ) as HTMLButtonElement
      ).click();
    });
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
