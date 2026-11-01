import { render } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import {
  DesktopSessionParticipants,
  MobileSessionParticipants,
} from "@packages/seed-bible/seed-bible/components/SessionParticipants/SessionParticipants";
import {
  createFriendsManager,
  type FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import {
  createModalManager,
  type ModalManager,
} from "@packages/seed-bible/seed-bible/managers/ModalManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type {
  BibleReadingSession,
  ConnectedSessionUser,
  SessionOptions,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { fakeSharedPermissions, ME } from "../testUtils/fakeSharedPermissions";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const ADA_ID = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "session-1";
const PARTICIPANTS_MODAL_ID = `session-participants-${SESSION_ID}`;

function makeUser(
  connectionId: string,
  name: string,
  overrides: Partial<ConnectedSessionUser> = {}
): ConnectedSessionUser {
  return {
    connectionId,
    userId: null,
    isSelf: false,
    profile: { name, pictureUrl: null } as ConnectedSessionUser["profile"],
    visual: { defaultIcon: "pets", color: "#336699", colorName: "Blue" },
    isActive: true,
    joinedAtMs: null,
    ...overrides,
  } as ConnectedSessionUser;
}

describe("SessionParticipants", () => {
  let container: HTMLDivElement;
  let modalContainer: HTMLDivElement;
  let userId: Signal<string | null>;
  let friends: FriendsManager;
  let modals: ModalManager;
  let state: SeedBibleState;
  let options: Signal<SessionOptions>;
  let connectedUsers: Signal<ConnectedSessionUser[]>;
  let session: BibleReadingSession;
  let tabs: Signal<{ id: string; sharedSession: BibleReadingSession }[]>;
  let server: ReturnType<typeof fakeSharedPermissions>;

  const host = () => makeUser("host-conn", "Hannah", { userId: "host-user" });

  const buttonByText = (root: ParentNode, text: string) =>
    Array.from(root.querySelectorAll("button")).find(
      (el) => el.textContent?.includes(text) ?? false
    ) as HTMLButtonElement | undefined;

  const modalIds = () => modals.modals.value.map((m) => m.id);

  /**
   * Renders the participants modal the way ModalHost does — its content and
   * footer — without ModalHost's CasualOS wrapper.
   */
  const renderParticipantsModal = () => {
    const modal = modals.modals.value.find(
      (m) => m.id === PARTICIPANTS_MODAL_ID
    );
    expect(modal).toBeDefined();
    const t = (key: string) => key;
    act(() =>
      render(
        <>
          {modal!.content({ t })}
          {modal!.footer?.({ t })}
        </>,
        modalContainer
      )
    );
  };

  const renderDesktop = () =>
    act(() =>
      render(
        <DesktopSessionParticipants state={state} session={session} />,
        container
      )
    );

  beforeEach(() => {
    container = document.createElement("div");
    modalContainer = document.createElement("div");
    document.body.append(container, modalContainer);
    userId = signal<string | null>(null);
    const login = {
      userId,
      login: vi.fn().mockResolvedValue(null),
      getPublicProfile: vi.fn(async () => ({ name: "Ada", pictureUrl: null })),
    } as unknown as LoginManager;
    const os = CasualOSManager();
    server = fakeSharedPermissions(os, () => userId.peek());
    friends = createFriendsManager(os, login);
    modals = createModalManager();
    options = signal<SessionOptions>({
      hostUserId: "host-user",
      coHostUserIds: [],
      allowedNavigators: null,
      allowedDecorators: null,
      highlightDurationSeconds: null,
      shareTranslation: false,
      endedAt: null,
      verseSelectionEffectVisibility: "everyone",
    });
    connectedUsers = signal<ConnectedSessionUser[]>([]);
    session = {
      id: SESSION_ID,
      options,
      connectedUsers,
    } as unknown as BibleReadingSession;
    tabs = signal([{ id: "tab-1", sharedSession: session }]);
    state = {
      friends,
      login,
      os: { connectionId: "my-connection" },
      app: { toast: vi.fn() },
      tabs: { tabs, removeTab: vi.fn() },
      modals,
    } as unknown as SeedBibleState;
  });

  afterEach(() => {
    render(null, container);
    render(null, modalContainer);
    container.remove();
    modalContainer.remove();
    friends.dispose();
  });

  describe("desktop avatar stack", () => {
    it("renders nothing while nobody is connected", () => {
      renderDesktop();

      expect(container.querySelector("button")).toBeNull();
    });

    it("shows the first three participants, host first, and a count of the rest", () => {
      connectedUsers.value = [
        makeUser("c1", "Ben"),
        makeUser("c2", "Cara"),
        makeUser("c3", "Dan"),
        host(),
        makeUser("c4", "Eve"),
      ];
      renderDesktop();

      const stack = container.querySelector("button")!;
      expect(stack.getAttribute("aria-label")).toBe("Participants");
      const avatars = stack.querySelectorAll(
        ".sb-session-participants-stack-item"
      );
      expect(avatars).toHaveLength(3);
      expect(avatars[0]!.querySelector("[title]")?.getAttribute("title")).toBe(
        "Hannah"
      );
      expect(stack.textContent).toContain("+2");
    });

    it("opens the participants modal listing everyone, host first", () => {
      connectedUsers.value = [makeUser("c1", "Ben"), host()];
      renderDesktop();

      act(() => container.querySelector("button")!.click());

      expect(modalIds()).toEqual([PARTICIPANTS_MODAL_ID]);
      renderParticipantsModal();
      const names = Array.from(
        modalContainer.querySelectorAll(".sb-session-participants-list-name")
      ).map((el) => el.textContent);
      expect(names).toEqual(["Hannah", "Ben"]);
      expect(modalContainer.textContent).toContain("Host");
    });
  });

  describe("participants modal", () => {
    const openModal = () => {
      renderDesktop();
      act(() => container.querySelector("button")!.click());
      renderParticipantsModal();
    };

    it("offers Session settings to the host and opens it in place of the list", () => {
      userId.value = "host-user";
      connectedUsers.value = [host(), makeUser("c1", "Ben")];
      openModal();

      act(() => buttonByText(modalContainer, "Session settings")!.click());

      expect(modalIds()).toEqual([`session-settings-${SESSION_ID}`]);
    });

    it("hides Session settings from someone who isn't a host", () => {
      userId.value = ME;
      connectedUsers.value = [host(), makeUser("me", "Me", { isSelf: true })];
      openModal();

      expect(buttonByText(modalContainer, "Session settings")).toBeUndefined();
      expect(buttonByText(modalContainer, "Share session")).toBeDefined();
    });

    it("opens the share flow in place of the list", () => {
      connectedUsers.value = [host()];
      openModal();

      act(() => buttonByText(modalContainer, "Share session")!.click());

      expect(modalIds()).toEqual([`share-session-${SESSION_ID}`]);
    });

    it("lets a signed-in participant send a friend request", async () => {
      userId.value = ME;
      connectedUsers.value = [
        host(),
        makeUser("c1", "Ada", { userId: ADA_ID }),
      ];
      await friends.refresh();
      openModal();

      const addFriend = modalContainer.querySelector(
        'button[aria-label="Add Ada as a friend"]'
      ) as HTMLButtonElement | null;
      expect(addFriend).not.toBeNull();

      await act(async () => addFriend!.click());
      await vi.waitFor(() =>
        expect(server.rows).toMatchObject([
          { requestingUserId: ME, targetUserId: ADA_ID, status: "requested" },
        ])
      );
    });

    // Closing a tab disposes its session, which leaves the roster as it was —
    // so the roster stays full here, just as it does in the app.
    it("closes itself once the session's tab is gone", () => {
      connectedUsers.value = [host(), makeUser("c1", "Ben")];
      openModal();

      act(() => {
        tabs.value = [];
      });

      expect(modalIds()).toEqual([]);
    });

    // A reconnect clears the roster for a moment before it fills back in.
    it("stays open while the roster is briefly empty", () => {
      connectedUsers.value = [host()];
      openModal();

      act(() => {
        connectedUsers.value = [];
      });
      act(() => {
        connectedUsers.value = [host()];
      });

      expect(modalIds()).toEqual([PARTICIPANTS_MODAL_ID]);
      expect(
        modalContainer.querySelector(".sb-session-participants-list-name")
          ?.textContent
      ).toBe("Hannah");
    });

    it("also closes the Session settings it opened once the session's tab is gone", () => {
      userId.value = "host-user";
      connectedUsers.value = [host()];
      openModal();
      act(() => buttonByText(modalContainer, "Session settings")!.click());
      const settings = modals.modals.value[0]!;
      act(() =>
        render(<>{settings.content({ t: (key) => key })}</>, modalContainer)
      );

      act(() => {
        tabs.value = [];
      });

      expect(modalIds()).toEqual([]);
    });
  });

  describe("mobile sheet", () => {
    const renderMobile = () =>
      act(() =>
        render(
          <MobileSessionParticipants state={state} session={session} />,
          container
        )
      );
    const sheet = () =>
      document.body.querySelector(
        '.sb-session-participants-sheet[role="dialog"]'
      );

    it("opens a bottom sheet, not a modal, with the same roster", () => {
      connectedUsers.value = [makeUser("c1", "Ben"), host()];
      renderMobile();

      act(() =>
        (
          container.querySelector(
            ".sb-session-participants-stack"
          ) as HTMLButtonElement
        ).click()
      );

      expect(modalIds()).toEqual([]);
      const names = Array.from(
        sheet()!.querySelectorAll(".sb-session-participants-list-name")
      ).map((el) => el.textContent);
      expect(names).toEqual(["Hannah", "Ben"]);
    });

    it("closes the sheet when Share session opens the share flow", () => {
      connectedUsers.value = [host()];
      renderMobile();
      act(() =>
        (
          container.querySelector(
            ".sb-session-participants-stack"
          ) as HTMLButtonElement
        ).click()
      );

      act(() => buttonByText(sheet()!, "Share session")!.click());

      expect(sheet()).toBeNull();
      expect(modalIds()).toEqual([`share-session-${SESSION_ID}`]);
    });
  });
});
