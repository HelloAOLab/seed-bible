import { render } from "preact";
import { act } from "preact/test-utils";
import { useReadingHistoryUserFiltersSelector } from "scriptureMap.hooks.useReadingHistoryUserFiltersSelector";
import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";
import { useReadingHistoryContext } from "scriptureMap.contexts.ReadingHistory.ReadingHistoryContext";

jest.mock("scriptureMap.contexts.ScriptureMap.ScriptureMapContext", () => ({
  useScriptureMapContext: jest.fn(),
}));

jest.mock("scriptureMap.contexts.ReadingHistory.ReadingHistoryContext", () => ({
  useReadingHistoryContext: jest.fn(),
}));

type UserData = { profile?: { name?: string } };

describe("useReadingHistoryUserFiltersSelector", () => {
  let container: HTMLDivElement;
  const handleReadingHistoryUserSelectorClick = jest.fn();
  const getUserColor = jest.fn(() => "#000000");

  function makeScriptureMapContext(
    translate: (key: string) => string,
    CapitalizeFirstLetter = (s: string) =>
      s.charAt(0).toUpperCase() + s.slice(1)
  ) {
    return {
      translate,
      CapitalizeFirstLetter,
      userColorStore: { getUserColor },
    };
  }

  function makeReadingHistoryContext(
    readingHistoryUserFilters: Map<string, boolean>,
    myAuthBotId: string,
    usersDataMap: Map<string, UserData>
  ) {
    return {
      handleReadingHistoryUserSelectorClick,
      readingHistoryUserFilters,
      myAuthBotId,
      usersDataMap,
    };
  }

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    (useScriptureMapContext as jest.Mock).mockReturnValue(
      makeScriptureMapContext((key) => key)
    );
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    jest.clearAllMocks();
  });

  function setup(
    readingHistoryUserFilters: Map<string, boolean>,
    myAuthBotId: string,
    usersDataMap: Map<string, UserData>
  ) {
    (useReadingHistoryContext as jest.Mock).mockReturnValue(
      makeReadingHistoryContext(
        readingHistoryUserFilters,
        myAuthBotId,
        usersDataMap
      )
    );
    const result = {
      current: null as unknown as ReturnType<
        typeof useReadingHistoryUserFiltersSelector
      >,
    };

    function TestComponent() {
      result.current = useReadingHistoryUserFiltersSelector();
      return null;
    }

    act(() => render(<TestComponent />, container));
    return result;
  }

  it("allSelected is true when all user filters are true", () => {
    const filters = new Map([
      ["user1", true],
      ["user2", true],
    ]);
    const usersDataMap = new Map([
      ["user1", { profile: { name: "Alice" } }],
      ["user2", { profile: { name: "Bob" } }],
    ]);
    const result = setup(filters, "other", usersDataMap);
    expect(result.current.allSelected).toBe(true);
  });

  it("allSelected is false when any user filter is false", () => {
    const filters = new Map([
      ["user1", true],
      ["user2", false],
    ]);
    const usersDataMap = new Map([
      ["user1", { profile: { name: "Alice" } }],
      ["user2", { profile: { name: "Bob" } }],
    ]);
    const result = setup(filters, "other", usersDataMap);
    expect(result.current.allSelected).toBe(false);
  });

  it("labels the current user as 'You'", () => {
    (useScriptureMapContext as jest.Mock).mockReturnValue(
      makeScriptureMapContext((key) => (key === "you" ? "you" : key))
    );
    const filters = new Map([["me", true]]);
    const usersDataMap = new Map([["me", { profile: { name: "My Name" } }]]);
    const result = setup(filters, "me", usersDataMap);
    const option = result.current.selectorOptionsData.find(
      (o) => o.key === "me"
    );
    expect(option?.content.title).toBe("You");
  });

  it("uses profile name for other users", () => {
    const filters = new Map([["user1", true]]);
    const usersDataMap = new Map([["user1", { profile: { name: "Alice" } }]]);
    const result = setup(filters, "other", usersDataMap);
    const option = result.current.selectorOptionsData.find(
      (o) => o.key === "user1"
    );
    expect(option?.content.title).toBe("Alice");
  });

  it("falls back to 'Guest' when profile name is empty", () => {
    (useScriptureMapContext as jest.Mock).mockReturnValue(
      makeScriptureMapContext((key) => (key === "guest" ? "guest" : key))
    );
    const filters = new Map([["user1", true]]);
    const usersDataMap = new Map([["user1", { profile: { name: "" } }]]);
    const result = setup(filters, "other", usersDataMap);
    const option = result.current.selectorOptionsData.find(
      (o) => o.key === "user1"
    );
    expect(option?.content.title).toBe("Guest");
  });

  it("falls back to 'Guest' when profile is undefined", () => {
    (useScriptureMapContext as jest.Mock).mockReturnValue(
      makeScriptureMapContext((key) => (key === "guest" ? "guest" : key))
    );
    const filters = new Map([["user1", true]]);
    const usersDataMap = new Map([["user1", {}]]);
    const result = setup(filters, "other", usersDataMap);
    const option = result.current.selectorOptionsData.find(
      (o) => o.key === "user1"
    );
    expect(option?.content.title).toBe("Guest");
  });

  it("skips users not present in usersDataMap", () => {
    const filters = new Map([["user1", true]]);
    const usersDataMap = new Map<string, UserData>();
    const result = setup(filters, "other", usersDataMap);
    expect(result.current.selectorOptionsData).toHaveLength(0);
  });
});
