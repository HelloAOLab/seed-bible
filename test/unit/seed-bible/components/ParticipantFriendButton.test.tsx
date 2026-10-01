import type { Mock } from "vitest";
import { render, type VNode } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { ParticipantFriendButton } from "@packages/seed-bible/seed-bible/components/FriendsPane/ParticipantFriendButton";
import { openSessionSettingsModal } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import {
  createFriendsManager,
  type FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BibleReadingSession } from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import { fakeSharedPermissions, ME } from "../testUtils/fakeSharedPermissions";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const ADA_ID = "11111111-1111-4111-8111-111111111111";

describe("ParticipantFriendButton", () => {
  let container: HTMLDivElement;
  let userId: Signal<string | null>;
  let server: ReturnType<typeof fakeSharedPermissions>;
  let friends: FriendsManager;
  let toast: Mock<(message: string) => void>;
  let state: SeedBibleState;
  let modalContent: (() => VNode) | null;

  /** Lets an action and the refresh it starts finish (see FriendsPane.test). */
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    }
    await vi.waitFor(() => expect(friends.isLoading.value).toBe(false));
    await act(async () => {});
  };

  /** What a button shows, leaving out the spinner while it works. */
  const visibleLabel = (el: Element) => {
    const copy = el.cloneNode(true) as Element;
    copy
      .querySelectorAll(".sb-friends-busy-spinner")
      .forEach((spinner) => spinner.remove());
    return copy.textContent;
  };
  const button = (label: string) =>
    Array.from(container.querySelectorAll("button")).find(
      (el) => visibleLabel(el) === label
    ) as HTMLButtonElement | undefined;
  const text = () => container.textContent ?? "";

  const renderButton = async (participantId: string | null) => {
    await friends.refresh();
    act(() =>
      render(
        <ParticipantFriendButton
          state={state}
          userId={participantId}
          displayName="Ada"
        />,
        container
      )
    );
    await settle();
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    userId = signal<string | null>(ME);
    const login = {
      userId,
      login: vi.fn().mockResolvedValue(null),
      getUserProfile: vi.fn(async () => ({ name: "Ada", pictureUrl: null })),
    } as unknown as LoginManager;
    const os = CasualOSManager();
    server = fakeSharedPermissions(os, () => userId.peek());
    friends = createFriendsManager(os, login);
    toast = vi.fn<(message: string) => void>();
    modalContent = null;
    state = {
      friends,
      login,
      os: { connectionId: "my-connection" },
      app: { toast },
      tabs: { tabs: signal([]), removeTab: vi.fn() },
      modals: {
        openModal: vi.fn((modal: { content: () => VNode }) => {
          modalContent = modal.content;
        }),
        closeModal: vi.fn(),
      },
    } as unknown as SeedBibleState;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("sends a request and then shows it as requested", async () => {
    await renderButton(ADA_ID);

    act(() => button("Add friend")!.click());
    await settle();

    expect(server.rows).toMatchObject([
      { requestingUserId: ME, targetUserId: ADA_ID, status: "requested" },
    ]);
    expect(toast).toHaveBeenCalledWith("Friend request sent to Ada.");
    expect(button("Add friend")).toBeUndefined();
    expect(text()).toBe("Requested");
  });

  it("names the person it acts on for screen readers", async () => {
    await renderButton(ADA_ID);

    expect(button("Add friend")!.getAttribute("aria-label")).toBe(
      "Add Ada as a friend"
    );
  });

  it("offers to accept a request they already sent", async () => {
    server.requestFrom(ADA_ID);
    await renderButton(ADA_ID);

    act(() => button("Accept")!.click());
    await settle();

    expect(friends.friendIds.value).toEqual([ADA_ID]);
    expect(toast).toHaveBeenCalledWith("You're now friends with Ada.");
    expect(text()).toBe("Friends");
  });

  it("shows an existing friendship instead of a button", async () => {
    server.friendsWith(ADA_ID);
    await renderButton(ADA_ID);

    expect(text()).toBe("Friends");
    expect(container.querySelector("button")).toBeNull();
  });

  it("renders nothing for the user themselves", async () => {
    await renderButton(ME);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for an anonymous participant", async () => {
    await renderButton(null);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing while signed out", async () => {
    userId.value = null;
    await renderButton(ADA_ID);

    expect(container.innerHTML).toBe("");
  });

  describe("in session settings", () => {
    const openSettings = async (hostUserId: string) => {
      const session = {
        id: "session-1",
        options: signal({
          hostUserId,
          allowedNavigators: null,
          allowedDecorators: null,
          shareTranslation: true,
          highlightDurationSeconds: null,
          coHostUserIds: [],
        }),
        connectedUsers: signal([
          {
            userId: ME,
            connectionId: "my-connection",
            isSelf: true,
            profile: { name: "Me" },
          },
          {
            userId: ADA_ID,
            connectionId: "ada-connection",
            isSelf: false,
            profile: { name: "Ada" },
          },
        ]),
        updateOptions: vi.fn(),
      } as unknown as BibleReadingSession;
      await friends.refresh();
      openSessionSettingsModal(state, session);
      act(() => render(modalContent!(), container));
      await settle();
    };

    it("lets a participant who isn't the host add people as friends", async () => {
      await openSettings(ADA_ID);

      expect(text()).toContain("Participants");
      expect(button("Add friend")).toBeDefined();
      // Promoting people stays the host's job.
      expect(button("Make co-host")).toBeUndefined();
    });

    it("gives the host both Add friend and Make co-host", async () => {
      await openSettings(ME);

      expect(button("Add friend")).toBeDefined();
      expect(button("Make co-host")).toBeDefined();
    });
  });
});
