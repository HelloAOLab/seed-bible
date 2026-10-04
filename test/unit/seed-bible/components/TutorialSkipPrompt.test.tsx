import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { TutorialSkipPrompt } from "@packages/seed-bible/seed-bible/components/TutorialSkipPrompt/TutorialSkipPrompt";
import type { TutorialManager } from "@packages/seed-bible/seed-bible/managers/TutorialManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function createFakeTutorial(): TutorialManager {
  return {
    skipPromptVisible: signal(true),
    keepTutorials: vi.fn(),
    optOut: vi.fn(),
  } as unknown as TutorialManager;
}

describe("TutorialSkipPrompt", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
  });

  it("lets the translation choose the dialog direction", () => {
    container.setAttribute("dir", "rtl");

    act(() => {
      render(<TutorialSkipPrompt tutorial={createFakeTutorial()} />, container);
    });

    const dialog = container.querySelector(".sb-tutorial-skip-prompt");
    expect(dialog?.getAttribute("dir")).toBe("auto");
    expect(dialog?.textContent).toContain("Turn off tutorials?");
    expect(dialog?.textContent).toContain(
      "Would you like to stop seeing them, or just skip this one?"
    );
  });
});
