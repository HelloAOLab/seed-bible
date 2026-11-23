import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import TwitchSettings from "@packages/twitchPub-extension/ext_twitchPub/host/TwitchSettings";
import type { TwitchPubState } from "@packages/twitchPub-extension/ext_twitchPub/host/interface";

describe("Twitch host settings", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderSettings() {
    const announcementTimer = signal({
      enabled: true,
      interval: 0 as number | null,
    });
    const state = {
      settings: signal({
        translation: signal({ enabled: true }),
        highlight: signal({ enabled: true }),
        aiFollow: signal({ enabled: true }),
        announcementTimer,
      }),
      resetState: () => {},
      seedBibleState: { app: { isMobile: signal(false) } },
    } as unknown as TwitchPubState;
    act(() => {
      render(<TwitchSettings state={state} />, container);
    });
    return announcementTimer;
  }

  function chooseCustom() {
    const select = container.querySelector("select")!;
    act(() => {
      select.value = "custom";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function type(box: HTMLInputElement, text: string) {
    act(() => {
      box.value = text;
      box.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  function minutesBox() {
    return container.querySelector<HTMLInputElement>(
      'input[inputmode="decimal"]'
    )!;
  }

  it("saves the minutes typed and shows them", () => {
    const timer = renderSettings();
    chooseCustom();

    type(minutesBox(), "7");

    expect(timer.value.interval).toBe(7 * 60000);
    expect(minutesBox().value).toBe("7");
  });

  it("puts the last good minutes back when a key that isn't a number is typed", () => {
    const timer = renderSettings();
    chooseCustom();
    type(minutesBox(), "5");

    type(minutesBox(), "5x");

    expect(minutesBox().value).toBe("5");
    expect(timer.value.interval).toBe(5 * 60000);
  });
});
