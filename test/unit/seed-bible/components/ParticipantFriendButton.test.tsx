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
import {
  fail,
  fakeSharedPermissions,
  ME,
} from "../testUtils/fakeSharedPermissions";

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
    copy.querySelectorAll(".sb-spinner").forEach((spinner) => spinner.remove());
    return copy.textContent;
  };
  const button = (label: string) =>
    Array.from(container.querySelectorAll("button")).find(
      (el) => visibleLabel(el) === label
    ) as HTMLButtonElement | undefined;
  const text = () => container.textContent ?? "";

  const renderButton = async (
    participantId: string | null,
    displayName = "Ada"
  ) => {
    await friends.refresh();
    act(() =>
      render(
        <ParticipantFriendButton
          state={state}
          userId={participantId}
          displayName={displayName}
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
      getPublicProfile: vi.fn(async () => ({ name: "Ada", pictureUrl: null })),
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
    friends.dispose();
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

  // The name a participant shows in a session is whatever they typed, so it
  // can't be what accepting their request goes by.
  it("names the request it accepts by the requester's profile, not their name in the session", async () => {
    server.requestFrom(ADA_ID);
    await renderButton(ADA_ID, "Pastor John");

    expect(button("Accept")!.getAttribute("aria-label")).toBe(
      "Accept Ada's friend request"
    );
    act(() => button("Accept")!.click());
    await settle();

    expect(toast).toHaveBeenCalledWith("You're now friends with Ada.");
  });

  it("names the person it sends a request to by their profile, not their name in the session", async () => {
    await renderButton(ADA_ID, "Pastor John");

    act(() => button("Add friend")!.click());
    await settle();

    expect(toast).toHaveBeenCalledWith("Friend request sent to Ada.");
  });

  it("sends the request without waiting for their profile", async () => {
    await renderButton(ADA_ID, "Pastor John");
    let answer!: (profile: { name: string }) => void;
    vi.mocked(state.login.getPublicProfile).mockReturnValueOnce(
      new Promise((resolve) => (answer = resolve))
    );

    act(() => button("Add friend")!.click());
    for (let i = 0; i < 5; i++) {
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    }
    expect(server.rows).toMatchObject([
      { requestingUserId: ME, targetUserId: ADA_ID, status: "requested" },
    ]);
    expect(toast).not.toHaveBeenCalled();

    await act(async () => answer({ name: "Ada" }));
    await settle();
    expect(toast).toHaveBeenCalledWith("Friend request sent to Ada.");
  });

  it("still sends the request when their profile can't be read", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await renderButton(ADA_ID, "Pastor John");
    vi.mocked(state.login.getPublicProfile).mockRejectedValueOnce(
      new Error("offline")
    );

    act(() => button("Add friend")!.click());
    await settle();

    expect(server.rows).toMatchObject([
      { requestingUserId: ME, targetUserId: ADA_ID, status: "requested" },
    ]);
    expect(toast).toHaveBeenCalledWith(
      `Friend request sent to User ${ADA_ID.slice(0, 8)}.`
    );
    consoleWarn.mockRestore();
  });

  // Same wording as answering from the Friends screen or the profile card.
  it("says when a request expired before it was accepted", async () => {
    const request = server.requestFrom(ADA_ID);
    await renderButton(ADA_ID);
    request.expireTimeMs = Date.now() - 1;

    act(() => button("Accept")!.click());
    await settle();

    expect(toast).toHaveBeenCalledWith("That request has expired.");
  });

  it("says so when sending fails, and can be pressed again", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    await renderButton(ADA_ID);
    server.spies.request.mockResolvedValueOnce(fail("server_error") as never);

    act(() => button("Add friend")!.click());
    await settle();

    expect(toast).toHaveBeenCalledWith("Couldn't send the request. Try again.");
    expect(server.rows).toEqual([]);
    expect(button("Add friend")!.disabled).toBe(false);
    consoleError.mockRestore();
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
    const openSettings = async (
      hostUserId: string,
      otherTabs: { userId: string; connectionId: string }[] = []
    ) => {
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
          ...otherTabs.map((tab) => ({
            ...tab,
            isSelf: false,
            profile: { name: "Ada" },
          })),
        ]),
        updateOptions: vi.fn(),
        readingState: {
          bookId: signal("GEN"),
          chapterNumber: signal(1),
          visibleVerseRange: signal(null),
          translationBooks: signal(null),
        },
        groupPosition: signal({
          translationId: null,
          bookId: "GEN",
          chapterNumber: 1,
          scrollToVerse: null,
        }),
        participantPositions: signal(new Map()),
        participantsAwayFromGroup: signal(new Set()),
        comeBackRequests: signal(new Map()),
        comeBackCooldownRemainingMs: () => 0,
      } as unknown as BibleReadingSession;
      await friends.refresh();
      openSessionSettingsModal(state, session);
      act(() => render(modalContent!(), container));
      await settle();
      return session;
    };

    it("lets a participant who isn't the host add people as friends", async () => {
      await openSettings(ADA_ID);

      expect(text()).toContain("Participants");
      expect(button("Add friend")).toBeDefined();
      // Promoting people stays the host's job.
      expect(button("Make co-host")).toBeUndefined();
    });

    it("offers Add friend once for someone who joined from two tabs", async () => {
      await openSettings(ME, [
        { userId: ADA_ID, connectionId: "ada-second-tab" },
      ]);

      const addButtons = Array.from(
        container.querySelectorAll("button")
      ).filter((el) => visibleLabel(el) === "Add friend");
      expect(addButtons).toHaveLength(1);
    });

    it("gives the host both Add friend and Make co-host", async () => {
      await openSettings(ME);

      expect(button("Add friend")).toBeDefined();
      expect(button("Make co-host")).toBeDefined();
    });

    const viewingAreaButton = (label: string) => {
      const group = container.querySelector('[aria-label="Viewing areas"]');
      return Array.from(group?.querySelectorAll("button") ?? []).find(
        (el) => visibleLabel(el) === label
      ) as HTMLButtonElement | undefined;
    };

    it("lets the host choose whose viewing areas are shown", async () => {
      const session = await openSettings(ME);

      expect(viewingAreaButton("Automatic")!.getAttribute("aria-pressed")).toBe(
        "true"
      );
      expect(text()).toContain(
        "Show everyone's place when fewer than 4 people are here"
      );

      act(() => viewingAreaButton("Hosts only")!.click());

      expect(session.updateOptions).toHaveBeenCalledWith({
        viewingAreaVisibility: "hosts-only",
      });
    });

    it("shows the viewing-area choice to someone who is not the host, without letting them change it", async () => {
      const session = await openSettings(ADA_ID);

      expect(viewingAreaButton("Automatic")!.disabled).toBe(true);
      expect(viewingAreaButton("Everyone")!.disabled).toBe(true);
      expect(viewingAreaButton("Hosts only")!.disabled).toBe(true);

      act(() => viewingAreaButton("Everyone")!.click());

      expect(session.updateOptions).not.toHaveBeenCalled();
    });
  });
});
