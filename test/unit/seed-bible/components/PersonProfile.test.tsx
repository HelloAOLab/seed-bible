import { render, type VNode } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { openPersonProfile } from "@packages/seed-bible/seed-bible/components/FriendsPane/PersonCard";
import { MobileSessionParticipants } from "@packages/seed-bible/seed-bible/components/SessionParticipants/SessionParticipants";
import { openSessionSettingsModal } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import {
  createFriendsManager,
  type FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type {
  LoginManager,
  UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  getUserAnimalVisual,
  type BibleReadingSession,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";
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
const NOBODY_ID = "99999999-9999-4999-8999-999999999999";

describe("person profile card", () => {
  let container: HTMLDivElement;
  let userId: Signal<string | null>;
  /** Public profiles by user ID; null means no account has the ID. */
  let profiles: Record<string, UserProfile | null>;
  let login: LoginManager;
  let server: ReturnType<typeof fakeSharedPermissions>;
  let friends: FriendsManager;
  let toast: ReturnType<typeof vi.fn>;
  /** Every modal opened, by ID, most recent last. */
  let opened: { id: string; content: () => VNode; onDismiss?: () => void }[];
  let state: SeedBibleState;
  let writeText: ReturnType<typeof vi.fn>;

  const modal = (id: string) =>
    [...opened].reverse().find((m) => m.id === id) ?? null;

  /** Lets an action and the refresh it starts finish (see FriendsPane.test). */
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    }
    await vi.waitFor(() => expect(friends.isLoading.value).toBe(false));
    await act(async () => {});
  };

  /** What a button shows, leaving out the hidden alternate label and spinner. */
  const visibleLabel = (el: Element) => {
    const copy = el.cloneNode(true) as Element;
    copy
      .querySelectorAll(
        ".sb-friends-copy-label--hidden, .sb-friends-busy-spinner"
      )
      .forEach((hidden) => hidden.remove());
    return copy.textContent;
  };
  const buttonLabels = (root: ParentNode = container) =>
    Array.from(root.querySelectorAll("button")).map(visibleLabel);
  const button = (label: string, root: ParentNode = container) =>
    Array.from(root.querySelectorAll("button")).find(
      (el) => visibleLabel(el) === label
    ) as HTMLButtonElement | undefined;
  const click = async (el: HTMLElement | undefined) => {
    expect(el).toBeDefined();
    await act(async () => el!.click());
    await settle();
  };
  const text = () => container.textContent ?? "";

  /** Opens the card for `id` the way any screen would, by user ID alone. */
  const openCard = async (id: string) => {
    await friends.refresh();
    openPersonProfile(state, id);
    act(() => render(modal("person-profile")!.content(), container));
    await settle();
  };

  /** Signs in afresh, so the friends lists have to be read again. */
  const signInAgain = () =>
    act(() => {
      userId.value = null;
      userId.value = ME;
    });

  /** Renders the remove confirmation the card opened, and confirms it. */
  const confirmRemove = async () => {
    const dialog = document.createElement("div");
    act(() => render(modal(`remove-friend-${ADA_ID}`)!.content(), dialog));
    await click(button("Remove", dialog));
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    userId = signal<string | null>(ME);
    profiles = { [ADA_ID]: { name: "Ada", location: "London" } };
    login = {
      userId,
      login: vi.fn().mockResolvedValue(null),
      getPublicProfile: vi.fn(async (id: string) =>
        id in profiles ? profiles[id] : { name: "" }
      ),
    } as unknown as LoginManager;
    const os = CasualOSManager();
    server = fakeSharedPermissions(os, () => userId.peek());
    friends = createFriendsManager(os, login);
    toast = vi.fn();
    opened = [];
    state = {
      friends,
      login,
      os: { connectionId: "my-connection" },
      app: { toast },
      tabs: { tabs: signal([]), removeTab: vi.fn() },
      modals: {
        openModal: vi.fn((m: (typeof opened)[number]) => {
          opened.push(m);
        }),
        closeModal: vi.fn(),
      },
      navigation: {
        linkToBareRoot: (query: Record<string, string>) =>
          `https://seedbible.test/?${new URLSearchParams(query)}`,
      },
    } as unknown as SeedBibleState;
    writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    friends.dispose();
  });

  describe("when you're not friends", () => {
    it("sends a request, then offers to take it back", async () => {
      await openCard(ADA_ID);
      expect(text()).toContain("London");
      expect(text()).toContain("You're not friends yet.");

      await click(button("Add friend"));

      expect(server.rows).toMatchObject([
        { requestingUserId: ME, targetUserId: ADA_ID, status: "requested" },
      ]);
      expect(toast).toHaveBeenCalledWith("Friend request sent to Ada.");
      expect(text()).toContain("Waiting for them to accept");
      expect(buttonLabels()).toEqual(["Copy link", "Cancel"]);
    });

    it("says so when sending fails, and can be pressed again", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      await openCard(ADA_ID);
      server.spies.request.mockResolvedValueOnce(fail("server_error") as never);

      await click(button("Add friend"));

      expect(toast).toHaveBeenCalledWith(
        "Couldn't send the request. Try again."
      );
      expect(server.rows).toEqual([]);
      expect(button("Add friend")!.disabled).toBe(false);
      consoleError.mockRestore();
    });

    // Nothing was copied here, so the message mustn't blame a copying mistake.
    it("says so when their account is gone by the time the request is sent", async () => {
      await openCard(ADA_ID);
      server.spies.request.mockResolvedValueOnce(
        fail("user_not_found") as never
      );

      await click(button("Add friend"));

      expect(toast).toHaveBeenCalledWith("We couldn't find this account.");
      expect(server.rows).toEqual([]);
    });

    it("waits for the profile before offering to add them", async () => {
      let answer!: (profile: UserProfile) => void;
      vi.mocked(login.getPublicProfile).mockReturnValueOnce(
        new Promise((resolve) => (answer = resolve))
      );
      await openCard(ADA_ID);
      expect(button("Add friend")).toBeUndefined();

      await act(async () => answer({ name: "Ada" }));
      await settle();

      expect(button("Add friend")).toBeDefined();
    });

    // Opened straight after sign-in, a friend isn't in the lists yet.
    it("waits for the friends lists before offering to add them", async () => {
      server.friendsWith(ADA_ID);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));
      const listRecords = server.spies.listRecords.getMockImplementation()!;
      server.spies.listRecords.mockImplementationOnce(async () => {
        await gate;
        return listRecords();
      });
      signInAgain();
      openPersonProfile(state, ADA_ID);
      act(() => render(modal("person-profile")!.content(), container));
      for (let i = 0; i < 5; i++) {
        await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
      }

      // The profile has loaded; only the lists are still on their way.
      expect(text()).toContain("London");
      expect(button("Add friend")).toBeUndefined();

      release();
      await settle();
      expect(buttonLabels()).toEqual(["Remove"]);
    });

    // Read as "not friends", empty lists would offer Add friend to a friend.
    it("offers nothing until the friends lists have been read", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      server.friendsWith(ADA_ID);
      const listRecords = server.spies.listRecords.getMockImplementation()!;
      server.spies.listRecords.mockRejectedValue(new Error("offline"));
      signInAgain();
      await openCard(ADA_ID);

      expect(text()).toContain("London");
      expect(text()).not.toContain("You're not friends yet.");
      expect(buttonLabels()).toEqual([]);

      server.spies.listRecords.mockImplementation(listRecords);
      await act(() => friends.refresh());
      await settle();
      expect(buttonLabels()).toEqual(["Remove"]);
      consoleError.mockRestore();
    });

    it("keeps offering to add them while the lists refresh", async () => {
      await openCard(ADA_ID);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));
      const listRecords = server.spies.listRecords.getMockImplementation()!;
      server.spies.listRecords.mockImplementationOnce(async () => {
        await gate;
        return listRecords();
      });

      const refreshing = friends.refresh();
      await act(async () => {});
      expect(friends.isLoading.value).toBe(true);
      expect(buttonLabels()).toEqual(["Add friend"]);

      release();
      await act(() => refreshing);
      await settle();
      expect(buttonLabels()).toEqual(["Add friend"]);
    });

    it("still offers to add them when the profile can't be read", async () => {
      vi.mocked(login.getPublicProfile).mockRejectedValue(new Error("offline"));
      const consoleWarn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => {});
      await openCard(ADA_ID);

      expect(button("Add friend")).toBeDefined();
      consoleWarn.mockRestore();
    });
  });

  describe("when you've sent them a request", () => {
    it("cancels it", async () => {
      server.requestTo(ADA_ID);
      await openCard(ADA_ID);

      await click(button("Cancel"));

      expect(server.rows[0]!.status).toBe("revoked");
      expect(toast).toHaveBeenCalledWith(
        "Canceled your friend request to Ada."
      );
      expect(buttonLabels()).toEqual(["Add friend"]);
    });

    it("copies the link to the request", async () => {
      const request = server.requestTo(ADA_ID);
      await openCard(ADA_ID);
      expect(button("Copy link")!.getAttribute("aria-label")).toBe(
        "Copy the link to your friend request to Ada"
      );

      await click(button("Copy link"));

      expect(writeText).toHaveBeenCalledWith(
        `https://seedbible.test/?friendRequest=${request.id}`
      );
    });

    it("says so when cancelling fails, and keeps the request", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      server.requestTo(ADA_ID);
      await openCard(ADA_ID);
      server.spies.revoke.mockResolvedValueOnce(fail("server_error") as never);

      await click(button("Cancel"));

      expect(toast).toHaveBeenCalledWith(
        "Couldn't cancel the request. Try again."
      );
      expect(buttonLabels()).toEqual(["Copy link", "Cancel"]);
      expect(button("Cancel")!.disabled).toBe(false);
      consoleError.mockRestore();
    });
  });

  describe("when they've sent you a request", () => {
    it("accepts it, and then offers to remove them", async () => {
      server.requestFrom(ADA_ID);
      await openCard(ADA_ID);
      expect(text()).toContain("Ada wants to be friends.");

      await click(button("Accept"));

      expect(friends.friendIds.value).toEqual([ADA_ID]);
      expect(toast).toHaveBeenCalledWith("You're now friends with Ada.");
      expect(text()).toContain("You're friends with Ada.");
      expect(buttonLabels()).toEqual(["Remove"]);
    });

    it("declines it", async () => {
      server.requestFrom(ADA_ID);
      await openCard(ADA_ID);

      await click(button("Decline"));

      expect(server.rows[0]!.status).toBe("rejected");
      expect(toast).toHaveBeenCalledWith("Declined Ada's friend request.");
      expect(buttonLabels()).toEqual(["Add friend"]);
    });

    it("says so when answering fails, and keeps the request", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      server.requestFrom(ADA_ID);
      await openCard(ADA_ID);
      server.spies.accept.mockResolvedValueOnce(fail("server_error") as never);

      await click(button("Accept"));

      expect(toast).toHaveBeenCalledWith(
        "Couldn't answer the request. Try again."
      );
      expect(buttonLabels()).toEqual(["Decline", "Accept"]);
      expect(button("Accept")!.disabled).toBe(false);
      consoleError.mockRestore();
    });

    it("spins only the answer being sent", async () => {
      server.requestFrom(ADA_ID);
      await openCard(ADA_ID);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));
      const accept = server.spies.accept.getMockImplementation()!;
      server.spies.accept.mockImplementationOnce((async (
        ...args: Parameters<typeof accept>
      ) => {
        await gate;
        return accept(...args);
      }) as never);

      await act(async () => button("Accept")!.click());

      expect(button("Accept")!.getAttribute("aria-busy")).toBe("true");
      expect(button("Decline")!.disabled).toBe(true);
      expect(
        button("Decline")!.querySelector(".sb-friends-busy-spinner")
      ).toBeNull();

      release();
      await settle();
      expect(buttonLabels()).toEqual(["Remove"]);
    });
  });

  describe("when you're friends", () => {
    it("removes them after confirming", async () => {
      server.friendsWith(ADA_ID);
      await openCard(ADA_ID);
      expect(text()).toContain("You're friends with Ada.");

      await click(button("Remove"));
      // Nothing changes until the confirmation is accepted.
      expect(server.rows[0]!.status).toBe("accepted");
      await confirmRemove();

      expect(server.rows[0]!.status).toBe("revoked");
      expect(friends.friendIds.value).toEqual([]);
      expect(buttonLabels()).toEqual(["Add friend"]);
    });

    // The card shows them as a stranger as soon as removal starts, but a
    // request sent before it finishes would be ended along with it.
    it("holds off Add friend until the removal is done", async () => {
      server.friendsWith(ADA_ID);
      await openCard(ADA_ID);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));
      const revoke = server.spies.revoke.getMockImplementation()!;
      server.spies.revoke.mockImplementationOnce((async (
        ...args: Parameters<typeof revoke>
      ) => {
        await gate;
        return revoke(...args);
      }) as never);

      await click(button("Remove"));
      const dialog = document.createElement("div");
      act(() => render(modal(`remove-friend-${ADA_ID}`)!.content(), dialog));
      await act(async () => button("Remove", dialog)!.click());

      expect(buttonLabels()).toEqual(["Add friend"]);
      expect(button("Add friend")!.disabled).toBe(true);

      release();
      await settle();
      expect(button("Add friend")!.disabled).toBe(false);
    });

    it("says so when removing fails, and keeps them", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      server.friendsWith(ADA_ID);
      await openCard(ADA_ID);
      server.spies.revoke.mockResolvedValueOnce(fail("server_error") as never);

      await click(button("Remove"));
      await confirmRemove();

      expect(toast).toHaveBeenCalledWith(
        "Couldn't remove the friend. Try again."
      );
      expect(buttonLabels()).toEqual(["Remove"]);
      consoleError.mockRestore();
    });
  });

  it("says it's you on your own profile, and offers nothing", async () => {
    profiles[ME] = { name: "Me" };
    await openCard(ME);

    expect(text()).toContain("This is you.");
    expect(buttonLabels()).toEqual([]);
  });

  it("offers nothing for a user ID no account has", async () => {
    profiles[NOBODY_ID] = null;
    await openCard(NOBODY_ID);

    expect(text()).toContain("We couldn't find anyone with this user ID.");
    expect(text()).not.toContain("You're not friends yet.");
    expect(buttonLabels()).toEqual([]);
  });

  // The request went out before anyone noticed the ID was wrong, and it
  // should still be possible to take it back.
  it("still lets you cancel a request sent to a user ID no account has", async () => {
    profiles[NOBODY_ID] = null;
    server.requestTo(NOBODY_ID);
    await openCard(NOBODY_ID);

    expect(buttonLabels()).toEqual(["Copy link", "Cancel"]);
  });

  it("offers nothing while signed out", async () => {
    userId.value = null;
    await openCard(ADA_ID);

    expect(text()).toContain("Ada");
    expect(buttonLabels()).toEqual([]);
  });

  it("takes their name from the friends lists when their profile can't be read", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(login.getPublicProfile).mockRejectedValueOnce(
      new Error("offline")
    );
    await openCard(ADA_ID);
    expect(text()).toContain(`User ${ADA_ID.slice(0, 8)}`);

    // Their request brings their profile into the lists.
    server.requestFrom(ADA_ID);
    await act(() => friends.refresh());
    await settle();

    expect(text()).toContain("Ada wants to be friends.");
    expect(text()).not.toContain(`User ${ADA_ID.slice(0, 8)}`);
    consoleWarn.mockRestore();
  });

  it("follows a request that arrives while it's open", async () => {
    await openCard(ADA_ID);
    expect(buttonLabels()).toEqual(["Add friend"]);

    server.requestFrom(ADA_ID);
    await act(() => friends.refresh());
    await settle();

    expect(buttonLabels()).toEqual(["Decline", "Accept"]);
  });

  it("names the person by their profile in what it says", async () => {
    server.requestFrom(ADA_ID);
    await openCard(ADA_ID);

    expect(button("Accept")!.getAttribute("aria-label")).toBe(
      "Accept Ada's friend request"
    );
    expect(button("Decline")!.getAttribute("aria-label")).toBe(
      "Decline Ada's friend request"
    );
  });

  describe("from a session's participants", () => {
    const session = (participantName: string) =>
      ({
        id: "session-1",
        options: signal({
          hostUserId: ME,
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
            visual: getUserAnimalVisual(ME),
          },
          {
            userId: ADA_ID,
            connectionId: "ada-connection",
            isSelf: false,
            profile: { name: participantName },
            visual: getUserAnimalVisual(ADA_ID),
          },
          {
            userId: null,
            connectionId: "anonymous-connection",
            isSelf: false,
            profile: { name: "Visitor" },
            visual: getUserAnimalVisual("anonymous-connection"),
          },
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
        comeBackRequests: signal(new Map()),
        comeBackCooldownRemainingMs: () => 0,
        isAwayFromGroup: signal(false),
        participantsAwayFromGroup: signal(new Set()),
      }) as unknown as BibleReadingSession;

    const nameButton = (root: ParentNode, name: string) =>
      root.querySelector<HTMLButtonElement>(
        `.sb-participant-profile-button[aria-label="View ${name}'s profile"]`
      ) ?? undefined;

    it("opens from a name in session settings, by their profile rather than their session name", async () => {
      await friends.refresh();
      openSessionSettingsModal(state, session("Pastor John"));
      act(() =>
        render(modal("session-settings-session-1")!.content(), container)
      );
      await settle();

      // Anonymous participants have no account, so no profile to open.
      expect(nameButton(container, "Visitor")).toBeUndefined();
      expect(text()).toContain("Visitor");

      await click(nameButton(container, "Pastor John"));
      const card = document.createElement("div");
      act(() => render(modal("person-profile")!.content(), card));
      await settle();

      expect(card.textContent).toContain("Ada");
      expect(card.textContent).not.toContain("Pastor John");
      await click(button("Add friend", card));
      expect(toast).toHaveBeenCalledWith("Friend request sent to Ada.");
      render(null, card);
    });

    it("opens from a name in the mobile participants sheet, which comes back when the profile closes", async () => {
      await friends.refresh();
      act(() =>
        render(
          <MobileSessionParticipants state={state} session={session("Ada")} />,
          container
        )
      );
      await click(
        container.querySelector<HTMLButtonElement>(
          ".sb-session-participants-stack"
        ) ?? undefined
      );
      const sheetName = nameButton(document.body, "Ada");

      await click(sheetName);

      expect(modal("person-profile")).not.toBeNull();
      // The sheet sits above every modal, so it has to go for the profile
      // to be seen.
      expect(nameButton(document.body, "Ada")).toBeUndefined();

      // Closing the profile goes back to the list it was opened from.
      act(() => modal("person-profile")!.onDismiss!());
      expect(nameButton(document.body, "Ada")).toBeDefined();
    });
  });
});
