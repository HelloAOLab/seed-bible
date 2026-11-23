import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { openSessionSettingsModal } from "@packages/seed-bible/seed-bible/components/Tabs/Tabs";
import type {
  BibleReadingSession,
  SessionOptions,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { TestHost } from "./TestHost";

describe("Session settings", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  /** A session whose options change when updated, hosted by `hostId`. */
  function makeSession(hostId: string) {
    const options = signal({
      hostUserId: hostId,
      allowedNavigators: null,
      allowedDecorators: null,
      shareTranslation: false,
    } as unknown as SessionOptions);
    const updateOptions = vi.fn((patch: Partial<SessionOptions>) => {
      options.value = { ...options.value, ...patch };
    });
    const session = {
      id: "session-1",
      options,
      connectedUsers: signal([]),
      updateOptions,
    } as unknown as BibleReadingSession;
    return { session, options, updateOptions };
  }

  function renderSettings(state: SeedBibleState, session: BibleReadingSession) {
    act(() => openSessionSettingsModal(state, session));
    const modal = state.modals.modals.value.at(-1)!;
    act(() => {
      render(
        <TestHost state={state}>
          {modal.content({
            t: (key, options) => (options?.defaultValue as string) ?? key,
          })}
        </TestHost>,
        container
      );
    });
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

  const description = (toggle: HTMLInputElement) =>
    document.getElementById(toggle.getAttribute("aria-describedby")!)
      ?.textContent;

  it("lets the host limit navigation to themselves, and says what the switch now means", async () => {
    const state = await createTestSeedBibleState();
    const hostId = state.os.connectionId!;
    const { session, updateOptions } = makeSession(hostId);
    renderSettings(state, session);

    const navigate = switchNamed("Only host can navigate");
    expect(navigate.disabled).toBe(false);
    expect(navigate.checked).toBe(false);
    expect(description(navigate)).toBe(
      "Everyone in the session can change the passage."
    );

    act(() => navigate.click());

    expect(updateOptions).toHaveBeenCalledWith({
      allowedNavigators: [hostId],
    });
    expect(switchNamed("Only host can navigate").checked).toBe(true);
    expect(description(switchNamed("Only host can navigate"))).toBe(
      "Only the host can change the passage for everyone."
    );
  });

  it("shows the host's choices to everyone else without letting them change them", async () => {
    const state = await createTestSeedBibleState();
    const { session, updateOptions } = makeSession("someone-else");
    renderSettings(state, session);

    for (const name of [
      "Only host can navigate",
      "Only host can highlight",
      "Share translation",
    ]) {
      const toggle = switchNamed(name);
      expect(toggle.disabled).toBe(true);
      act(() => toggle.click());
    }
    expect(updateOptions).not.toHaveBeenCalled();
  });
});
