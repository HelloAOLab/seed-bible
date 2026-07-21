import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { TodayContent } from "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/TodayContent";
import { useTodayContent } from "../../../../../../../packages/today-screen/infrastructure/presentation/hooks/useTodayContent";

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/hooks/useTodayContent",
  () => ({
    useTodayContent: vi.fn(),
  })
);

vi.mock(
  "../../../../../../../packages/today-screen/infrastructure/presentation/components/containers/Header",
  () => ({
    Header: vi.fn(() => <div data-testid="header" />),
  })
);

type DividedSection = "search" | "recommendations" | "social" | "bookmarks";

describe("TodayContent", () => {
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
    options: {
      dividedSectionsIds?: DividedSection[];
      showResumeReading?: boolean;
      Content?: Mock;
    } = {}
  ) {
    const Content =
      options.Content ?? vi.fn(() => <div data-testid="content" />);
    (useTodayContent as Mock).mockReturnValue({
      Content,
      dividedSectionsIds: options.dividedSectionsIds ?? [],
      showResumeReading: options.showResumeReading ?? false,
    });
    act(() => render(<TodayContent />, container));
    return { Content };
  }

  const q = (sel: string) => container.querySelector(sel);

  it("always renders the Header", () => {
    setup();
    expect(q("[data-testid='header']")).not.toBeNull();
  });

  it("renders the Content component from the hook", () => {
    setup();
    expect(q("[data-testid='content']")).not.toBeNull();
  });

  it("passes showResumeReading and dividedSectionsIds through to Content", () => {
    const { Content } = setup({
      showResumeReading: true,
      dividedSectionsIds: ["search", "social"],
    });
    expect(Content).toHaveBeenCalledWith(
      expect.objectContaining({
        showResumeReading: true,
        dividedSectionsIds: ["search", "social"],
      }),
      expect.anything()
    );
  });
});
