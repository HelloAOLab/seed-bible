import { render } from "preact";
import { act } from "preact/test-utils";
import { NotificationsButton } from "@packages/seed-bible/seed-bible/components/TodayPane/NotificationsButton";
import type { NotificationsManager } from "@packages/seed-bible/seed-bible/managers/NotificationsManager";
import {
  notificationsHarness,
  type NotificationsHarness,
} from "../../testUtils/notificationsHarness";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

describe("NotificationsButton", () => {
  let container: HTMLDivElement;
  let harness: NotificationsHarness;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement("div");
    document.body.appendChild(container);
    harness = notificationsHarness();
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    harness.dispose();
    vi.restoreAllMocks();
  });

  const renderBell = (notifications: NotificationsManager) => {
    act(() =>
      render(<NotificationsButton notifications={notifications} />, container)
    );
  };
  const bell = () =>
    container.querySelector<HTMLButtonElement>(
      ".sb-today-notifications-button"
    )!;
  const badge = () => container.querySelector(".sb-today-notifications-badge");
  /** Friend requests from `count` different people. */
  const requestsFrom = (count: number) => {
    for (let i = 0; i < count; i++) {
      harness.server.requestFrom(`person-${i}`);
    }
  };

  it("shows no badge while nothing is unread", async () => {
    const { notifications } = harness.start();
    renderBell(notifications);

    await vi.waitFor(() => expect(notifications.isReady.value).toBe(true));

    expect(badge()).toBeNull();
    expect(bell().getAttribute("aria-label")).toBe("Notifications");
    expect(bell().title).toBe("Notifications");
  });

  it("counts unread friend requests on the badge and in its label", async () => {
    requestsFrom(2);
    const { notifications } = harness.start();
    renderBell(notifications);

    await vi.waitFor(() => expect(badge()?.textContent).toBe("2"));

    expect(bell().getAttribute("aria-label")).toBe("Notifications, 2 unread");
    // The label already says how many, so the number isn't read out twice.
    expect(badge()!.getAttribute("aria-hidden")).toBe("true");
  });

  it("shows 99 as it is", async () => {
    requestsFrom(99);
    const { notifications } = harness.start();
    renderBell(notifications);

    await vi.waitFor(() => expect(badge()?.textContent).toBe("99"));
  });

  it("caps the badge at 99+, but says the real count", async () => {
    requestsFrom(100);
    const { notifications } = harness.start();
    renderBell(notifications);

    await vi.waitFor(() => expect(badge()?.textContent).toBe("99+"));

    expect(bell().getAttribute("aria-label")).toBe("Notifications, 100 unread");
  });

  // Update notices don't need an account, so the bell is useful signed out.
  it("counts an update notice for a signed-out visitor", async () => {
    harness.userId.value = null;
    localStorage.setItem(
      "sb-notifications:signed-out",
      JSON.stringify({
        seen: {},
        dismissed: {},
        appVersion: { version: "1.17.0", previousVersion: null, sinceMs: 1 },
      })
    );
    const { notifications } = harness.start();
    renderBell(notifications);

    await vi.waitFor(() => expect(badge()?.textContent).toBe("1"));

    expect(bell().getAttribute("aria-label")).toBe("Notifications, 1 unread");
  });

  it("opens the list, and has nothing unread once it's been looked at", async () => {
    requestsFrom(1);
    const { notifications } = harness.start();
    renderBell(notifications);
    await vi.waitFor(() => expect(badge()).not.toBeNull());

    act(() => bell().click());

    expect(notifications.isFeedOpen.value).toBe(true);

    act(() => notifications.closeFeed());

    expect(badge()).toBeNull();
    expect(bell().getAttribute("aria-label")).toBe("Notifications");
  });
});
