import { render } from "preact";
import { act } from "preact/test-utils";
import { useSectionToggle } from "scriptureMap.hooks.useSectionToggle";
import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";
import type { SectionInfo } from "bibleVizUtils.domain.models.arrangement";

jest.mock("scriptureMap.contexts.ScriptureMap.ScriptureMapContext", () => ({
  useScriptureMapContext: jest.fn(),
}));

describe("useSectionToggle", () => {
  let container: HTMLDivElement;
  const translate = jest.fn((key: string) => key);

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    translate.mockImplementation((key: string) => key);
    (useScriptureMapContext as jest.Mock).mockReturnValue({ translate });
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function setup(section: Partial<SectionInfo>, showingContent = false) {
    const result = {
      current: null as unknown as ReturnType<typeof useSectionToggle>,
    };

    function TestComponent() {
      result.current = useSectionToggle({
        section: section as SectionInfo,
        showingContent,
      });
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("returns keyboard_arrow_up when showingContent is true", () => {
    const result = setup({ name: "Law" }, true);
    expect(result.current.toggleArrowContent).toBe("keyboard_arrow_up");
  });

  it("returns keyboard_arrow_down when showingContent is false", () => {
    const result = setup({ name: "Law" }, false);
    expect(result.current.toggleArrowContent).toBe("keyboard_arrow_down");
  });

  it("uses translationKey when present", () => {
    translate.mockImplementation((key: string) => `[${key}]`);
    const result = setup({ name: "Law", translationKey: "law-key" });
    expect(result.current.toggleTitleContent).toBe("[law-key]");
  });

  it("falls back to section.name when translationKey is absent", () => {
    translate.mockImplementation((key: string) => `[${key}]`);
    const result = setup({ name: "Law", translationKey: undefined });
    expect(result.current.toggleTitleContent).toBe("[Law]");
  });

  it("passes the section name through translate", () => {
    const translations: Record<string, string> = { Psalms: "Salmos" };
    translate.mockImplementation((key: string) => translations[key] ?? key);
    const result = setup({ name: "Psalms" });
    expect(result.current.toggleTitleContent).toBe("Salmos");
  });
});
