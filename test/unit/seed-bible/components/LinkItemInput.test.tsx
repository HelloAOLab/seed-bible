import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import {
  LinkItemInput,
  type LinkItemInputHandle,
} from "@packages/seed-bible/seed-bible/components/LinkItemInput";
import type { PlaylistItemData } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

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

function setValue(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("LinkItemInput", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.restoreAllMocks();
  });

  function urlInput(): HTMLInputElement {
    return container.querySelector('input[type="url"]') as HTMLInputElement;
  }

  describe("imperative handle", () => {
    it("isDirty is false when empty and true once a URL or title is typed", () => {
      const handleRef = createRef<LinkItemInputHandle>();
      act(() => {
        render(<LinkItemInput ref={handleRef} onAdd={vi.fn()} />, container);
      });

      expect(handleRef.current?.isDirty()).toBe(false);

      act(() => {
        setValue(urlInput(), "https://example.com");
      });

      expect(handleRef.current?.isDirty()).toBe(true);
    });

    it("commit() adds a valid URL and returns true", () => {
      const onAdd = vi.fn();
      const handleRef = createRef<LinkItemInputHandle>();
      act(() => {
        render(<LinkItemInput ref={handleRef} onAdd={onAdd} />, container);
        setValue(urlInput(), "https://example.com");
      });

      let result: boolean | undefined;
      act(() => {
        result = handleRef.current?.commit();
      });

      expect(result).toBe(true);
      expect(onAdd).toHaveBeenCalledWith({
        type: "link",
        url: "https://example.com/",
        title: undefined,
        embed: undefined,
      } satisfies PlaylistItemData);
      expect(handleRef.current?.isDirty()).toBe(false);
    });

    it("commit() returns false and does not add when the URL is invalid", () => {
      const onAdd = vi.fn();
      const handleRef = createRef<LinkItemInputHandle>();
      act(() => {
        render(<LinkItemInput ref={handleRef} onAdd={onAdd} />, container);
        setValue(urlInput(), "not a url");
      });

      let result: boolean | undefined;
      act(() => {
        result = handleRef.current?.commit();
      });

      expect(result).toBe(false);
      expect(onAdd).not.toHaveBeenCalled();
    });

    it("commit() returns false and does not add when empty", () => {
      const onAdd = vi.fn();
      const handleRef = createRef<LinkItemInputHandle>();
      act(() => {
        render(<LinkItemInput ref={handleRef} onAdd={onAdd} />, container);
      });

      let result: boolean | undefined;
      act(() => {
        result = handleRef.current?.commit();
      });

      expect(result).toBe(false);
      expect(onAdd).not.toHaveBeenCalled();
    });
  });
});
