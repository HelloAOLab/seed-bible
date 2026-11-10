import { render } from "preact";
import { act } from "preact/test-utils";
import { NotificationsFeed } from "@packages/seed-bible/seed-bible/components/NotificationsFeed/NotificationsFeed";
import {
  createModalManager,
  type ModalManager,
} from "@packages/seed-bible/seed-bible/managers/ModalManager";
import type { FriendsManager } from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import {
  releaseNotesUrl,
  type NotificationsManager,
} from "@packages/seed-bible/seed-bible/managers/NotificationsManager";
import { createPushNotificationsManager } from "@packages/seed-bible/seed-bible/managers/PushNotificationsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { ME } from "../../testUtils/fakeSharedPermissions";
import {
  HARNESS_APP_VERSION,
  notificationsHarness,
  type NotificationsHarness,
} from "../../testUtils/notificationsHarness";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

const ADA_ID = "11111111-1111-4111-8111-111111111111";
const BOB_ID = "22222222-2222-4222-8222-222222222222";

describe("NotificationsFeed", () => {
  let container: HTMLDivElement;
  let harness: NotificationsHarness;
  let notifications: NotificationsManager;
  let friends: FriendsManager;
  let modals: ModalManager;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    harness = notificationsHarness();
    harness.names[ADA_ID] = "Ada";
    harness.names[BOB_ID] = "Bob";
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    harness.dispose();
    vi.restoreAllMocks();
  });

  /** An account that last ran an older version, so it has an update notice. */
  const updatedFromOlderVersion = () => {
    harness.accounts.set(ME, {
      seen: {},
      dismissed: {},
      appVersion: { version: "1.17.0", previousVersion: null, sinceMs: 1 },
    });
  };

  /**
   * Starts the managers, waits for everything to load, and opens the list the
   * way the bell does.
   */
  const openFeed = async () => {
    ({ notifications, friends } = harness.start());
    modals = createModalManager();
    const state = {
      notifications,
      friends,
      // A browser without push here, so it shows no card.
      pushNotifications: createPushNotificationsManager({
        os: harness.os,
        login: harness.login,
      }),
      login: harness.login,
      modals,
      app: { toast: harness.toast },
    } as unknown as SeedBibleState;
    await vi.waitFor(() => expect(notifications.isReady.value).toBe(true));
    act(() => {
      modals.openModal({ id: "notifications", title: "", content: null });
      notifications.openFeed();
      render(<NotificationsFeed state={state} />, container);
    });
  };

  /** Waits for the fake server's answers and the re-render they cause. */
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    }
    await vi.waitFor(() => expect(friends.isLoading.value).toBe(false));
    await act(async () => {});
  };

  const rows = () =>
    Array.from(
      container.querySelectorAll<HTMLElement>(".sb-notifications-row")
    );
  const rowFor = (text: string) =>
    rows().find((row) => row.textContent?.includes(text));
  const unreadRows = () =>
    rows().filter((row) =>
      row.classList.contains("sb-notifications-row--unread")
    );
  /** A button by what it shows, leaving out the spinner. */
  const button = (root: ParentNode, label: string) =>
    Array.from(root.querySelectorAll("button")).find(
      (el) =>
        (el.querySelector(".sb-friends-busy-label") ?? el).textContent === label
    );
  const dismissButton = (row: HTMLElement) =>
    row.querySelector<HTMLButtonElement>(".sb-notifications-dismiss")!;
  const click = async (el: HTMLElement | undefined) => {
    expect(el).toBeDefined();
    await act(async () => el!.click());
    await settle();
  };
  const text = () => container.textContent ?? "";

  it("lists notifications newest first, all marked as new the first time", async () => {
    harness.server.requestFrom(ADA_ID, { createdAtMs: 1000 });
    harness.server.requestFrom(BOB_ID, { createdAtMs: 2000 });
    updatedFromOlderVersion();

    await openFeed();

    await vi.waitFor(() => expect(rows()).toHaveLength(3));
    expect(rows().map((row) => row.textContent)).toEqual([
      expect.stringContaining(
        `Seed Bible was updated to version ${HARNESS_APP_VERSION}`
      ),
      expect.stringContaining("Bob"),
      expect.stringContaining("Ada"),
    ]);
    expect(unreadRows()).toHaveLength(3);
    // The dot is drawn by CSS; screen readers get a word instead.
    expect(rows()[0]!.querySelector(".sr-only")?.textContent).toBe("New");
  });

  it("marks only what's arrived since the list was last opened", async () => {
    harness.server.requestFrom(ADA_ID);
    await openFeed();
    act(() => notifications.closeFeed());

    harness.server.requestFrom(BOB_ID);
    await act(() => friends.refresh());
    act(() => notifications.openFeed());
    await settle();

    expect(rows()).toHaveLength(2);
    expect(unreadRows().map((row) => row.textContent)).toEqual([
      expect.stringContaining("Bob"),
    ]);
    expect(rowFor("Ada")!.querySelector(".sr-only")).toBeNull();
  });

  describe("a friend request", () => {
    it("says who sent it and when", async () => {
      harness.server.requestFrom(ADA_ID);
      await openFeed();
      await vi.waitFor(() => expect(rowFor("Ada")).toBeDefined());

      const row = rowFor("Ada")!;
      expect(row.querySelector(".sb-friends-person-name")?.textContent).toBe(
        "Ada"
      );
      const subtitle = row.querySelector(".sb-friends-person-subtitle")!;
      expect(subtitle.textContent).toMatch(/^Sent you a friend request · /);
      expect(subtitle.querySelector("time")?.dateTime).toBe(
        new Date(
          notifications.items.value[0]!.notification.createdAtMs
        ).toISOString()
      );
    });

    it("accepting it makes them a friend, and the row goes away", async () => {
      const request = harness.server.requestFrom(ADA_ID);
      await openFeed();
      await vi.waitFor(() => expect(rowFor("Ada")).toBeDefined());

      await click(button(rowFor("Ada")!, "Accept"));

      expect(request.status).toBe("accepted");
      expect(harness.toast).toHaveBeenCalledWith(
        "You're now friends with Ada."
      );
      expect(rows()).toEqual([]);
      expect(text()).toContain("You're all caught up.");
    });

    it("declining it turns it down, and the row goes away", async () => {
      const request = harness.server.requestFrom(ADA_ID);
      await openFeed();
      await vi.waitFor(() => expect(rowFor("Ada")).toBeDefined());

      await click(button(rowFor("Ada")!, "Decline"));

      expect(request.status).toBe("rejected");
      expect(harness.toast).toHaveBeenCalledWith(
        "Declined Ada's friend request."
      );
      expect(rows()).toEqual([]);
    });

    it("says so when the request expired before it was accepted", async () => {
      const request = harness.server.requestFrom(ADA_ID);
      await openFeed();
      await vi.waitFor(() => expect(rowFor("Ada")).toBeDefined());
      request.expireTimeMs = Date.now() - 1;

      await click(button(rowFor("Ada")!, "Accept"));

      expect(harness.toast).toHaveBeenCalledWith("That request has expired.");
      expect(request.status).toBe("requested");
    });

    it("opens the sender's profile from their name", async () => {
      harness.server.requestFrom(ADA_ID);
      await openFeed();
      await vi.waitFor(() => expect(rowFor("Ada")).toBeDefined());

      await click(
        rowFor("Ada")!.querySelector<HTMLButtonElement>(
          '[aria-label="View Ada\'s profile"]'
        ) ?? undefined
      );

      expect(modals.modals.value.map((modal) => modal.id)).toEqual([
        "notifications",
        "person-profile",
      ]);
      // Looking isn't answering.
      expect(harness.server.rows[0]!.status).toBe("requested");
    });

    it("dismissing it only hides the notification: the request still waits", async () => {
      harness.server.requestFrom(ADA_ID);
      await openFeed();
      await vi.waitFor(() => expect(rowFor("Ada")).toBeDefined());

      const dismiss = dismissButton(rowFor("Ada")!);
      expect(dismiss.getAttribute("aria-label")).toBe(
        "Dismiss notification: Ada sent you a friend request"
      );
      await click(dismiss);

      expect(rows()).toEqual([]);
      expect(harness.server.rows[0]!.status).toBe("requested");
      expect(friends.incomingRequests.value.map((r) => r.name)).toEqual([
        "Ada",
      ]);
    });
  });

  describe("an update notice", () => {
    it("links to the release notes in a new tab", async () => {
      updatedFromOlderVersion();
      await openFeed();
      await vi.waitFor(() => expect(rows()).toHaveLength(1));

      const link = rows()[0]!.querySelector("a")!;
      expect(link.textContent).toContain("See what's new");
      expect(link.getAttribute("href")).toBe(
        releaseNotesUrl(HARNESS_APP_VERSION)
      );
      expect(link.target).toBe("_blank");
      expect(link.rel).toBe("noopener noreferrer");
    });

    it("can be dismissed", async () => {
      updatedFromOlderVersion();
      await openFeed();
      await vi.waitFor(() => expect(rows()).toHaveLength(1));

      await click(dismissButton(rows()[0]!));

      expect(rows()).toEqual([]);
      // On the account, so it stays dismissed on every device.
      await vi.waitFor(() =>
        expect(Object.keys(harness.accounts.get(ME)!.dismissed)).toEqual([
          `app-update:${HARNESS_APP_VERSION}`,
        ])
      );
    });
  });

  describe("dismiss all", () => {
    it("isn't offered for a single notification", async () => {
      harness.server.requestFrom(ADA_ID);
      await openFeed();
      await vi.waitFor(() => expect(rows()).toHaveLength(1));

      expect(button(container, "Dismiss all")).toBeUndefined();
    });

    it("clears the whole list", async () => {
      harness.server.requestFrom(ADA_ID);
      updatedFromOlderVersion();
      await openFeed();
      await vi.waitFor(() => expect(rows()).toHaveLength(2));

      await click(button(container, "Dismiss all"));

      expect(rows()).toEqual([]);
      expect(text()).toContain("You're all caught up.");
      expect(button(container, "Dismiss all")).toBeUndefined();
      // The request itself is untouched.
      expect(harness.server.rows[0]!.status).toBe("requested");
    });
  });

  it("says when there's nothing to show", async () => {
    await openFeed();

    expect(rows()).toEqual([]);
    expect(text()).toContain("You're all caught up.");
    // Signed in, so there's nothing to sign in for.
    expect(button(container, "Log in")).toBeUndefined();
  });

  it("tells a signed-out visitor that friend requests need an account", async () => {
    harness.userId.value = null;

    await openFeed();

    expect(text()).toContain("You're all caught up.");
    expect(text()).toContain("Sign in to see friend requests here.");
    await click(button(container, "Log in"));
    expect(harness.login.login).toHaveBeenCalled();
  });

  it("lists an update notice for a signed-out visitor, under which it offers to sign in", async () => {
    harness.userId.value = null;
    localStorage.setItem(
      "sb-notifications:signed-out",
      JSON.stringify({
        seen: {},
        dismissed: {},
        appVersion: { version: "1.17.0", previousVersion: null, sinceMs: 1 },
      })
    );

    await openFeed();

    expect(rows()).toHaveLength(1);
    expect(text()).not.toContain("You're all caught up.");
    expect(button(container, "Log in")).toBeDefined();
  });

  describe("Escape", () => {
    const pressEscape = () =>
      act(() => {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
      });

    it("closes the list", async () => {
      await openFeed();

      pressEscape();

      expect(notifications.isFeedOpen.value).toBe(false);
    });

    it("leaves the list open while a profile opened from it is on top", async () => {
      harness.server.requestFrom(ADA_ID);
      await openFeed();
      await vi.waitFor(() => expect(rowFor("Ada")).toBeDefined());
      await click(
        rowFor("Ada")!.querySelector<HTMLButtonElement>(
          ".sb-friends-person-button"
        ) ?? undefined
      );

      pressEscape();

      expect(notifications.isFeedOpen.value).toBe(true);
    });

    it("stops listening once the list is gone", async () => {
      await openFeed();
      act(() => render(null, container));
      act(() => notifications.openFeed());

      pressEscape();

      expect(notifications.isFeedOpen.value).toBe(true);
    });
  });
});
