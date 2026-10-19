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

    it("isDirty is false while the fields match initialItem, and true once one differs", () => {
      const handleRef = createRef<LinkItemInputHandle>();
      act(() => {
        render(
          <LinkItemInput
            ref={handleRef}
            onAdd={vi.fn()}
            initialItem={{ url: "https://example.com", title: "Notes" }}
          />,
          container
        );
      });

      expect(handleRef.current?.isDirty()).toBe(false);

      const checkbox = container.querySelector<HTMLInputElement>(
        'input[type="checkbox"]'
      )!;
      act(() => {
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(handleRef.current?.isDirty()).toBe(true);

      act(() => {
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
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

  it("keeps a transcript with an embedded video, and only then", () => {
    const onAdd = vi.fn();
    const handleRef = createRef<LinkItemInputHandle>();
    act(() => {
      render(
        <LinkItemInput
          ref={handleRef}
          onAdd={onAdd}
          initialItem={{ url: "https://youtu.be/abc", embed: true }}
        />,
        container
      );
    });
    const transcript = container.querySelector<HTMLTextAreaElement>(
      ".sb-playlist-transcript-input"
    )!;
    expect(transcript).not.toBeNull();
    expect(handleRef.current?.isDirty()).toBe(false);

    act(() => {
      transcript.value = "The angel speaks.";
      transcript.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(handleRef.current?.isDirty()).toBe(true);
    act(() => {
      handleRef.current?.commit();
    });
    expect(onAdd).toHaveBeenCalledWith({
      type: "link",
      url: "https://youtu.be/abc",
      title: undefined,
      embed: true,
      transcript: "The angel speaks.",
    });

    render(null, container);
    act(() => {
      render(
        <LinkItemInput onAdd={vi.fn()} initialItem={{ url: "https://x.y" }} />,
        container
      );
    });
    expect(container.querySelector(".sb-playlist-transcript-input")).toBeNull();
  });
});
