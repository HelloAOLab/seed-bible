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
});

describe("TipTapEditor step links and passage embeds", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  const books = [
    {
      id: "GEN",
      name: "Genesis",
      commonName: "Genesis",
      title: null,
      order: 1,
      numberOfChapters: 50,
      firstChapterNumber: 1,
      totalNumberOfVerses: 1533,
    },
  ] as unknown as import("@packages/seed-bible/seed-bible/managers/FreeUseBibleAPI").TranslationBook[];
  const steps = [
    { number: 1, label: "Genesis 16:7-13" },
    { number: 2, label: "Hagar and the Angel" },
  ];

  async function mount(
    initialContent: string,
    options: { withBooks?: boolean; withSteps?: boolean } = {}
  ): Promise<Editor> {
    let instance: Editor | null = null;
    await act(async () => {
      render(
        <TipTapEditor
          initialContent={initialContent}
          books={options.withBooks ? books : undefined}
          steps={options.withSteps ? steps : undefined}
          onEditor={(editor) => {
            instance = editor;
          }}
          onEmptyChange={() => {}}
        />,
        container
      );
    });
    if (!instance) {
      throw new Error("TipTap editor did not mount");
    }
    return instance;
  }

  it("links the selection to a step as a fragment href, and reads it back", async () => {
    const editor = await mount("<p>See the angel</p>");
    editor.commands.setTextSelection({ from: 5, to: 14 });

    editor.commands.setStepLink(2);

    expect(editor.getHTML()).toBe(
      '<p>See <a href="#step-2" class="sb-step-link">the angel</a></p>'
    );
    editor.commands.setTextSelection({ from: 6, to: 6 });
    expect(editor.isActive("stepLink")).toBe(true);
    editor.commands.unsetStepLink();
    expect(editor.getHTML()).toBe("<p>See the angel</p>");

    editor.commands.setContent(
      '<p><a class="sb-step-link" href="#step-7">later</a></p>'
    );
    editor.commands.setTextSelection({ from: 2, to: 2 });
    expect(editor.getAttributes("stepLink")).toEqual({ step: 7 });
  });

  it("inserts 'Step N' as the link when nothing is selected", async () => {
    const editor = await mount("<p>Go to</p>");
    editor.commands.setTextSelection(6);

    editor.commands.setStepLink(3, "Step 3 · Hagar");

    expect(editor.getHTML()).toBe(
      '<p>Go to<a href="#step-3" class="sb-step-link">Step 3 · Hagar</a></p>'
    );
  });

  it("embeds a passage as a reference block and reads it back", async () => {
    const editor = await mount("<p>Read:</p>");
    editor.commands.setTextSelection(6);

    editor.commands.insertScriptureEmbed("Genesis 16:7-13");

    expect(editor.getHTML()).toContain(
      '<blockquote class="sb-scripture-embed"><p class="sb-scripture-embed-ref">Genesis 16:7-13</p></blockquote>'
    );

    editor.commands.setContent(
      '<blockquote class="sb-scripture-embed"><p class="sb-scripture-embed-ref">Exodus 3</p></blockquote>'
    );
    expect(editor.getJSON().content?.[0]).toEqual({
      type: "scriptureEmbed",
      attrs: { reference: "Exodus 3" },
    });
  });

  it("offers the step picker and the embed control only when given steps and books", async () => {
    await mount("<p>Hi</p>");
    expect(container.querySelector(".sb-editor-toolbar-select")).toBeNull();
    expect(container.querySelector('[aria-label="Embed passage"]')).toBeNull();

    render(null, container);
    const editor = await mount("<p>Hi</p>", {
      withBooks: true,
      withSteps: true,
    });
    const select = container.querySelector<HTMLSelectElement>(
      ".sb-editor-toolbar-select"
    )!;
    expect(
      Array.from(select.options).map((option) => option.textContent)
    ).toEqual([
      "Link to step",
      "1 · Genesis 16:7-13",
      "2 · Hagar and the Angel",
    ]);

    editor.commands.setTextSelection({ from: 1, to: 3 });
    act(() => {
      select.value = "2";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(editor.getHTML()).toBe(
      '<p><a href="#step-2" class="sb-step-link">Hi</a></p>'
    );

    act(() => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Embed passage"]')!
        .click();
    });
    const input = container.querySelector<HTMLInputElement>(
      ".sb-editor-embed-input"
    )!;
    act(() => {
      input.value = "Gen 16:7-13";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      container
        .querySelector<HTMLFormElement>(".sb-editor-embed-form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
    });
    expect(editor.getHTML()).toContain(
      '<p class="sb-scripture-embed-ref">Genesis 16:7-13</p>'
    );
    expect(container.querySelector(".sb-editor-embed-form")).toBeNull();
  });

  it("says when the passage to embed can't be read", async () => {
    await mount("<p>Hi</p>", { withBooks: true });
    act(() => {
      container
        .querySelector<HTMLButtonElement>('[aria-label="Embed passage"]')!
        .click();
    });
    const input = container.querySelector<HTMLInputElement>(
      ".sb-editor-embed-input"
    )!;
    act(() => {
      input.value = "Hobbits 1";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => {
      container
        .querySelector<HTMLFormElement>(".sb-editor-embed-form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true })
        );
    });
    expect(container.textContent).toContain("Couldn't find that reference");
  });
});
