import { render } from "preact";
import { act } from "preact/test-utils";
import { PresenceCard } from "todayScreen.infrastructure.presentation.components.containers.PresenceCard";
import { usePresenceCard } from "todayScreen.infrastructure.presentation.hooks.usePresenceCard";

jest.mock(
  "todayScreen.infrastructure.presentation.hooks.usePresenceCard",
  () => ({
    usePresenceCard: jest.fn(),
  })
);

jest.mock(
  "todayScreen.infrastructure.presentation.components.ui.UserIcon",
  () => ({
    UserIcon: jest.fn(() => <div data-testid="user-icon" />),
  })
);

type PresenceResult = ReturnType<typeof usePresenceCard>;

function makeResult(options: {
  showCard?: boolean;
  liveText?: string;
  reading?: string | undefined;
  joinText?: string;
  userIcons?: { key: string }[];
  handleJoinClick?: () => void;
}): PresenceResult {
  return {
    liveText: options.liveText ?? "LIVE NOW",
    reading: { value: options.reading ?? "John 3" },
    userIconsData: { value: options.userIcons ?? [] },
    joinText: options.joinText ?? "Join",
    handleJoinClick: options.handleJoinClick ?? jest.fn(),
    showCard: { value: options.showCard ?? true },
  } as unknown as PresenceResult;
}

describe("PresenceCard", () => {
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
    (usePresenceCard as jest.Mock).mockReturnValue(result);
    act(() => render(<PresenceCard />, container));
    return result;
  }

  const q = (sel: string) => container.querySelector(sel);
  const qa = (sel: string) => container.querySelectorAll(sel);

  describe("visibility", () => {
    it("renders nothing when showCard is false", () => {
      setup({ showCard: false });
      expect(q(".presence-card")).toBeNull();
    });

    it("renders the card when showCard is true", () => {
      setup({ showCard: true });
      expect(q(".presence-card.today-section-card")).not.toBeNull();
    });
  });

  describe("content", () => {
    it("renders the live text in the status section", () => {
      setup({ liveText: "EN VIVO" });
      expect(q(".presence-card-status")!.textContent).toBe("EN VIVO");
    });

    it("renders the reading reference", () => {
      setup({ reading: "Genesis 1" });
      expect(q(".presence-card-reading")!.textContent).toBe("Genesis 1");
    });

    it("renders the join button with its text", () => {
      setup({ joinText: "Unirse" });
      expect(q(".presence-card-join-button")!.textContent).toBe("Unirse");
    });
  });

  describe("user icons", () => {
    it("renders a UserIcon per entry", () => {
      setup({ userIcons: [{ key: "a" }, { key: "b" }] });
      expect(qa("[data-testid='user-icon']")).toHaveLength(2);
    });

    it("renders no UserIcons when there are none", () => {
      setup({ userIcons: [] });
      expect(qa("[data-testid='user-icon']")).toHaveLength(0);
    });
  });

  describe("interaction", () => {
    it("calls handleJoinClick when the join button is clicked", () => {
      const handleJoinClick = jest.fn();
      setup({ handleJoinClick });
      act(() =>
        container
          .querySelector<HTMLButtonElement>(".presence-card-join-button")!
          .click()
      );
      expect(handleJoinClick).toHaveBeenCalledTimes(1);
    });
  });
});
