import { render } from "preact";
import { act } from "preact/test-utils";
import { SessionQRCode } from "@packages/seed-bible/seed-bible/components/SessionQRCode/SessionQRCode";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

const SESSION_URL = "https://seedbible.org/?session=abc";

describe("SessionQRCode", () => {
  let container: HTMLDivElement;
  let anchorClicks: string[];

  beforeEach(() => {
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
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, "canShare");
    Reflect.deleteProperty(navigator, "share");
  });

  async function renderQR(url = SESSION_URL) {
    const state = await createTestSeedBibleState();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(new Blob(["png"], { type: "image/png" })))
    );
    act(() => {
      render(
        <TestHost state={state}>
          <SessionQRCode url={url} />
        </TestHost>,
        container
      );
    });
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

  async function clickSave() {
    const button = container.querySelector<HTMLButtonElement>(
      ".sb-session-qr-save"
    );
    await act(async () => {
      button!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

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

  it("shares the image through the Web Share API when files can be shared", async () => {
    const share = mockWebShare(async () => {});
    await renderGeneratedQR();

    await clickSave();

    expect(share).toHaveBeenCalledTimes(1);
    const file = (share.mock.calls[0] as unknown as [{ files: File[] }])[0]
      .files[0];
    expect(file?.name).toBe("seed-bible-session-qr.png");
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
});
