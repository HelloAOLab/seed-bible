import { render } from "preact";
import { act } from "preact/test-utils";
import type { Editor, FocusPosition } from "@tiptap/core";
import TipTapEditor from "@packages/seed-bible/seed-bible/components/TipTapEditor/TipTapEditor";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../../testUtils/mockI18n");
  return mockI18nManager();
});

function isMacPlatform(): boolean {
  return /Mac/.test(navigator.platform);
}

function platformSaveModifiers(): KeyboardEventInit {
  return isMacPlatform() ? { metaKey: true } : { ctrlKey: true };
}

function otherPlatformSaveModifiers(): KeyboardEventInit {
  return isMacPlatform() ? { ctrlKey: true } : { metaKey: true };
}

/** Runs ProseMirror/TipTap keydown plugins as if the user pressed the key. */
function dispatchEditorKey(
  editor: Editor,
  key: string,
  modifiers: KeyboardEventInit = {}
): boolean {
  const event = new KeyboardEvent("keydown", {
    key,
    code: key === "Enter" ? "Enter" : undefined,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  let handled = false;
  editor.view.someProp("handleKeyDown", (handleKeyDown) => {
    handled = !!handleKeyDown(editor.view, event);
    return handled;
  });
  return handled;
}

describe("TipTapEditor", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function mountEditor(options?: {
    onModEnter?: () => void;
    autofocus?: FocusPosition;
  }): Promise<Editor> {
    let editorInstance: Editor | null = null;
    await act(async () => {
      render(
        <TipTapEditor
          initialContent="<p>Hello</p>"
          autofocus={options?.autofocus}
          onEditor={(editor) => {
            editorInstance = editor;
          }}
          onEmptyChange={() => {}}
          onModEnter={options?.onModEnter}
        />,
        container
      );
    });
    if (!editorInstance) {
      throw new Error("TipTap editor did not mount");
    }
    return editorInstance;
  }

  /** TipTap applies DOM focus on the next animation frame. */
  async function flushAutofocus() {
    await act(async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });
    });
  }

  it("inserts a new paragraph on Enter instead of saving", async () => {
    const onModEnter = vi.fn();
    const editor = await mountEditor({ onModEnter });

    editor.commands.focus("end");
    const handled = dispatchEditorKey(editor, "Enter");

    expect(handled).toBe(true);
    expect(onModEnter).not.toHaveBeenCalled();
    expect(editor.getHTML()).toBe("<p>Hello</p><p></p>");
  });

  it("saves on Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) without inserting a line", async () => {
    const onModEnter = vi.fn();
    const editor = await mountEditor({ onModEnter });

    editor.commands.focus("end");
    const htmlBefore = editor.getHTML();
    const handled = dispatchEditorKey(editor, "Enter", platformSaveModifiers());

    expect(handled).toBe(true);
    expect(onModEnter).toHaveBeenCalledTimes(1);
    expect(editor.getHTML()).toBe(htmlBefore);
  });

  it("does not save on the other platform's modifier+Enter", async () => {
    const onModEnter = vi.fn();
    const editor = await mountEditor({ onModEnter });

    editor.commands.focus("end");
    dispatchEditorKey(editor, "Enter", otherPlatformSaveModifiers());

    expect(onModEnter).not.toHaveBeenCalled();
  });

  it("autofocuses the editor when autofocus is set", async () => {
    const editor = await mountEditor({ autofocus: "end" });
    await flushAutofocus();

    expect(editor.isFocused).toBe(true);
    expect(document.activeElement).toBe(editor.view.dom);
  });

  it("leaves the editor unfocused when autofocus is unset", async () => {
    const editor = await mountEditor();
    await flushAutofocus();

    expect(editor.isFocused).toBe(false);
    expect(document.activeElement).not.toBe(editor.view.dom);
  });

  describe("toolbar Tab order (roving tabindex)", () => {
    // jsdom has no layout, so every element's `offsetParent` is null, which
    // the keyboard-nav helper reads as "hidden". Give it a parent to find.
    let offsetParentSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      offsetParentSpy = vi
        .spyOn(HTMLElement.prototype, "offsetParent", "get")
        .mockImplementation(function (this: HTMLElement) {
          return this.parentElement;
        });
    });
    afterEach(() => {
      offsetParentSpy.mockRestore();
    });

    function getToolbar(): HTMLElement {
      const toolbar = container.querySelector<HTMLElement>('[role="toolbar"]');
      if (!toolbar) throw new Error("toolbar not found");
      return toolbar;
    }

    function getToolbarButtons(): HTMLButtonElement[] {
      return Array.from(
        getToolbar().querySelectorAll<HTMLButtonElement>("button")
      );
    }

    function fireKeyDown(target: HTMLElement, key: string): void {
      act(() => {
        target.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
        );
      });
    }

    it("has exactly one toolbar button with tabIndex=0 on mount", async () => {
      await mountEditor();
      const tabbable = getToolbarButtons().filter((b) => b.tabIndex === 0);
      expect(tabbable).toHaveLength(1);
    });

    it("all other toolbar buttons have tabIndex=-1 on mount", async () => {
      await mountEditor();
      const nonTabbable = getToolbarButtons().filter((b) => b.tabIndex === -1);
      // 7 buttons total, 6 should have tabIndex=-1
      expect(nonTabbable).toHaveLength(6);
    });

    it("ArrowRight moves the tabIndex=0 to the next button and prevents default", async () => {
      await mountEditor();
      const buttons = getToolbarButtons();
      // Start: Bold (index 0) has tabIndex=0.
      buttons[0]!.focus();

      const event = new KeyboardEvent("keydown", {
        key: "ArrowRight",
        bubbles: true,
        cancelable: true,
      });
      let prevented = false;
      event.preventDefault = () => {
        prevented = true;
      };
      act(() => {
        getToolbar().dispatchEvent(event);
      });

      // Italic (index 1) should now own tabIndex=0.
      const updatedButtons = getToolbarButtons();
      expect(updatedButtons[0]!.tabIndex).toBe(-1);
      expect(updatedButtons[1]!.tabIndex).toBe(0);
      expect(prevented).toBe(true);
    });

    it("ArrowLeft moves the tabIndex=0 to the previous button", async () => {
      await mountEditor();
      const buttons = getToolbarButtons();
      // Focus Italic (index 1) first.
      act(() => {
        buttons[1]!.focus();
      });

      fireKeyDown(getToolbar(), "ArrowLeft");

      const updatedButtons = getToolbarButtons();
      expect(updatedButtons[0]!.tabIndex).toBe(0);
      expect(updatedButtons[1]!.tabIndex).toBe(-1);
    });

    it("Home moves tabIndex=0 to the first button and focuses it", async () => {
      await mountEditor();
      const buttons = getToolbarButtons();
      act(() => {
        buttons[4]!.focus();
      });

      fireKeyDown(getToolbar(), "Home");

      const updatedButtons = getToolbarButtons();
      expect(document.activeElement).toBe(updatedButtons[0]);
      expect(updatedButtons.filter((b) => b.tabIndex === 0)).toEqual([
        updatedButtons[0],
      ]);
    });

    it("End moves tabIndex=0 to the last button and focuses it", async () => {
      await mountEditor();
      const buttons = getToolbarButtons();
      act(() => {
        buttons[0]!.focus();
      });

      fireKeyDown(getToolbar(), "End");

      const updatedButtons = getToolbarButtons();
      const last = updatedButtons[updatedButtons.length - 1]!;
      expect(document.activeElement).toBe(last);
      expect(updatedButtons.filter((b) => b.tabIndex === 0)).toEqual([last]);
    });

    it("ArrowUp and ArrowDown are swallowed so they don't reach the page", async () => {
      await mountEditor();
      const buttons = getToolbarButtons();
      act(() => {
        buttons[0]!.focus();
      });

      for (const key of ["ArrowUp", "ArrowDown"]) {
        const event = new KeyboardEvent("keydown", {
          key,
          bubbles: true,
          cancelable: true,
        });
        let prevented = false;
        event.preventDefault = () => {
          prevented = true;
        };
        act(() => {
          getToolbar().dispatchEvent(event);
        });
        expect(prevented).toBe(true);
      }
    });

    it("focusing a button via keyboard updates which button owns tabIndex=0", async () => {
      await mountEditor();
      const buttons = getToolbarButtons();
      // Simulate keyboard/AT focus landing directly on Italic (index 1).
      act(() => {
        buttons[1]!.focus();
      });

      const updatedButtons = getToolbarButtons();
      expect(updatedButtons[1]!.tabIndex).toBe(0);
      expect(updatedButtons[0]!.tabIndex).toBe(-1);
    });

    it("clicking a button updates which button owns tabIndex=0", async () => {
      await mountEditor();
      const buttons = getToolbarButtons();
      // mousedown keeps focus in the editor (preventDefault), so we fire the
      // click directly — the same path the browser takes after mousedown.
      act(() => {
        buttons[1]!.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true })
        );
      });

      const updatedButtons = getToolbarButtons();
      expect(updatedButtons[1]!.tabIndex).toBe(0);
      expect(updatedButtons[0]!.tabIndex).toBe(-1);
    });

    it("the toolbar has an accessible label", async () => {
      await mountEditor();
      const toolbar = getToolbar();
      expect(toolbar.getAttribute("aria-label")).toBeTruthy();
    });
  });
});
