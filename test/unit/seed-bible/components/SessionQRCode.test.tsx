import { render } from "preact";
import { act } from "preact/test-utils";
import { SessionQRCode } from "@packages/seed-bible/seed-bible/components/SessionQRCode/SessionQRCode";
import { ShareModal } from "@packages/seed-bible/seed-bible/components/ShareModal/shareModal";
import { ModalHost } from "@packages/seed-bible/seed-bible/components/ModalHost/ModalHost";
import { ToastHost } from "@packages/seed-bible/seed-bible/components/ToastHost/ToastHost";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleReadingSession } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

const SESSION_URL = "https://seedbible.org/?session=abc";

describe("SessionQRCode", () => {
  let container: HTMLDivElement;
  let anchorClicks: string[];
  let state: SeedBibleState;

  beforeEach(async () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    anchorClicks = [];
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      anchorClicks.push(this.download);
    });
    URL.createObjectURL = vi.fn(() => "blob:qr");
    URL.revokeObjectURL = vi.fn();
    state = await createTestSeedBibleState();
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "canShare");
    Reflect.deleteProperty(navigator, "share");
  });

  function renderWithHosts(children: preact.ComponentChildren) {
    act(() => {
      render(
        <TestHost state={state}>
          <>
            {children}
            <ModalHost manager={state.modals} />
            <ToastHost app={state.app} />
          </>
        </TestHost>,
        container
      );
    });
  }

  async function renderQR(url = SESSION_URL) {
    renderWithHosts(<SessionQRCode url={url} modals={state.modals} />);
  }

  async function renderGeneratedQR() {
    await renderQR();
    await waitFor(() => Boolean(container.querySelector("img")));
  }

  function mockWebShare(share: () => Promise<void>) {
    const shareFn = vi.fn(share);
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: shareFn,
    });
    return shareFn;
  }

  async function click(element: HTMLElement | null) {
    expect(element).not.toBeNull();
    await act(async () => {
      element!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  const clickSave = () =>
    click(container.querySelector<HTMLButtonElement>(".sb-session-qr-save"));

  it("renders a PNG QR code once generation finishes", async () => {
    await renderGeneratedQR();

    expect(container.querySelector("img")?.getAttribute("src")).toMatch(
      /^data:image\/png;base64,/
    );
    expect(
      container.querySelector<HTMLButtonElement>(".sb-session-qr-save")
        ?.disabled
    ).toBe(false);
  });

  it("shows a fallback message instead of the card when generation fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Past a QR code's data capacity, so generation genuinely fails.
    await renderQR(`${SESSION_URL}&pad=${"x".repeat(5000)}`);
    await waitFor(() =>
      Boolean(container.querySelector(".sb-session-qr-error"))
    );

    expect(container.querySelector(".sb-session-qr-card")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("opens a large version of the QR code when the code is clicked", async () => {
    await renderGeneratedQR();
    expect(container.querySelector(".sb-session-qr-large")).toBeNull();

    await click(
      container.querySelector<HTMLButtonElement>("button.sb-session-qr-code")
    );
    await waitFor(() =>
      Boolean(container.querySelector(".sb-session-qr-large-code img"))
    );

    const smallSrc = container
      .querySelector(".sb-session-qr-code img")
      ?.getAttribute("src");
    expect(
      container
        .querySelector(".sb-session-qr-large-code img")
        ?.getAttribute("src")
    ).toBe(smallSrc);
  });

  it("shares the image through the Web Share API when files can be shared", async () => {
    const share = mockWebShare(async () => {});
    await renderGeneratedQR();

    await clickSave();

    expect(share).toHaveBeenCalledTimes(1);
    const file = (share.mock.calls[0] as unknown as [{ files: File[] }])[0]
      .files[0];
    expect(file?.name).toBe("seed-bible-session-qr.png");
    expect(file?.type).toBe("image/png");
    expect(anchorClicks).toEqual([]);
  });

  it("downloads the image through an attached link when sharing is unsupported", async () => {
    let attachedWhenClicked = false;
    vi.mocked(HTMLAnchorElement.prototype.click).mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      attachedWhenClicked = document.body.contains(this);
      anchorClicks.push(this.download);
    });
    await renderGeneratedQR();

    await clickSave();

    expect(anchorClicks).toEqual(["seed-bible-session-qr.png"]);
    // Firefox ignores clicks on anchors that aren't in the document.
    expect(attachedWhenClicked).toBe(true);
  });

  it("does not fall back to a download when the user dismisses the share sheet", async () => {
    const share = mockWebShare(async () => {
      throw new DOMException("Share canceled", "AbortError");
    });
    await renderGeneratedQR();

    await clickSave();

    expect(share).toHaveBeenCalledTimes(1);
    expect(anchorClicks).toEqual([]);
  });

  it("falls back to a download when sharing fails for another reason", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockWebShare(async () => {
      throw new DOMException("Not allowed", "NotAllowedError");
    });
    await renderGeneratedQR();

    await clickSave();

    expect(anchorClicks).toEqual(["seed-bible-session-qr.png"]);
  });

  describe("in the share sheet", () => {
    const session = { id: "session-qr-test" } as BibleReadingSession;

    function renderShareModal(sharedSession: BibleReadingSession | null) {
      renderWithHosts(
        <ShareModal
          app={state.app}
          modals={state.modals}
          session={sharedSession}
          hideShareLink
        />
      );
    }

    it("shows the session QR code when a session is active", async () => {
      renderShareModal(session);
      await waitFor(() =>
        Boolean(container.querySelector(".sb-session-qr-code img"))
      );

      expect(container.querySelector(".sb-session-qr-card")).not.toBeNull();
    });

    it("shows no QR code when there is no session yet", () => {
      renderShareModal(null);

      expect(container.querySelector(".sb-session-qr")).toBeNull();
    });

    it("opens the QR code when the link-copied toast is clicked", async () => {
      const writeText = vi.fn(async () => {});
      vi.stubGlobal("navigator", {
        ...navigator,
        clipboard: { writeText },
      });
      renderShareModal(session);

      const sessionAction = Array.from(
        container.querySelectorAll<HTMLButtonElement>(".sb-share-action")
      ).find((button) => button.textContent?.includes("Share current session"));
      await click(sessionAction ?? null);

      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining("sessionId=session-qr-test")
      );
      const toast =
        container.querySelector<HTMLButtonElement>("button.sb-toast");
      expect(container.querySelector(".sb-session-qr-large")).toBeNull();

      await click(toast);
      await waitFor(() =>
        Boolean(container.querySelector(".sb-session-qr-large-code img"))
      );

      expect(container.querySelector(".sb-toast")).toBeNull();
    });

    it("keeps plain toasts non-interactive", async () => {
      renderWithHosts(null);

      await act(async () => {
        state.app.toast("Copied");
      });

      expect(container.querySelector(".sb-toast")?.textContent).toBe("Copied");
      expect(container.querySelector("button.sb-toast")).toBeNull();
    });
  });
});
