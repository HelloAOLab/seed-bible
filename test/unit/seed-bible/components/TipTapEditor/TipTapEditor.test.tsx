import { render } from "preact";
import { act } from "preact/test-utils";
import type { Editor } from "@tiptap/core";
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

describe("TipTapEditor keyboard shortcuts", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  async function mountEditor(onModEnter?: () => void): Promise<Editor> {
    let editorInstance: Editor | null = null;
    await act(async () => {
      render(
        <TipTapEditor
          initialContent="<p>Hello</p>"
          onEditor={(editor) => {
            editorInstance = editor;
          }}
          onEmptyChange={() => {}}
          onModEnter={onModEnter}
        />,
        container
      );
    });
    if (!editorInstance) {
      throw new Error("TipTap editor did not mount");
    }
    return editorInstance;
  }

  it("inserts a new paragraph on Enter instead of saving", async () => {
    const onModEnter = vi.fn();
    const editor = await mountEditor(onModEnter);

    editor.commands.focus("end");
    const handled = dispatchEditorKey(editor, "Enter");

    expect(handled).toBe(true);
    expect(onModEnter).not.toHaveBeenCalled();
    expect(editor.getHTML()).toBe("<p>Hello</p><p></p>");
  });

  it("saves on Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) without inserting a line", async () => {
    const onModEnter = vi.fn();
    const editor = await mountEditor(onModEnter);

    editor.commands.focus("end");
    const htmlBefore = editor.getHTML();
    const handled = dispatchEditorKey(editor, "Enter", platformSaveModifiers());

    expect(handled).toBe(true);
    expect(onModEnter).toHaveBeenCalledTimes(1);
    expect(editor.getHTML()).toBe(htmlBefore);
  });

  it("does not save on the other platform's modifier+Enter", async () => {
    const onModEnter = vi.fn();
    const editor = await mountEditor(onModEnter);

    editor.commands.focus("end");
    dispatchEditorKey(editor, "Enter", otherPlatformSaveModifiers());

    expect(onModEnter).not.toHaveBeenCalled();
  });
});
