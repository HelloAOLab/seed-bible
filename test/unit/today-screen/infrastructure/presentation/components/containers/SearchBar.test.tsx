import { render } from "preact";
import { act } from "preact/test-utils";
import { SearchBar } from "todayScreen.infrastructure.presentation.components.containers.SearchBar";
import { useSearchBar } from "todayScreen.infrastructure.presentation.hooks.useSearchBar";

jest.mock("todayScreen.infrastructure.presentation.hooks.useSearchBar", () => ({
  useSearchBar: jest.fn(),
}));

type SearchResult = { id: string; reference: string; text: string };
type Result = ReturnType<typeof useSearchBar>;

const MaterialIcon = ({ children }: { children: string }) => (
  <span className="material-icon">{children}</span>
);

function makeResult(options: {
  query?: string;
  results?: SearchResult[];
  loading?: boolean;
  error?: string | null;
  isOpen?: boolean;
  placeholder?: string;
  containerRef?: { current: HTMLDivElement | null };
  runSearch?: (value: string) => void;
  handleFocus?: () => void;
  handleSelect?: (result: SearchResult) => void;
}): Result {
  return {
    query: { value: options.query ?? "" },
    results: { value: options.results ?? [] },
    loading: { value: options.loading ?? false },
    error: { value: options.error ?? null },
    isOpen: { value: options.isOpen ?? false },
    placeholder: options.placeholder ?? "Search books, chapter, verses....",
    containerRef: options.containerRef ?? { current: null },
    runSearch: options.runSearch ?? jest.fn(),
    handleFocus: options.handleFocus ?? jest.fn(),
    handleSelect: options.handleSelect ?? jest.fn(),
    translate: jest.fn(
      (key: string, opts?: { defaultValue?: string }) =>
        opts?.defaultValue ?? key
    ),
    MaterialIcon,
  } as unknown as Result;
}

describe("SearchBar", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    jest.clearAllMocks();
  });

  function setup(options: Parameters<typeof makeResult>[0] = {}) {
    const result = makeResult(options);
    (useSearchBar as jest.Mock).mockReturnValue(result);
    act(() => render(<SearchBar />, container));
    return result;
  }

  const q = (sel: string) => container.querySelector(sel);
  const qa = (sel: string) => container.querySelectorAll(sel);
  const input = () => container.querySelector<HTMLInputElement>("input")!;
  const dropdown = () => q(".today-searchbar-dropdown");

  describe("input", () => {
    it("renders the search icon, placeholder and current query value", () => {
      setup({ placeholder: "Buscar...", query: "gen" });
      expect(q(".today-searchbar .material-icon")!.textContent).toBe("search");
      expect(input().placeholder).toBe("Buscar...");
      expect(input().value).toBe("gen");
    });

    it("calls runSearch with the typed value on input", () => {
      const runSearch = jest.fn();
      setup({ runSearch });
      input().value = "john";
      act(() => {
        input().dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(runSearch).toHaveBeenCalledWith("john");
    });

    it("calls handleFocus on focus", () => {
      const handleFocus = jest.fn();
      setup({ handleFocus });
      act(() => {
        input().dispatchEvent(new FocusEvent("focus"));
      });
      expect(handleFocus).toHaveBeenCalledTimes(1);
    });

    it("attaches the container ref", () => {
      const containerRef = { current: null as HTMLDivElement | null };
      setup({ containerRef });
      expect(containerRef.current!.className).toContain("today-searchbar");
    });
  });

  describe("dropdown visibility", () => {
    it("is hidden when the search bar is closed", () => {
      setup({ isOpen: false, query: "gen" });
      expect(dropdown()).toBeNull();
    });

    it("is hidden when the query is only whitespace", () => {
      setup({ isOpen: true, query: "   " });
      expect(dropdown()).toBeNull();
    });

    it("is shown when open and the query is non-empty", () => {
      setup({ isOpen: true, query: "gen" });
      expect(dropdown()).not.toBeNull();
    });
  });

  describe("dropdown states", () => {
    const open = { isOpen: true, query: "gen" } as const;

    it("shows a loading status while loading", () => {
      setup({ ...open, loading: true });
      expect(q(".today-searchbar-status")!.textContent).toBe("Searching...");
    });

    it("shows an error status when there is an error", () => {
      setup({ ...open, loading: false, error: "Network down" });
      const status = q(".today-searchbar-status-error");
      expect(status).not.toBeNull();
      expect(status!.textContent).toBe("Network down");
    });

    it("shows the empty status when there are no results", () => {
      setup({ ...open, loading: false, error: null, results: [] });
      expect(q(".today-searchbar-status")!.textContent).toBe(
        "No matching verses."
      );
    });

    it("renders a result row per result with its reference and text", () => {
      setup({
        ...open,
        results: [
          { id: "1", reference: "John 3:16", text: "For God so loved..." },
          { id: "2", reference: "Genesis 1:1", text: "In the beginning..." },
        ],
      });
      const rows = qa(".today-searchbar-result");
      expect(rows).toHaveLength(2);
      expect(
        rows[0]!.querySelector(".today-searchbar-result-ref")!.textContent
      ).toBe("John 3:16");
      expect(
        rows[0]!.querySelector(".today-searchbar-result-text")!.textContent
      ).toBe("For God so loved...");
    });

    it("does not show the empty status when there are results", () => {
      setup({
        ...open,
        results: [{ id: "1", reference: "John 3:16", text: "..." }],
      });
      // The only status-class element would be the empty/loading/error one.
      expect(q(".today-searchbar-status")).toBeNull();
    });

    it("calls handleSelect with the clicked result", () => {
      const handleSelect = jest.fn();
      const result = { id: "1", reference: "John 3:16", text: "..." };
      setup({ ...open, results: [result], handleSelect });
      act(() =>
        container
          .querySelector<HTMLButtonElement>(".today-searchbar-result")!
          .click()
      );
      expect(handleSelect).toHaveBeenCalledWith(result);
    });
  });
});
