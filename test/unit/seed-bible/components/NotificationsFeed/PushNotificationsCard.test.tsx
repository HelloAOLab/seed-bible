import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { PushNotificationsCard } from "@packages/seed-bible/seed-bible/components/NotificationsFeed/PushNotificationsCard";
import type {
  PushNotificationError,
  PushNotificationStatus,
  PushNotificationsManager,
} from "@packages/seed-bible/seed-bible/managers/PushNotificationsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

describe("PushNotificationsCard", () => {
  let container: HTMLDivElement;
  const status = signal<PushNotificationStatus>("off");
  const error = signal<PushNotificationError | null>(null);
  const busy = signal(false);
  let push: PushNotificationsManager;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    status.value = "off";
    error.value = null;
    busy.value = false;
    push = {
      status,
      error,
      isBusy: busy,
      enable: vi.fn(async () => {}),
      disable: vi.fn(async () => {}),
      notifyFriendRequestSent: vi.fn(async () => {}),
      hydrate: vi.fn(),
      dispose: vi.fn(),
    };
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
  });

  const show = () => {
    act(() => {
      render(<PushNotificationsCard push={push} />, container);
    });
  };
  const text = () => container.textContent ?? "";
  // Matched on its label alone: while busy, the button also holds a spinner.
  const button = (label: string) =>
    [...container.querySelectorAll("button")].find(
      (b) => b.querySelector(".sb-friends-busy-label")?.textContent === label
    );
  const alert = () => container.querySelector('[role="alert"]')?.textContent;

  it.each<PushNotificationStatus>([
    "checking",
    "unsupported",
    "unconfigured",
    "signed-out",
  ])("shows nothing while %s", (current) => {
    status.value = current;
    show();

    expect(container.innerHTML).toBe("");
  });

  describe("off", () => {
    it("offers to turn notifications on, and does when tapped", () => {
      show();

      expect(text()).toContain("Get notifications on this device");
      expect(text()).toContain(
        "Hear about friend requests straight away, even when Seed Bible is closed."
      );
      act(() => button("Turn on")!.click());

      expect(push.enable).toHaveBeenCalledTimes(1);
      expect(push.disable).not.toHaveBeenCalled();
    });

    it("shows that it's working, and can't be tapped again meanwhile", () => {
      busy.value = true;
      show();

      const turnOn = button("Turn on")!;
      expect(turnOn.disabled).toBe(true);
      expect(turnOn.getAttribute("aria-busy")).toBe("true");
    });

    it("explains a prompt that was closed without an answer", () => {
      error.value = "dismissed";
      show();

      expect(alert()).toBe(
        "Notifications weren't turned on. Tap Turn on to try again."
      );
      expect(button("Turn on")).toBeDefined();
    });

    it("says when turning on failed", () => {
      error.value = "failed";
      show();

      expect(alert()).toBe("Couldn't turn on notifications. Try again.");
    });
  });

  describe("on", () => {
    beforeEach(() => {
      status.value = "on";
    });

    it("says notifications are on, and turns them off when tapped", () => {
      show();

      expect(text()).toContain("Notifications are on for this device");
      expect(button("Turn on")).toBeUndefined();
      act(() => button("Turn off")!.click());

      expect(push.disable).toHaveBeenCalledTimes(1);
      expect(push.enable).not.toHaveBeenCalled();
    });

    it("says when turning off failed", () => {
      error.value = "failed";
      show();

      expect(alert()).toBe("Couldn't turn off notifications. Try again.");
    });
  });

  it("explains adding Seed Bible to the Home Screen on an iPhone or iPad", () => {
    status.value = "needs-install";
    show();

    expect(text()).toContain(
      "On iPhone and iPad, notifications work once Seed Bible is on your Home Screen."
    );
    expect(text()).toContain("then choose “Add to Home Screen”.");
    expect(text()).toContain(
      "Then open Seed Bible from your Home Screen and turn notifications on here."
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("explains how to unblock notifications when they're blocked", () => {
    status.value = "denied";
    show();

    expect(text()).toContain("Notifications are blocked");
    expect(text()).toContain(
      "allow notifications for this site in your browser's settings"
    );
    expect(container.querySelector("button")).toBeNull();
  });

  it("answers a tap that found push isn't available, rather than vanishing", () => {
    status.value = "unconfigured";
    error.value = "unavailable";
    show();

    expect(text()).toContain("Notifications aren't available right now.");
    expect(container.querySelector("button")).toBeNull();
  });
});
