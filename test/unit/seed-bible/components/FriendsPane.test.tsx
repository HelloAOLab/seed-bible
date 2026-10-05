import { render, type VNode } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { FriendsPane } from "@packages/seed-bible/seed-bible/components/FriendsPane/FriendsPane";
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
import { fakeSharedPermissions, ME } from "../testUtils/fakeSharedPermissions";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const ADA_ID = "11111111-1111-4111-8111-111111111111";
const BOB_ID = "22222222-2222-4222-8222-222222222222";

describe("FriendsPane", () => {
  let container: HTMLDivElement;
  let userId: Signal<string | null>;
  let names: Record<string, string>;
  /** Overrides `names` for one person; null means no account has the ID. */
  let profiles: Record<string, UserProfile | null>;
  let login: LoginManager;
  let server: ReturnType<typeof fakeSharedPermissions>;
  let friends: FriendsManager;
  let toast: ReturnType<typeof vi.fn>;
  let modalContent: (() => VNode) | null;
  let writeText: ReturnType<typeof vi.fn>;

  const createState = (): SeedBibleState => {
    const os = CasualOSManager();
    server = fakeSharedPermissions(os, () => userId.peek());
    friends = createFriendsManager(os, login);
    return {
      friends,
      login,
      app: { toast },
      modals: {
        openModal: vi.fn((modal: { content: () => VNode }) => {
          modalContent = modal.content;
        }),
        closeModal: vi.fn(() => {
          modalContent = null;
        }),
      },
      navigation: {
        linkToBareRoot: (query: Record<string, string>) =>
          `https://seedbible.test/?${new URLSearchParams(query)}`,
      },
    } as unknown as SeedBibleState;
  };

  const renderPane = async (state: SeedBibleState) => {
    act(() => {
      render(<FriendsPane state={state} />, container);
    });
    await waitForIdle();
  };

  /**
   * Waits for whatever the last action started to finish and the screen to
   * catch up. The fake server answers on microtasks, so draining a few
   * zero-delay ticks runs a send/accept and the refresh it triggers to the end;
   * waiting on `isLoading` alone would pass before that refresh had started.
   */
  const waitForIdle = async () => {
    for (let i = 0; i < 5; i++) {
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    }
    await vi.waitFor(() => expect(friends.isLoading.value).toBe(false));
    await act(async () => {});
  };

  const text = () => container.textContent ?? "";
  const outcomeIsError = () =>
    container
      .querySelector(".sb-friends-add-outcome")!
      .classList.contains("sb-friends-add-outcome--error");
  const personNames = (root: ParentNode | null) =>
    Array.from(root?.querySelectorAll(".sb-friends-person-name") ?? []).map(
      (el) => el.textContent
    );
  const section = (heading: string) =>
    Array.from(container.querySelectorAll(".sb-friends-section")).find(
      (el) =>
        el.querySelector(".sb-friends-heading-text")?.textContent === heading
    ) ?? null;
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
  const button = (root: ParentNode, label: string) =>
    Array.from(root.querySelectorAll("button")).find(
      (el) => visibleLabel(el) === label
    ) as HTMLButtonElement | undefined;
  const click = async (el: HTMLElement | undefined) => {
    expect(el).toBeDefined();
    await act(async () => el!.click());
    await waitForIdle();
  };
  const typeAndSend = async (value: string) => {
    const input = container.querySelector(
      ".sb-friends-add-input"
    ) as HTMLInputElement;
    act(() => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const form = container.querySelector(".sb-friends-add-form")!;
    await act(async () => {
      form.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true })
      );
    });
    await waitForIdle();
  };

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    userId = signal<string | null>(ME);
    names = { [ADA_ID]: "Ada", [BOB_ID]: "Bob" };
    profiles = {};
    login = {
      userId,
      login: vi.fn().mockResolvedValue(null),
      getPublicProfile: vi.fn(async (id: string) =>
        id in profiles
          ? profiles[id]
          : { name: names[id] ?? "", pictureUrl: null }
      ),
    } as unknown as LoginManager;
    toast = vi.fn();
    modalContent = null;
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

  it("asks a signed-out visitor to sign in", async () => {
    userId.value = null;
    await renderPane(createState());

    expect(text()).toContain(
      "Sign in to add friends and see what they're reading."
    );
    await click(button(container, "Log in"));
    expect(login.login).toHaveBeenCalled();
  });

  it("shows an empty friends list with a way to add someone", async () => {
    await renderPane(createState());

    expect(text()).toContain("No friends yet.");
    expect(section("Friend requests")).toBeNull();
    expect(section("Sent requests")).toBeNull();
    expect(
      container.querySelector(".sb-friends-my-id-value")?.textContent
    ).toBe(ME);
  });

  it("marks each section heading with an icon", async () => {
    const state = createState();
    server.requestFrom(ADA_ID);
    server.requestTo(BOB_ID);
    await renderPane(state);

    const iconOf = (root: Element | null) =>
      root?.querySelector(".sb-friends-heading .material-symbols-outlined");
    const friendsIcon = iconOf(section("Friends"));
    const addIcon = iconOf(container.querySelector(".sb-friends-card"));

    expect(friendsIcon?.textContent).toBe("group");
    expect(addIcon?.textContent).toBe("person_add");
    expect(iconOf(section("Friend requests"))?.textContent).toBe("how_to_reg");
    expect(iconOf(section("Sent requests"))?.textContent).toBe("schedule_send");
    // Decorative: the heading is announced by its text alone.
    expect(friendsIcon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("lists friends and requests in their own sections", async () => {
    const state = createState();
    server.friendsWith(ADA_ID);
    server.requestFrom(BOB_ID);
    await renderPane(state);

    expect(personNames(section("Friends"))).toEqual(["Ada"]);
    expect(personNames(section("Friend requests"))).toEqual(["Bob"]);
  });

  it("re-reads names when the screen opens", async () => {
    const state = createState();
    server.friendsWith(ADA_ID);
    await friends.refresh();
    await vi.waitFor(() => expect(friends.friends.value[0]?.name).toBe("Ada"));
    names[ADA_ID] = "Ada Lovelace";

    await renderPane(state);

    await vi.waitFor(() =>
      expect(personNames(section("Friends"))).toEqual(["Ada Lovelace"])
    );
  });

  it("accepting a request makes them a friend", async () => {
    const state = createState();
    server.requestFrom(ADA_ID);
    await renderPane(state);

    await click(button(section("Friend requests")!, "Accept"));

    expect(section("Friend requests")).toBeNull();
    expect(section("Friends")!.textContent).toContain("Ada");
    expect(toast).toHaveBeenCalledWith("You're now friends with Ada.");
  });

  it("tells the user when a request expired before they accepted it", async () => {
    const state = createState();
    const request = server.requestFrom(ADA_ID);
    await renderPane(state);
    request.expireTimeMs = Date.now() - 1;

    await click(button(section("Friend requests")!, "Accept"));

    expect(toast).toHaveBeenCalledWith("That request has expired.");
    expect(section("Friends")!.textContent).not.toContain("Ada");
  });

  it("declining a request removes it", async () => {
    const state = createState();
    server.requestFrom(ADA_ID);
    await renderPane(state);

    await click(button(section("Friend requests")!, "Decline"));

    expect(section("Friend requests")).toBeNull();
    expect(text()).toContain("No friends yet.");
    expect(toast).toHaveBeenCalledWith("Declined Ada's friend request.");
  });

  it("removes a friend after confirming", async () => {
    const state = createState();
    server.friendsWith(ADA_ID);
    await renderPane(state);

    await click(button(section("Friends")!, "Remove"));
    // Nothing changes until the dialog is confirmed.
    expect(section("Friends")!.textContent).toContain("Ada");

    const dialog = document.createElement("div");
    act(() => render(modalContent!(), dialog));
    await click(button(dialog, "Remove"));

    expect(section("Friends")!.textContent).not.toContain("Ada");
    expect(server.rows[0]!.status).toBe("revoked");
  });

  describe("adding a friend", () => {
    it("sends a request by user ID and offers the link to send them", async () => {
      await renderPane(createState());

      await typeAndSend(ADA_ID);

      expect(text()).toContain(
        "Request sent. Send them the link so they can accept it."
      );
      expect(outcomeIsError()).toBe(false);
      expect(toast).toHaveBeenCalledWith(
        expect.stringMatching(/^Friend request sent/)
      );
      const sent = server.rows.find((r) => r.targetUserId === ADA_ID)!;
      expect(section("Sent requests")!.textContent).toContain("Ada");

      const outcome = container.querySelector(".sb-friends-add-outcome")!;
      await click(button(outcome, "Copy link"));
      expect(writeText).toHaveBeenCalledWith(
        `https://seedbible.test/?friendRequest=${sent.id}`
      );
    });

    it("rejects something that isn't a user ID without sending anything", async () => {
      await renderPane(createState());

      await typeAndSend("not-an-id");

      expect(text()).toContain("That doesn't look like a user ID.");
      expect(outcomeIsError()).toBe(true);
      expect(server.rows).toEqual([]);
    });

    it("doesn't take an email address while email requests are switched off", async () => {
      const state = createState();
      server.emails.set("ada@example.com", ADA_ID);
      await renderPane(state);

      expect(
        (container.querySelector(".sb-friends-add-input") as HTMLInputElement)
          .placeholder
      ).toBe("User ID");
      await typeAndSend("ada@example.com");

      expect(text()).toContain("That doesn't look like a user ID.");
      expect(server.rows).toEqual([]);
    });

    it("says so when they're already a friend", async () => {
      const state = createState();
      server.friendsWith(ADA_ID);
      await renderPane(state);

      await typeAndSend(ADA_ID);

      expect(text()).toContain("You're already friends.");
      // Nothing was sent, so there's no "sent" toast.
      expect(toast).not.toHaveBeenCalled();
      // Informational, not something to fix.
      expect(outcomeIsError()).toBe(false);
    });

    it("copies the user's friend link", async () => {
      await renderPane(createState());

      await click(button(container, "Copy your friend link"));

      expect(writeText).toHaveBeenCalledWith(
        `https://seedbible.test/?addFriend=${ME}`
      );
    });

    it("copies the user's own ID to share", async () => {
      await renderPane(createState());

      const row = container.querySelector(".sb-friends-my-id")!;
      await click(button(row, "Copy your user ID"));

      expect(writeText).toHaveBeenCalledWith(ME);
      // Both labels stay in the button so it keeps its width; only the
      // visible one changes.
      expect(button(row, "Copied")).toBeDefined();
      expect(row.querySelector("button")!.textContent).toContain(
        "Copy your user ID"
      );
    });
  });

  describe("while a request is in flight", () => {
    /** Holds the next call to a fake server procedure until released. */
    const holdNext = (spy: {
      getMockImplementation: () => unknown;
      mockImplementationOnce: (impl: never) => unknown;
    }) => {
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));
      const impl = spy.getMockImplementation() as (
        ...args: unknown[]
      ) => Promise<unknown>;
      spy.mockImplementationOnce((async (...args: unknown[]) => {
        await gate;
        return impl(...args);
      }) as never);
      return () => release();
    };
    const spinnerIn = (el: Element) =>
      el.querySelector(".sb-friends-busy-spinner");

    it("spins only the answer being sent, and keeps its label in place", async () => {
      const state = createState();
      server.requestFrom(ADA_ID);
      await renderPane(state);
      const release = holdNext(server.spies.accept);
      const requests = section("Friend requests")!;
      const accept = button(requests, "Accept")!;
      const decline = button(requests, "Decline")!;

      await act(async () => accept.click());

      expect(accept.getAttribute("aria-busy")).toBe("true");
      expect(spinnerIn(accept)).not.toBeNull();
      // The label stays in the button under the spinner, so its size holds.
      expect(accept.querySelector(".sb-friends-busy-label")?.textContent).toBe(
        "Accept"
      );
      expect(decline.disabled).toBe(true);
      expect(spinnerIn(decline)).toBeNull();

      release();
      await waitForIdle();
      expect(section("Friend requests")).toBeNull();
    });

    it("spins Send request until the request has been sent", async () => {
      await renderPane(createState());
      const release = holdNext(server.spies.request);
      const send = button(
        container.querySelector(".sb-friends-add-form")!,
        "Send request"
      )!;

      const input = container.querySelector(
        ".sb-friends-add-input"
      ) as HTMLInputElement;
      act(() => {
        input.value = ADA_ID;
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () => send.click());

      expect(spinnerIn(send)).not.toBeNull();
      expect(send.disabled).toBe(true);

      release();
      await waitForIdle();
      expect(spinnerIn(send)).toBeNull();
      expect(text()).toContain("Request sent.");
    });
  });

  describe("profile popup", () => {
    const openProfile = async (root: ParentNode, name: string) => {
      const person = root.querySelector<HTMLButtonElement>(
        `[aria-label="View ${name}'s profile"]`
      );
      await click(person ?? undefined);
      const dialog = document.createElement("div");
      act(() => render(modalContent!(), dialog));
      await waitForIdle();
      return dialog;
    };

    it("opens a friend's profile from their name", async () => {
      profiles[ADA_ID] = {
        name: "Ada",
        location: "London",
        description: "Reads a psalm every morning.",
      };
      const state = createState();
      server.friendsWith(ADA_ID);
      await renderPane(state);

      const dialog = await openProfile(section("Friends")!, "Ada");

      expect(dialog.textContent).toContain("Ada");
      expect(dialog.textContent).toContain("London");
      expect(dialog.textContent).toContain("Reads a psalm every morning.");
      expect(dialog.textContent).not.toContain("hasn't set up");
      // Looking isn't acting: the friendship is untouched.
      expect(server.rows[0]!.status).toBe("accepted");
    });

    it("shows the profile someone just updated, not the copy the row loaded", async () => {
      const state = createState();
      server.friendsWith(ADA_ID);
      await renderPane(state);
      profiles[ADA_ID] = { name: "Ada", location: "Paris" };

      const dialog = await openProfile(section("Friends")!, "Ada");

      expect(dialog.textContent).toContain("Paris");
    });

    it("says so kindly when someone hasn't set up their profile", async () => {
      profiles[BOB_ID] = { name: "" };
      const state = createState();
      server.requestFrom(BOB_ID);
      await renderPane(state);

      const dialog = await openProfile(
        section("Friend requests")!,
        "User 22222222"
      );

      expect(dialog.textContent).toContain(
        "This person hasn't set up their profile yet."
      );
    });

    it("says when a sent request's user ID belongs to no one", async () => {
      profiles[BOB_ID] = null;
      const state = createState();
      server.requestTo(BOB_ID);
      await renderPane(state);

      const dialog = await openProfile(
        section("Sent requests")!,
        "User 22222222"
      );

      expect(dialog.textContent).toContain(
        "We couldn't find anyone with this user ID."
      );
      expect(dialog.textContent).not.toContain("hasn't set up");
    });

    it("keeps what the row showed when the profile can't be read", async () => {
      const state = createState();
      server.friendsWith(ADA_ID);
      await renderPane(state);
      vi.mocked(login.getPublicProfile).mockRejectedValue(new Error("offline"));

      const dialog = await openProfile(section("Friends")!, "Ada");

      expect(dialog.textContent).toContain("Ada");
      expect(dialog.textContent).not.toContain("hasn't set up");
      expect(dialog.textContent).not.toContain("couldn't find");
    });
  });

  describe("for screen readers", () => {
    it("reads a sent request's status along with the person", async () => {
      const state = createState();
      server.requestTo(ADA_ID);
      await renderPane(state);

      const person = section("Sent requests")!.querySelector(
        ".sb-friends-person-button"
      )!;
      const description = document.getElementById(
        person.getAttribute("aria-describedby") ?? ""
      );

      expect(person.getAttribute("aria-label")).toBe("View Ada's profile");
      expect(description?.textContent).toBe("Waiting for them to accept");
    });

    it("says whose request Accept and Decline answer", async () => {
      const state = createState();
      server.requestFrom(ADA_ID);
      await renderPane(state);

      const requests = section("Friend requests")!;

      expect(button(requests, "Accept")!.getAttribute("aria-label")).toBe(
        "Accept Ada's friend request"
      );
      expect(button(requests, "Decline")!.getAttribute("aria-label")).toBe(
        "Decline Ada's friend request"
      );
    });

    it("announces that something was copied", async () => {
      await renderPane(createState());
      const row = container.querySelector(".sb-friends-my-id")!;
      const status = () => row.querySelector('[role="status"]')?.textContent;
      expect(status()).toBe("");

      await click(button(row, "Copy your user ID"));

      expect(status()).toBe("Copied");
    });
  });

  it("cancels a sent request", async () => {
    const state = createState();
    server.requestTo(ADA_ID);
    await renderPane(state);

    await click(button(section("Sent requests")!, "Cancel"));

    expect(section("Sent requests")).toBeNull();
    expect(toast).toHaveBeenCalledWith("Canceled your friend request to Ada.");
  });
});
