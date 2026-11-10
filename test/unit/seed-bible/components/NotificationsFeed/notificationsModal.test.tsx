import { render } from "preact";
import { act } from "preact/test-utils";
import { ModalHost } from "@packages/seed-bible/seed-bible/components/ModalHost/ModalHost";
import { NOTIFICATIONS_MODAL_ID } from "@packages/seed-bible/seed-bible/components/NotificationsFeed/NotificationsFeed";
import { NEW_NOTIFICATIONS_TOAST_KEY } from "@packages/seed-bible/seed-bible/managers/NotificationsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  createTestSeedBibleState,
  waitFor,
} from "../../testUtils/createTestSeedBibleState";
import { pressAndRelease } from "../../testUtils/pressAndRelease";
import { TestHost } from "../TestHost";

/**
 * How the notifications list opens and closes in the app: a modal mirrored
 * from `notifications.isFeedOpen`, which is in turn bound to
 * `?notifications=open`.
 */
describe("the notifications modal", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
  });

  const feedModal = (state: SeedBibleState) =>
    state.modals.modals.value.find(
      (modal) => modal.id === NOTIFICATIONS_MODAL_ID
    );
  const urlParam = () =>
    new URL(window.location.href).searchParams.get("notifications");
  const renderModals = (state: SeedBibleState) => {
    act(() => {
      render(
        <TestHost state={state}>
          <ModalHost manager={state.modals} />
        </TestHost>,
        container
      );
    });
  };
  const openList = async (state: SeedBibleState) => {
    act(() => state.notifications.openFeed());
    renderModals(state);
    await waitFor(() => urlParam() === "open");
  };
  const overlay = () =>
    container.querySelector<HTMLElement>(".sb-footnote-modal-overlay");
  const expectClosed = async (state: SeedBibleState) => {
    expect(state.notifications.isFeedOpen.value).toBe(false);
    expect(feedModal(state)).toBeUndefined();
    expect(overlay()).toBeNull();
    await waitFor(() => urlParam() === null);
  };

  it("opens the list as a sheet on phones, outside any CasualOS app", async () => {
    const state = await createTestSeedBibleState({ todayOpen: true });

    await openList(state);

    const modal = feedModal(state)!;
    expect(modal.mobileSheet).toBe(true);
    expect(modal.useCasualOSApp).toBe(false);
    expect(
      container.querySelector(".sb-footnote-modal-title")?.textContent
    ).toBe("Notifications");
    expect(
      container.querySelector(".sb-notifications-feed")?.textContent
    ).toContain("You're all caught up.");
  });

  it("takes away the toast announcing new notifications once the list is open", async () => {
    const state = await createTestSeedBibleState({ todayOpen: true });
    act(() =>
      state.app.toast("You have 2 new notifications", {
        key: NEW_NOTIFICATIONS_TOAST_KEY,
        onClick: () => {},
      })
    );
    act(() => state.app.toast("Something else"));
    expect(state.app.currentToast.value?.key).toBe(NEW_NOTIFICATIONS_TOAST_KEY);

    // From the bell, not by tapping the toast.
    await openList(state);

    expect(state.app.currentToast.value?.message).toBe("Something else");
  });

  it("opens only once, however often it's asked to", async () => {
    const state = await createTestSeedBibleState({ todayOpen: true });
    const openModal = vi.spyOn(state.modals, "openModal");

    await openList(state);
    act(() => state.notifications.openFeed());

    expect(openModal).toHaveBeenCalledTimes(1);
    expect(
      state.modals.modals.value.filter(
        (modal) => modal.id === NOTIFICATIONS_MODAL_ID
      )
    ).toHaveLength(1);
  });

  it("closes the list from the modal's X", async () => {
    const state = await createTestSeedBibleState({ todayOpen: true });
    await openList(state);

    act(() =>
      container
        .querySelector<HTMLButtonElement>(".sb-footnote-modal-close")!
        .click()
    );

    await expectClosed(state);
  });

  it("closes the list from the backdrop", async () => {
    const state = await createTestSeedBibleState({ todayOpen: true });
    await openList(state);

    pressAndRelease(overlay()!, overlay()!);

    await expectClosed(state);
  });

  it("closes the list with Escape", async () => {
    const state = await createTestSeedBibleState({ todayOpen: true });
    await openList(state);

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    await expectClosed(state);
  });

  it("closes the list with Back", async () => {
    const state = await createTestSeedBibleState({ todayOpen: true });
    await openList(state);

    await act(async () => {
      window.history.back();
    });
    await waitFor(() => urlParam() === null, 2000);
    await act(async () => {});

    await expectClosed(state);
    // Back left the list, not Today.
    expect(state.today.isOpen.value).toBe(true);
  });

  it("closes the modal when something else closes the list", async () => {
    const state = await createTestSeedBibleState({ todayOpen: true });
    await openList(state);

    act(() => state.notifications.closeFeed());

    await expectClosed(state);
  });

  // The link a tapped push notification opens.
  it("opens from a link with ?notifications=open", async () => {
    window.history.replaceState(null, "", "/?notifications=open");

    const state = await createTestSeedBibleState({ todayOpen: true });

    expect(state.notifications.isFeedOpen.value).toBe(true);
    expect(feedModal(state)).toBeDefined();
  });
});
