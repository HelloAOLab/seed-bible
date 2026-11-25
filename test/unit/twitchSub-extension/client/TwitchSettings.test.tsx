import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import TwitchSettings from "@packages/twitchSub-extension/ext_twitchSub/client/TwitchSettings";
import type { TwitchSubInterface } from "@packages/twitchSub-extension/ext_twitchSub/client/interface";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";

describe("Twitch viewer settings", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderSettings(paused: boolean) {
    const settings = {
      translationEnabled: signal(false),
      highlightEnabled: signal(true),
      refFollowEnabled: signal(true),
      chapterFollowEnabled: signal(true),
    };
    const state = {
      settings: signal(settings),
      wsPaused: signal(paused),
    } as unknown as TwitchSubInterface;
    const context = {
      app: { isMobile: signal(false) },
    } as unknown as SeedBibleState;
    act(() => {
      render(
        <TwitchSettings twitchSubState={state} context={context} />,
        container
      );
    });
    return settings;
  }

  function switchNamed(name: string) {
    const toggle = [
      ...container.querySelectorAll<HTMLInputElement>('[role="switch"]'),
    ].find((input) => input.labels?.[0]?.textContent === name);
    if (!toggle) {
      throw new Error(`No switch labelled "${name}"`);
    }
    return toggle;
  }

  it("names each switch by its setting, and flipping one changes only that setting", () => {
    const settings = renderSettings(false);
    const translation = switchNamed("Follow translation event");
    expect(translation.checked).toBe(false);
    expect(switchNamed("Follow highlight event").checked).toBe(true);

    act(() => translation.click());

    expect(settings.translationEnabled.value).toBe(true);
    expect(settings.highlightEnabled.value).toBe(true);
    expect(switchNamed("Follow translation event").checked).toBe(true);
  });

  it("can't be changed after leaving the session", () => {
    const settings = renderSettings(true);
    const chapter = switchNamed("Follow chapter event");
    expect(chapter.disabled).toBe(true);

    act(() => chapter.click());

    expect(settings.chapterFollowEnabled.value).toBe(true);
  });
});
