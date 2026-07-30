import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import {
  TextItemInput,
  type TextItemInputHandle,
} from "@packages/seed-bible/seed-bible/components/TextItemInput/TextItemInput";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, options?: { defaultValue?: string }) =>
        options?.defaultValue ?? key,
      language: "en",
    }),
  };
});

vi.mock("@packages/seed-bible/seed-bible/managers/Sanitization", () => ({
  sanitize: vi.fn(async (html: string) => html),
}));

/**
 * A minimal stand-in for the live TipTap `Editor` instance `TextItemInput`
 * reads/clears on submit. `TextItemInput` lazily loads the real
 * `TipTapEditor` component (see its own doc comment), so this replaces that
 * module entirely rather than the underlying `@tiptap/core` library.
 */
let fakeEditor:
  | {
      isEmpty: boolean;
      getHTML: () => string;
      commands: { clearContent: () => void };
    }
  | undefined;
let latestOnEmptyChange: ((isEmpty: boolean) => void) | null = null;

vi.mock(
  "@packages/seed-bible/seed-bible/components/TipTapEditor/TipTapEditor",
  () => ({
    default: (props: {
      onEditor: (editor: NonNullable<typeof fakeEditor>) => void;
      onEmptyChange: (isEmpty: boolean) => void;
    }) => {
      latestOnEmptyChange = props.onEmptyChange;
      // Only build the fake editor once per test: TextItemInput re-renders
      // (e.g. on `onEmptyChange`), which re-invokes this stub component too,
      // and recreating it every render would silently reset its `isEmpty`.
      if (!fakeEditor) {
        fakeEditor = {
          isEmpty: true,
          getHTML: () => "<p>hello</p>",
          commands: {
            clearContent: () => {
              fakeEditor!.isEmpty = true;
              props.onEmptyChange(true);
            },
          },
        };
      }
      props.onEditor(fakeEditor);
      return <div className="stub-tiptap-editor" />;
    },
  })
);

/** Simulates the user typing into the (stubbed) editor. */
function typeIntoEditor() {
  fakeEditor!.isEmpty = false;
  latestOnEmptyChange?.(false);
}

/**
 * Waits for the lazily-loaded TipTap editor to mount. Preact's `lazy()`
 * resolves the dynamic import and schedules a re-render on a real timer
 * tick, not just microtasks, so this needs an actual `setTimeout`.
 */
async function flushLazyLoad() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("TextItemInput", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    fakeEditor = undefined;
    latestOnEmptyChange = null;
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  describe("imperative handle", () => {
    it("isDirty is false when empty and true once the editor has content", async () => {
      const handleRef = createRef<TextItemInputHandle>();
      await act(async () => {
        render(<TextItemInput ref={handleRef} onAdd={vi.fn()} />, container);
        await flushLazyLoad();
      });

      expect(handleRef.current?.isDirty()).toBe(false);

      act(() => {
        typeIntoEditor();
      });

      expect(handleRef.current?.isDirty()).toBe(true);
    });

    it("commit() sanitizes and adds the editor's content, then returns true", async () => {
      const onAdd = vi.fn();
      const handleRef = createRef<TextItemInputHandle>();
      await act(async () => {
        render(<TextItemInput ref={handleRef} onAdd={onAdd} />, container);
        await flushLazyLoad();
      });
      act(() => {
        typeIntoEditor();
      });

      let result: boolean | undefined;
      await act(async () => {
        result = await handleRef.current?.commit();
      });

      expect(result).toBe(true);
      expect(onAdd).toHaveBeenCalledWith({
        type: "html",
        html: "<p>hello</p>",
        title: undefined,
      });
      expect(handleRef.current?.isDirty()).toBe(false);
    });

    it("commit() returns false and does not add when the editor is empty", async () => {
      const onAdd = vi.fn();
      const handleRef = createRef<TextItemInputHandle>();
      await act(async () => {
        render(<TextItemInput ref={handleRef} onAdd={onAdd} />, container);
        await flushLazyLoad();
      });

      let result: boolean | undefined;
      await act(async () => {
        result = await handleRef.current?.commit();
      });

      expect(result).toBe(false);
      expect(onAdd).not.toHaveBeenCalled();
    });
  });
});
