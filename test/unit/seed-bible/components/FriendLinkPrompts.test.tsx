import type { Mock } from "vitest";
import { render, type VNode } from "preact";
import { act } from "preact/test-utils";
import { signal, type Signal } from "@preact/signals";
import {
  setupFriendLinks,
  type FriendLinkDeps,
} from "@packages/seed-bible/seed-bible/components/FriendsPane/FriendLinkPrompts";
import {
  createFriendsManager,
  type FriendsManager,
} from "@packages/seed-bible/seed-bible/managers/FriendsManager";
import type {
  LoginManager,
  UserProfile,
} from "@packages/seed-bible/seed-bible/managers/LoginManager";
import { CasualOSManager } from "@packages/seed-bible/seed-bible/managers/OsManager";
import { fakeSharedPermissions, ME } from "../testUtils/fakeSharedPermissions";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const ADA_ID = "11111111-1111-4111-8111-111111111111";

describe("friend links", () => {
  let dialog: HTMLDivElement;
  let userId: Signal<string | null>;
  let signInSucceeds: boolean;
  let login: LoginManager;
  /** Overrides the default profiles; null means no account has the ID. */
  let profiles: Record<string, UserProfile | null>;
  let server: ReturnType<typeof fakeSharedPermissions>;
  let friends: FriendsManager;
  let currentUrl: Signal<URL>;
  let updateQueryParams: ReturnType<typeof vi.fn>;
  let toast: Mock<(message: string) => void>;
  let openModalId: string | null;

  const deps = (): FriendLinkDeps => ({
    navigation: {
      currentUrl,
      updateQueryParams,
    } as unknown as FriendLinkDeps["navigation"],
    login,
    friends,
    toast,
    // Renders whichever prompt is open into `dialog`, as the app's modal host
    // would, so tests can read it and click it.
    modals: {
      openModal: (modal) => {
        openModalId = modal.id ?? "modal";
        const content = modal.content as () => VNode;
        act(() => render(content(), dialog));
        return openModalId;
      },
      closeModal: (id) => {
        if (id === openModalId) {
          openModalId = null;
          act(() => render(null, dialog));
        }
      },
    },
  });

  /** Lets an action and the refresh it starts finish (see FriendsPane.test). */
  const settle = async () => {
    for (let i = 0; i < 5; i++) {
      await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    }
    await vi.waitFor(() => expect(friends.isLoading.value).toBe(false));
    await act(async () => {});
  };

  const openWith = async (query: string) => {
    currentUrl.value = new URL(`https://seedbible.test/${query}`);
    await act(() => setupFriendLinks(deps()));
    await settle();
  };

  const text = () => dialog.textContent ?? "";
  const button = (label: string) =>
    Array.from(dialog.querySelectorAll("button")).find(
      (el) => el.textContent === label
    ) as HTMLButtonElement | undefined;
  const click = async (label: string) => {
    const el = button(label);
    expect(el, `a "${label}" button`).toBeDefined();
    await act(async () => el!.click());
    await settle();
  };

  beforeEach(() => {
    dialog = document.createElement("div");
    document.body.appendChild(dialog);
    userId = signal<string | null>(ME);
    signInSucceeds = true;
    profiles = {};
    login = {
      userId,
      login: vi.fn(async () => {
        if (signInSucceeds) {
          userId.value = ME;
        }
        return null;
      }),
      getPublicProfile: vi.fn(async (id: string) =>
        id in profiles
          ? profiles[id]
          : { name: id === ADA_ID ? "Ada" : "", pictureUrl: null }
      ),
    } as unknown as LoginManager;
    const os = CasualOSManager();
    server = fakeSharedPermissions(os, () => userId.peek());
    friends = createFriendsManager(os, login);
    currentUrl = signal(new URL("https://seedbible.test/"));
    updateQueryParams = vi.fn();
    toast = vi.fn<(message: string) => void>();
    openModalId = null;
  });

  afterEach(() => {
    render(null, dialog);
    dialog.remove();
    friends.dispose();
  });

  it("does nothing without a friend link", async () => {
    await openWith("?sessionId=abc");

    expect(openModalId).toBeNull();
    expect(updateQueryParams).not.toHaveBeenCalled();
  });

  it("clears the link from the URL without adding a history entry", async () => {
    await openWith(`?addFriend=${ADA_ID}`);

    expect(updateQueryParams).toHaveBeenCalledWith(
      { addFriend: null, friendRequest: null },
      true
    );
  });

  describe("?addFriend=", () => {
    it("asks before sending, then sends a request", async () => {
      await openWith(`?addFriend=${ADA_ID}`);

      expect(text()).toContain("Send Ada a friend request?");
      expect(server.rows).toEqual([]);

      await click("Send request");

      expect(server.rows).toMatchObject([
        { requestingUserId: ME, targetUserId: ADA_ID, status: "requested" },
      ]);
      expect(toast).toHaveBeenCalledWith("Friend request sent to Ada.");
      expect(openModalId).toBeNull();
    });

    it("keeps showing the question while the request is sent", async () => {
      await openWith(`?addFriend=${ADA_ID}`);
      // Hold the refresh that follows sending: while it's in flight the
      // friends lists report loading, which the prompt mustn't redraw from.
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));
      const listRecords = server.spies.listRecords.getMockImplementation()!;
      server.spies.listRecords.mockImplementationOnce(async () => {
        await gate;
        return listRecords();
      });

      await act(async () => button("Send request")!.click());
      for (let i = 0; i < 3; i++) {
        await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
      }

      expect(friends.isLoading.value).toBe(true);
      expect(text()).toContain("Send Ada a friend request?");
      expect(text()).not.toContain("Loading");

      release();
      await settle();
      expect(openModalId).toBeNull();
    });

    it("shows where they are and what they wrote about themselves", async () => {
      profiles[ADA_ID] = {
        name: "Ada",
        location: "London",
        description: "Reads a psalm every morning.",
      };
      await openWith(`?addFriend=${ADA_ID}`);

      expect(text()).toContain("London");
      expect(text()).toContain("Reads a psalm every morning.");
      expect(text()).not.toContain("hasn't set up");
    });

    it("says so kindly when they haven't set up their profile", async () => {
      profiles[ADA_ID] = { name: "" };
      await openWith(`?addFriend=${ADA_ID}`);

      expect(text()).toContain("This person hasn't set up their profile yet.");
      // They can still be added.
      expect(button("Send request")).toBeDefined();
    });

    it("explains a link that matches no account, without offering to send", async () => {
      profiles[ADA_ID] = null;
      await openWith(`?addFriend=${ADA_ID}`);

      expect(text()).toContain(
        "This friend link doesn't match anyone's account."
      );
      expect(button("Send request")).toBeUndefined();
    });

    it("doesn't ask a signed-out visitor to sign in for a link that matches no account", async () => {
      userId.value = null;
      profiles[ADA_ID] = null;
      await openWith(`?addFriend=${ADA_ID}`);

      expect(text()).toContain(
        "This friend link doesn't match anyone's account."
      );
      expect(button("Log in")).toBeUndefined();
    });

    it("still offers to send when the profile can't be read", async () => {
      vi.mocked(login.getPublicProfile).mockRejectedValue(new Error("offline"));
      await openWith(`?addFriend=${ADA_ID}`);

      expect(button("Send request")).toBeDefined();
      expect(text()).not.toContain("hasn't set up");
    });

    // A visitor signs in from the link, and the lists fail to load just then,
    // so the prompt offers Send. Sending reads the lists first, and finds out.
    const signInWhileListsFailToLoad = async () => {
      userId.value = null;
      server.spies.listRecords
        .mockRejectedValueOnce(new Error("offline"))
        .mockRejectedValueOnce(new Error("offline"));
      await openWith(`?addFriend=${ADA_ID}`);
      await click("Log in");
      expect(text()).toContain("Send Ada a friend request?");
    };

    it("says so when sending finds they're already friends", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      server.friendsWith(ADA_ID);
      await signInWhileListsFailToLoad();

      await click("Send request");

      expect(toast).toHaveBeenCalledWith("You're already friends with Ada.");
      expect(openModalId).toBeNull();
      consoleError.mockRestore();
    });

    it("says so when sending finds a request already waiting on them", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      server.requestTo(ADA_ID);
      await signInWhileListsFailToLoad();

      await click("Send request");

      expect(toast).toHaveBeenCalledWith(
        "You've already sent Ada a friend request."
      );
      expect(server.rows.filter((r) => r.status === "requested")).toHaveLength(
        1
      );
      consoleError.mockRestore();
    });

    it("sends nothing when the user cancels", async () => {
      await openWith(`?addFriend=${ADA_ID}`);

      await click("Cancel");

      expect(server.rows).toEqual([]);
      expect(openModalId).toBeNull();
    });

    it("recognises the user's own link", async () => {
      await openWith(`?addFriend=${ME}`);

      expect(text()).toContain("This is your own friend link.");
      expect(button("Send request")).toBeUndefined();
    });

    it("explains a link mangled in copying, without asking the server", async () => {
      await openWith(`?addFriend=${ADA_ID.slice(0, 20)}`);

      expect(text()).toContain(
        "This friend link doesn't match anyone's account."
      );
      expect(button("Send request")).toBeUndefined();
      expect(login.getPublicProfile).not.toHaveBeenCalled();
    });

    it("recognises the user's own link in capitals", async () => {
      await openWith(`?addFriend=${ME.toUpperCase()}`);

      expect(text()).toContain("This is your own friend link.");
      expect(button("Send request")).toBeUndefined();
    });

    it("sends the request to the account a link in capitals names", async () => {
      const bethId = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";

      await openWith(`?addFriend=${bethId.toUpperCase()}`);
      await click("Send request");

      expect(server.rows).toMatchObject([
        { requestingUserId: ME, targetUserId: bethId, status: "requested" },
      ]);
    });

    it("says so when they're already friends", async () => {
      server.friendsWith(ADA_ID);
      await openWith(`?addFriend=${ADA_ID}`);

      expect(text()).toContain("You're already friends with Ada.");
      expect(button("Send request")).toBeUndefined();
    });

    it("says so when a request is already waiting on them", async () => {
      server.requestTo(ADA_ID);
      await openWith(`?addFriend=${ADA_ID}`);

      expect(text()).toContain("You've already sent Ada a friend request.");
    });

    it("offers to accept when they've already asked", async () => {
      server.requestFrom(ADA_ID);
      await openWith(`?addFriend=${ADA_ID}`);

      expect(text()).toContain("Ada has already sent you a friend request.");
      await click("Accept");

      expect(friends.friendIds.value).toEqual([ADA_ID]);
      expect(toast).toHaveBeenCalledWith("You're now friends with Ada.");
    });

    it("signs a signed-out visitor in first, then carries on", async () => {
      userId.value = null;
      await openWith(`?addFriend=${ADA_ID}`);

      expect(text()).toContain("Sign in to send Ada a friend request.");
      await click("Log in");

      expect(login.login).toHaveBeenCalled();
      expect(text()).toContain("Send Ada a friend request?");
    });

    it("stays closed if the visitor doesn't sign in", async () => {
      userId.value = null;
      signInSucceeds = false;
      await openWith(`?addFriend=${ADA_ID}`);

      await click("Log in");

      expect(openModalId).toBeNull();
    });
  });

  describe("?friendRequest=", () => {
    it("shows who sent it and accepts it", async () => {
      const request = server.requestFrom(ADA_ID);
      await openWith(`?friendRequest=${request.id}`);

      expect(text()).toContain("Ada wants to be friends.");
      await click("Accept");

      expect(friends.friendIds.value).toEqual([ADA_ID]);
      expect(toast).toHaveBeenCalledWith("You're now friends with Ada.");
      expect(openModalId).toBeNull();
    });

    it("shows where the sender is and what they wrote about themselves", async () => {
      profiles[ADA_ID] = {
        name: "Ada",
        location: "London",
        description: "Reads a psalm every morning.",
      };
      const request = server.requestFrom(ADA_ID);
      await openWith(`?friendRequest=${request.id}`);
      // The sender's profile loads after the request list does.
      await vi.waitFor(() => expect(text()).toContain("London"));

      expect(text()).toContain("Reads a psalm every morning.");
    });

    it("declines it", async () => {
      const request = server.requestFrom(ADA_ID);
      await openWith(`?friendRequest=${request.id}`);

      await click("Decline");

      expect(request.status).toBe("rejected");
      expect(friends.friendIds.value).toEqual([]);
      expect(toast).toHaveBeenCalledWith("Declined Ada's friend request.");
    });

    it("explains when the request isn't there to answer", async () => {
      // Answered already, so it's no longer pending.
      const request = server.requestFrom(ADA_ID, { status: "rejected" });
      await openWith(`?friendRequest=${request.id}`);

      expect(text()).toContain("This friend request isn't available.");
      expect(button("Accept")).toBeUndefined();
    });

    it("signs a signed-out visitor in, then shows the request", async () => {
      userId.value = null;
      const request = server.requestFrom(ADA_ID);
      await openWith(`?friendRequest=${request.id}`);

      expect(text()).toContain("Sign in to see this friend request.");
      await click("Log in");

      expect(text()).toContain("Ada wants to be friends.");
    });
  });
});
