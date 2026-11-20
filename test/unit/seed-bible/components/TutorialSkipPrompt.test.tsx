import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { TutorialSkipPrompt } from "@packages/seed-bible/seed-bible/components/TutorialSkipPrompt/TutorialSkipPrompt";
import type { TutorialManager } from "@packages/seed-bible/seed-bible/managers/TutorialManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import { pressAndRelease } from "../testUtils/pressAndRelease";
import { TestHost } from "./TestHost";

describe("TutorialSkipPrompt", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function show() {
    const skipPromptVisible = signal(true);
    const keepTutorials = vi.fn(() => {
      skipPromptVisible.value = false;
    });
    const optOut = vi.fn(() => {
      skipPromptVisible.value = false;
    });
    const tutorial = {
      skipPromptVisible,
      keepTutorials,
      optOut,
    } as unknown as TutorialManager;
    const state = await createTestSeedBibleState();
    act(() => {
      render(
        <TestHost state={state}>
          <TutorialSkipPrompt tutorial={tutorial} />
        </TestHost>,
        container
      );
    });
    return { keepTutorials, optOut };
  }

  const dialog = () =>
    document.querySelector<HTMLElement>(
      '[role="dialog"].sb-tutorial-skip-prompt'
    );

  it("is a dialog named by its title, with focus inside", async () => {
    await show();

    expect(dialog()?.getAttribute("aria-modal")).toBe("true");
    const titleId = dialog()?.getAttribute("aria-labelledby");
    expect(document.getElementById(titleId!)?.textContent).toBe(
      "Turn off tutorials?"
    );
    expect(dialog()?.contains(document.activeElement)).toBe(true);
  });

  it("skips just this one on Escape", async () => {
    const { keepTutorials, optOut } = await show();

    act(() => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(keepTutorials).toHaveBeenCalledTimes(1);
    expect(optOut).not.toHaveBeenCalled();
    expect(dialog()).toBeNull();
  });

  it("skips just this one from the backdrop, and not from inside the window", async () => {
    const { keepTutorials } = await show();

    pressAndRelease(dialog()!, dialog()!);
    expect(keepTutorials).not.toHaveBeenCalled();

    const backdrop = document.querySelector<HTMLElement>(
      ".sb-dialog-backdrop"
    )!;
    pressAndRelease(backdrop, backdrop);
    expect(keepTutorials).toHaveBeenCalledTimes(1);
  });

  it("turns tutorials off from its button", async () => {
    const { keepTutorials, optOut } = await show();

    act(() => {
      [...document.querySelectorAll("button")]
        .find((button) => button.textContent === "Turn off tutorials")!
        .click();
    });

    expect(optOut).toHaveBeenCalledTimes(1);
    expect(keepTutorials).not.toHaveBeenCalled();
  });
});
