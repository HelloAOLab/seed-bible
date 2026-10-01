import { render } from "preact";
import { act } from "preact/test-utils";
import type { Mock } from "vitest";
import { PlaylistFinishedModalContent } from "@packages/seed-bible/seed-bible/components/PlaylistFinishedModal/PlaylistFinishedModal";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: Record<string, unknown>) => {
        let str = (options?.defaultValue as string | undefined) ?? key;
        for (const [optionKey, value] of Object.entries(options ?? {})) {
          if (optionKey === "defaultValue") continue;
          str = str.replaceAll(`{{${optionKey}}}`, String(value));
        }
        return str;
      },
      language: "en",
    }),
  };
});

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
        <PlaylistFinishedModalContent
          playlistTitle="Psalms of Ascent"
          shareUrl={SHARE_URL}
          onClose={onClose}
        />,
        container
      );
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

    await act(async () => button("Share playlist").click());

    expect(share).toHaveBeenCalledWith({
      title: "Psalms of Ascent",
      url: SHARE_URL,
    });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("copies the link and says so when there is no share sheet", async () => {
    renderModal();
    expect(container.textContent).not.toContain("copied");

    await act(async () => button("Share playlist").click());

    expect(writeText).toHaveBeenCalledWith(SHARE_URL);
    expect(container.textContent).toContain("Playlist URL copied to clipboard");
  });

  it("doesn't claim the link was copied when copying fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    writeText.mockRejectedValue(new Error("denied"));
    renderModal();

    await act(async () => button("Share playlist").click());

    expect(container.textContent).not.toContain("copied");
    errorSpy.mockRestore();
  });
});
