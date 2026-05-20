import { render } from "preact";
import { act } from "preact/test-utils";
import { useReadingHistoryContext } from "scriptureMap2D.contexts.ReadingHistory.ReadingHistoryContext";

jest.mock(
  "scriptureMap2D.contexts.ReadingHistory.useReadingHistoryProvider",
  () => ({
    useReadingHistoryProvider: jest.fn(() => ({})),
  })
);

describe("ReadingHistoryContext", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("throws when useReadingHistoryContext is called outside a provider", () => {
    function TestComponent() {
      useReadingHistoryContext();
      return null;
    }

    expect(() => {
      act(() => render(<TestComponent />, container));
    }).toThrow(
      "useReadingHistoryContext must be used within a ReadingHistoryContext"
    );
  });
});
