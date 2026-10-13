import { render } from "preact";
import { act } from "preact/test-utils";
import type { Mock } from "vitest";
import { PlaylistFinishedModalContent } from "@packages/seed-bible/seed-bible/components/PlaylistFinishedModal/PlaylistFinishedModal";
import {
  I18nProvider,
  createI18nManager,
} from "@packages/seed-bible/seed-bible/i18n";
import { createNavigationManager } from "@packages/seed-bible/seed-bible/managers";

const SHARE_URL = "https://example.com/en/playlist/user-1.p1/psalms";

describe("PlaylistFinishedModalContent", () => {
  let container: HTMLDivElement;
  let onClose: Mock;
  let writeText: Mock;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    onClose = vi.fn();
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const renderModal = () =>
    act(() => {
      render(
        <I18nProvider
          i18n={createI18nManager(createNavigationManager(), ["en"])}
        >
          <PlaylistFinishedModalContent
            playlistTitle="Psalms of Ascent"
            shareUrl={SHARE_URL}
            onClose={onClose}
          />
        </I18nProvider>,
        container
      );
    });

  /** Presses Share and lets its share-then-copy steps finish rendering. */
  const pressShare = () =>
    act(async () => {
      button("Share playlist").click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

  const button = (label: string) =>
    Array.from(container.querySelectorAll("button")).find(
      (b) => b.textContent === label
    )!;

  it("says the playlist is finished, by name", () => {
    renderModal();
    expect(container.textContent).toContain(
      "You've reached the end of Psalms of Ascent."
    );
  });

  it("closes from the Close button", () => {
    renderModal();
    act(() => button("Close").click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("opens the device share sheet with the playlist's link when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: share,
    });
    renderModal();

    await pressShare();

    expect(share).toHaveBeenCalledWith({
      title: "Psalms of Ascent",
      url: SHARE_URL,
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the link and says so when there is no share sheet", async () => {
    renderModal();
    expect(container.textContent).not.toContain("copied");

    await pressShare();

    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    expect(container.textContent).toContain("Playlist URL copied to clipboard");
  });

  const setShare = (share: unknown) =>
    Object.defineProperty(window.navigator, "share", {
      configurable: true,
      value: share,
    });

  it("says the link couldn't be copied when copying fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    writeText.mockRejectedValue(new Error("denied"));
    renderModal();

    await pressShare();

    expect(container.textContent).not.toContain("copied to clipboard");
    expect(container.textContent).toContain("Couldn't copy the playlist link");
    errorSpy.mockRestore();
  });

  it("says the link couldn't be copied when there is no clipboard", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    renderModal();

    await pressShare();

    expect(container.textContent).toContain("Couldn't copy the playlist link");
    errorSpy.mockRestore();
  });

  it("copies the link instead when the share sheet refuses to open", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    setShare(
      vi.fn().mockRejectedValue(new DOMException("blocked", "NotAllowedError"))
    );
    renderModal();

    await pressShare();

    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    expect(container.textContent).toContain("Playlist URL copied to clipboard");
    errorSpy.mockRestore();
  });

  it("does nothing more when the share sheet is dismissed", async () => {
    setShare(
      vi.fn().mockRejectedValue(new DOMException("dismissed", "AbortError"))
    );
    renderModal();

    await pressShare();

    expect(writeText).not.toHaveBeenCalled();
    expect(container.textContent).not.toContain("copy");
  });
});
