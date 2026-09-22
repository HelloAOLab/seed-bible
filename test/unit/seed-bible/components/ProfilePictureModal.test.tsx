import { render } from "preact";
import { act } from "preact/test-utils";
import { ProfilePictureModalContent } from "@packages/seed-bible/seed-bible/components/ProfilePictureModal/ProfilePictureModal";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

/**
 * Only the source-choice step is covered here. Picking a file moves to the
 * crop step, which renders `react-avatar-editor` — that needs a real canvas
 * 2D context and real image decoding, and jsdom has neither (see
 * `photoCrop.test.ts`).
 *
 * jsdom reports `capture` as absent from `HTMLInputElement.prototype`, the
 * same as desktop Chromium, so "no camera capture" is the default here and
 * the supported case is the one that has to be arranged.
 */
function withCaptureSupport(): () => void {
  Object.defineProperty(HTMLInputElement.prototype, "capture", {
    configurable: true,
    get() {
      return this.getAttribute("capture") ?? "";
    },
    set(value: string) {
      this.setAttribute("capture", value);
    },
  });
  return () => {
    delete (HTMLInputElement.prototype as unknown as Record<string, unknown>)
      .capture;
  };
}

describe("ProfilePictureModalContent", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const renderModal = () => {
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    act(() => {
      render(
        <ProfilePictureModalContent onUpload={onUpload} onClose={onClose} />,
        container
      );
    });
    return { onUpload, onClose };
  };

  // Each button holds the icon's ligature text as well as its label, so read
  // the label span rather than the button's whole textContent.
  const choiceLabels = () =>
    Array.from(container.querySelectorAll(".sb-photo-choice-button")).map(
      (el) =>
        el.querySelector("span:not(.material-symbols-outlined)")?.textContent
    );

  const fileInputs = () =>
    Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="file"]')
    );

  it("offers only an upload when the browser will not open a camera", () => {
    // A button promising a camera that opens a file dialog instead is worse
    // than no button.
    renderModal();

    expect(choiceLabels()).toEqual(["Upload from device"]);
    expect(fileInputs()).toHaveLength(1);
    expect(fileInputs()[0]!.hasAttribute("capture")).toBe(false);
  });

  it("adds Take a photo when the browser honours capture", () => {
    const restore = withCaptureSupport();
    try {
      renderModal();

      expect(choiceLabels()).toEqual(["Take a photo", "Upload from device"]);
    } finally {
      restore();
    }
  });

  it("asks for the rear camera on the capture input", () => {
    const restore = withCaptureSupport();
    try {
      renderModal();

      const capture = fileInputs().find((input) =>
        input.hasAttribute("capture")
      );
      expect(capture?.getAttribute("capture")).toBe("environment");
      expect(capture?.accept).toBe("image/*");
    } finally {
      restore();
    }
  });

  it("does not name the upload a gallery, which means something else here", () => {
    // "Choose from gallery" is the PhotoChooser's in-app Recent uploads;
    // this button is the device's own file picker.
    const restore = withCaptureSupport();
    try {
      renderModal();

      expect(choiceLabels().join(" ")).not.toContain("gallery");
    } finally {
      restore();
    }
  });

  it("accepts images only, on every input it offers", () => {
    const restore = withCaptureSupport();
    try {
      renderModal();

      expect(fileInputs()).toHaveLength(2);
      for (const input of fileInputs()) {
        expect(input.accept).toBe("image/*");
      }
    } finally {
      restore();
    }
  });

  it("moves to the crop step's Back affordance only after a file is chosen", () => {
    // Before a choice there is nothing to go back from, so the choice list is
    // all there is.
    renderModal();

    expect(container.querySelector(".sb-photo-choice-list")).not.toBeNull();
    expect(container.querySelector(".sb-photo-crop")).toBeNull();
  });
});
