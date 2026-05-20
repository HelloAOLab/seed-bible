import { render } from "preact";
import { act } from "preact/test-utils";
import { useTimeContext } from "scriptureMap2D.contexts.Time.TimeContext";

jest.mock("scriptureMap2D.contexts.Time.useTimeProvider", () => ({
  useTimeProvider: jest.fn(() => ({ tick: 0 })),
}));

describe("TimeContext", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  it("throws when useTimeContext is called outside a provider", () => {
    function TestComponent() {
      useTimeContext();
      return null;
    }

    expect(() => {
      act(() => render(<TestComponent />, container));
    }).toThrow("useTimeContext must be used within a TimeContext");
  });
});
