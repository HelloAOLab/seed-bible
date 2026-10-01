import { render, type VNode } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import { FriendsPane } from "@packages/seed-bible/seed-bible/components/FriendsPane/FriendsPane";
import {
  createFriendsManager,
  type FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
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
      (el) => el.querySelector(".sb-friends-heading")?.textContent === heading
    ) ?? null;
  const button = (root: ParentNode, label: string) =>
    Array.from(root.querySelectorAll("button")).find(
      (el) => el.textContent === label
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
    login = {
      userId,
      login: vi.fn().mockResolvedValue(null),
      getUserProfile: vi.fn(async (id: string) => ({
        name: names[id] ?? "",
        pictureUrl: null,
      })),
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
      // Informational, not something to fix.
      expect(outcomeIsError()).toBe(false);
    });

    it("copies the user's own ID to share", async () => {
      await renderPane(createState());

      await click(
        button(container.querySelector(".sb-friends-my-id")!, "Copy")
      );

      expect(writeText).toHaveBeenCalledWith(ME);
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

  it("cancels a sent request", async () => {
    const state = createState();
    server.requestTo(ADA_ID);
    await renderPane(state);

    await click(button(section("Sent requests")!, "Cancel"));

    expect(section("Sent requests")).toBeNull();
  });
});
