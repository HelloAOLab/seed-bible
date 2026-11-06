import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { MobileSessionParticipants } from "@packages/seed-bible/seed-bible/components/SessionParticipants/SessionParticipants";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type {
  BibleReadingSession,
  ConnectedSessionUser,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function guest(connectionId: string, name: string): ConnectedSessionUser {
  return {
    // Signed-out guests: no account, so no Add friend button to wire up.
    userId: null,
    connectionId,
    isSelf: false,
    profile: { name } as ConnectedSessionUser["profile"],
    visual: { defaultIcon: "pets", color: "#e66", colorName: "red" },
    isActive: true,
    joinedAtMs: null,
  };
}

describe("MobileSessionParticipants sheet", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      render(null, container);
    });
    container.remove();
  });

  function renderParticipants() {
    const session = {
      options: signal({ hostUserId: "conn-ada" }),
      connectedUsers: signal([
        guest("conn-ben", "Ben"),
        guest("conn-ada", "Ada"),
      ]),
    } as unknown as BibleReadingSession;
    const state = {
      login: { userId: signal(null) },
      os: { connectionId: "conn-me" },
    } as unknown as SeedBibleState;
    act(() => {
      render(
        <MobileSessionParticipants state={state} session={session} />,
        container
      );
    });
  }

  const sheet = () =>
    document.querySelector<HTMLElement>(".sb-session-participants-sheet");

  function openSheet() {
    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-session-participants-stack")!
        .click();
    });
  }

  it("lists everyone, host first, with sharing below the list", () => {
    renderParticipants();
    expect(sheet()).toBeNull();

    openSheet();
    expect(sheet()!.getAttribute("role")).toBe("dialog");
    expect(sheet()!.getAttribute("aria-label")).toBe("Participants");
    const names = Array.from(
      sheet()!.querySelectorAll(".sb-session-participants-list-name")
    ).map((el) => el.textContent);
    expect(names).toEqual(["Ada", "Ben"]);
    // Not the host here, so only Share session — and it isn't scrolled away
    // with a long roster.
    expect(
      sheet()!.querySelector(
        ".sb-bottom-sheet-body .sb-session-participants-share-button"
      )
    ).toBeNull();
    expect(
      sheet()!.querySelector(".sb-session-participants-share-button")
    ).not.toBeNull();
    expect(
      sheet()!.querySelector(".sb-session-participants-settings-button")
    ).toBeNull();
  });

  it("closes from the ✕ button", () => {
    renderParticipants();
    openSheet();
    act(() => {
      sheet()!
        .querySelector<HTMLButtonElement>(".sb-bottom-sheet-close")!
        .click();
    });
    expect(sheet()).toBeNull();
  });

  it("closes on Escape", () => {
    renderParticipants();
    openSheet();
    act(() => {
      sheet()!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });
    expect(sheet()).toBeNull();
  });

  it("closes when the backdrop is tapped", () => {
    renderParticipants();
    openSheet();
    const backdrop = document.querySelector(".sb-bottom-sheet-backdrop")!;
    act(() => {
      backdrop.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      backdrop.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(sheet()).toBeNull();
  });
});
