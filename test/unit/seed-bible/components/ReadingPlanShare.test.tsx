import { render } from "preact";
import { act } from "preact/test-utils";
import { ReadingPlanOptionsMenu } from "@packages/seed-bible/seed-bible/components/ReadingPlansPane/ReadingPlanOptionsMenu";
import { ModalHost } from "@packages/seed-bible/seed-bible/components/ModalHost/ModalHost";
import { ToastHost } from "@packages/seed-bible/seed-bible/components/ToastHost/ToastHost";
import { createReadingPlan } from "@packages/seed-bible/seed-bible/managers/ReadingPlansManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleReadingSession } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

const PLAN = createReadingPlan("user-1", "user-1", "plan-1", 1761868800000, {
  title: "Gospels in a month",
  status: "complete",
});

describe("sharing a reading plan", () => {
  let container: HTMLDivElement;
  let state: SeedBibleState;
  let writeText: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    container = document.createElement("div");
    document.body.appendChild(container);
    state = await createTestSeedBibleState();
    act(() => {
      render(
        <TestHost state={state}>
          <>
            <ReadingPlanOptionsMenu
              readingPlans={state.readingPlans}
              plan={PLAN}
              fullPlan={PLAN}
              modals={state.modals}
              app={state.app}
              toast={state.app.toast}
            />
            <ModalHost manager={state.modals} />
            <ToastHost app={state.app} />
          </>
        </TestHost>,
        container
      );
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  const shareActions = () =>
    Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(".sb-share-action")
    );

  const action = (label: string) =>
    shareActions().find((button) => button.textContent?.includes(label));

  async function openShareSheet() {
    await act(async () => {
      container.querySelector<HTMLElement>(".sb-context-menu-button")!.click();
    });
    // The menu renders in a portal, outside the container.
    const share = Array.from(
      document.body.querySelectorAll<HTMLElement>(".sb-context-menu-item")
    ).find((item) => item.textContent?.includes("Share"));
    await act(async () => {
      share!.click();
    });
  }

  it("opens the share sheet instead of copying the link right away", async () => {
    await openShareSheet();

    expect(writeText).not.toHaveBeenCalled();
    expect(action("Share a link")).toBeDefined();
    expect(action("Start and share session")).toBeDefined();
  });

  it("shows a QR code of the reading plan link", async () => {
    await openShareSheet();
    await waitFor(() =>
      Boolean(container.querySelector(".sb-session-qr-code img"))
    );

    expect(container.querySelector(".sb-session-qr")?.textContent).toContain(
      "Opens this reading plan on their phone."
    );
    expect(
      container.querySelector(".sb-session-qr-code img")?.getAttribute("alt")
    ).toBe("QR code to open this reading plan");
  });

  it("copies the plan link from Share a link and closes the sheet", async () => {
    await openShareSheet();

    await act(async () => {
      action("Share a link")!.click();
    });

    expect(writeText).toHaveBeenCalledWith(
      state.readingPlans.getReadingPlanShareUrl(PLAN)
    );
    await waitFor(() =>
      Boolean(
        container
          .querySelector(".sb-toast")
          ?.textContent?.includes("Reading plan URL copied to clipboard")
      )
    );
    expect(shareActions()).toHaveLength(0);
  });

  it("says so when the link can't be copied", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    writeText.mockRejectedValueOnce(new Error("denied"));
    await openShareSheet();

    await act(async () => {
      action("Share a link")!.click();
    });

    await waitFor(() =>
      Boolean(
        container
          .querySelector(".sb-toast")
          ?.textContent?.includes("Couldn't copy the reading plan link")
      )
    );
  });

  it("starts a session and copies its invite link", async () => {
    const session = { id: "plan-session" } as BibleReadingSession;
    vi.spyOn(state.app, "createSharedSession").mockResolvedValue(session);
    await openShareSheet();

    await act(async () => {
      action("Start and share session")!.click();
    });

    await waitFor(() => writeText.mock.calls.length > 0);
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("sessionId=plan-session")
    );
  });
});
