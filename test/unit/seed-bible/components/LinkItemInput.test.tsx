import { render, createRef } from "preact";
import { act } from "preact/test-utils";
import {
  LinkItemInput,
  type LinkItemInputHandle,
} from "@packages/seed-bible/seed-bible/components/LinkItemInput";
import type { PlaylistItemData } from "@packages/seed-bible/seed-bible/managers/PlaylistManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
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

  describe("names and errors", () => {
    function titleInput(): HTMLInputElement {
      return container.querySelector('input[type="text"]') as HTMLInputElement;
    }

    it("names both boxes, which only had placeholder text", () => {
      act(() => {
        render(<LinkItemInput onAdd={vi.fn()} />, container);
      });

      expect(titleInput().getAttribute("aria-label")).toBe("Title (optional)");
      expect(urlInput().getAttribute("aria-label")).toBe("Link");
    });

    it("announces an invalid link and ties the message to the link box", () => {
      const handleRef = createRef<LinkItemInputHandle>();
      act(() => {
        render(<LinkItemInput ref={handleRef} onAdd={vi.fn()} />, container);
        setValue(urlInput(), "not a url");
      });
      expect(urlInput().getAttribute("aria-invalid")).toBeNull();

      act(() => {
        handleRef.current?.commit();
      });

      const alert = container.querySelector('[role="alert"]')!;
      expect(alert.textContent).toBe("Enter a valid URL");
      expect(urlInput().getAttribute("aria-invalid")).toBe("true");
      expect(urlInput().getAttribute("aria-describedby")).toBe(alert.id);
    });

    it("clears the error as soon as the link is edited", () => {
      const handleRef = createRef<LinkItemInputHandle>();
      act(() => {
        render(<LinkItemInput ref={handleRef} onAdd={vi.fn()} />, container);
        setValue(urlInput(), "not a url");
      });
      act(() => {
        handleRef.current?.commit();
      });

      act(() => {
        setValue(urlInput(), "https://example.com");
      });

      expect(container.querySelector('[role="alert"]')).toBeNull();
      expect(urlInput().getAttribute("aria-invalid")).toBeNull();
      expect(urlInput().getAttribute("aria-describedby")).toBeNull();
    });
  });

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

    it("isDirty is false for an untouched item being edited, true once it changes", () => {
      const handleRef = createRef<LinkItemInputHandle>();
      act(() => {
        render(
          <LinkItemInput
            ref={handleRef}
            onAdd={vi.fn()}
            initialItem={{ url: "https://example.com", title: "Example" }}
          />,
          container
        );
      });

      expect(handleRef.current?.isDirty()).toBe(false);

      act(() => {
        setValue(urlInput(), "https://example.org");
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
