import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useFilteredReading } from "../../../../../../packages/today-screen/infrastructure/presentation/hooks/useFilteredReading";
import { useSocialSectionContext } from "../../../../../../packages/today-screen/infrastructure/presentation/contexts/socialSection/SocialSectionContext";
import type { FilteredReading } from "../../../../../../packages/today-screen/domain/models/readingHistory";

vi.mock(
  "../../../../../../packages/today-screen/infrastructure/presentation/contexts/socialSection/SocialSectionContext",
  () => ({
    useSocialSectionContext: vi.fn(),
  })
);

type Result = ReturnType<typeof useFilteredReading>;

describe("useFilteredReading", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.clearAllMocks();
  });

  function setup(
    communityReading: FilteredReading,
    userFilters: Map<string, boolean>
  ) {
    (useSocialSectionContext as Mock).mockReturnValue({
      communityReading,
      userFilters,
    });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = useFilteredReading();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  it("returns an empty list when there is no community reading", () => {
    const result = setup({}, new Map());
    expect(result.current.booksData).toEqual([]);
  });

  it("includes a book when at least one of its readers is selected", () => {
    const result = setup(
      { GEN: { 1: ["u1", "u2"], 2: ["u1"] } },
      new Map([
        ["u1", true],
        ["u2", false],
      ])
    );

    expect(result.current.booksData).toHaveLength(1);
    expect(result.current.booksData[0]).toEqual({
      bookId: "GEN",
      chaptersReading: { 1: ["u1", "u2"], 2: ["u1"] },
      usersId: ["u1"],
      key: "GEN",
    });
  });

  it("excludes a book when none of its readers are selected", () => {
    const result = setup({ EXO: { 1: ["u3"] } }, new Map([["u3", false]]));
    expect(result.current.booksData).toEqual([]);
  });

  it("excludes a book when a reader is absent from the filter map", () => {
    const result = setup({ EXO: { 1: ["u9"] } }, new Map());
    expect(result.current.booksData).toEqual([]);
  });

  it("deduplicates readers that appear across multiple chapters", () => {
    const result = setup(
      { PSA: { 1: ["u1"], 2: ["u1"], 3: ["u1"] } },
      new Map([["u1", true]])
    );
    expect(result.current.booksData[0]!.usersId).toEqual(["u1"]);
  });

  it("only includes the selected readers in usersId", () => {
    const result = setup(
      { JHN: { 1: ["u1", "u2", "u3"] } },
      new Map([
        ["u1", true],
        ["u2", false],
        ["u3", true],
      ])
    );
    expect(result.current.booksData[0]!.usersId).toEqual(["u1", "u3"]);
  });

  it("includes only the books that have selected readers", () => {
    const result = setup(
      {
        GEN: { 1: ["u1"] },
        EXO: { 1: ["u2"] },
        LEV: { 1: ["u1", "u2"] },
      },
      new Map([
        ["u1", true],
        ["u2", false],
      ])
    );
    expect(result.current.booksData.map((b) => b.bookId)).toEqual([
      "GEN",
      "LEV",
    ]);
  });
});
