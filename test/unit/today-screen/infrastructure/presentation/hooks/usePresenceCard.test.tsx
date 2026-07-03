import type { Mock } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { usePresenceCard } from "../../../../../../packages/today-screen/infrastructure/presentation/hooks/usePresenceCard";
import { useTodayContext } from "../../../../../../packages/today-screen/infrastructure/presentation/contexts/today/TodayContext";

vi.mock(
  "../../../../../../packages/today-screen/infrastructure/presentation/contexts/today/TodayContext",
  () => ({
    useTodayContext: vi.fn(),
  })
);

const MaterialIcon = ({ children }: { children: string }) => (
  <span className="material-icon">{children}</span>
);

interface ConnectedUser {
  profile?: { pictureUrl?: string | null } | undefined;
  color: string;
  userId?: string;
  connectionId: string;
}

function makeSession(options: {
  id?: string;
  bookId?: string;
  chapter?: number;
  users?: ConnectedUser[];
}) {
  return {
    id: options.id ?? "s1",
    readingState: {
      bookId: { value: options.bookId ?? "GEN" },
      chapterNumber: { value: options.chapter ?? 3 },
    },
    connectedUsers: { value: options.users ?? [] },
  };
}

const joinSharedSession = vi.fn();
const getIconById = vi.fn((id: string) => `icon-${id}`);

type Result = ReturnType<typeof usePresenceCard>;

describe("usePresenceCard", () => {
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

  function setup(sessions: ReturnType<typeof makeSession>[]) {
    (useTodayContext as Mock).mockReturnValue({
      translate: vi.fn((key: string) => key),
      sharedSessions: signal(sessions),
      bookNames: signal(new Map([["GEN", "Genesis"]])),
      userDeterministicIdentityProvider: { getIconById },
      MaterialIcon,
      joinSharedSession,
    });
    const result = { current: null as unknown as Result };
    function TestComponent() {
      result.current = usePresenceCard();
      return null;
    }
    act(() => render(<TestComponent />, container));
    return result;
  }

  describe("static text", () => {
    it("translates live and join text", () => {
      const result = setup([]);
      expect(result.current.liveText).toBe("live-now");
      expect(result.current.joinText).toBe("Join");
    });
  });

  describe("without a shared session", () => {
    it("has no reading, no icons, and a hidden card", () => {
      const result = setup([]);
      expect(result.current.reading.value).toBeUndefined();
      expect(result.current.userIconsData.value).toEqual([]);
      expect(result.current.showCard.value).toBe(false);
    });

    it("does nothing when join is clicked", () => {
      const result = setup([]);
      act(() => result.current.handleJoinClick());
      expect(joinSharedSession).not.toHaveBeenCalled();
    });
  });

  describe("reading", () => {
    it("resolves the book name and chapter", () => {
      const result = setup([makeSession({ bookId: "GEN", chapter: 3 })]);
      expect(result.current.reading.value).toBe("Genesis 3");
    });

    it("uses the raw bookId value when it is falsy", () => {
      const result = setup([makeSession({ bookId: "", chapter: 5 })]);
      expect(result.current.reading.value).toBe(" 5");
    });
  });

  describe("userIconsData", () => {
    it("maps connected users to icon data", () => {
      const result = setup([
        makeSession({
          users: [
            {
              profile: { pictureUrl: "http://a.png" },
              color: "rgb(1, 2, 3)",
              userId: "u1",
              connectionId: "c1",
            },
            {
              profile: undefined,
              color: "rgb(4, 5, 6)",
              connectionId: "c2",
            },
          ],
        }),
      ]);

      const icons = result.current.userIconsData.value;
      expect(icons).toHaveLength(2);

      // First user: has a picture and a userId.
      expect(icons[0]).toEqual({
        pictureUrl: "http://a.png",
        color: "rgb(1, 2, 3)",
        icon: "icon-u1",
        MaterialIcon,
        key: "u1",
      });

      // Second user: no profile → undefined picture; falls back to connectionId.
      expect(icons[1]!.pictureUrl).toBeUndefined();
      expect(icons[1]!.icon).toBe("icon-c2");
      expect(icons[1]!.key).toBe("c2");
    });
  });

  describe("showCard", () => {
    it("is true with a session and at least one connected user", () => {
      const result = setup([
        makeSession({
          users: [{ color: "rgb(0,0,0)", connectionId: "c1" }],
        }),
      ]);
      expect(result.current.showCard.value).toBe(true);
    });

    it("is false with a session but no connected users", () => {
      const result = setup([makeSession({ users: [] })]);
      expect(result.current.showCard.value).toBe(false);
    });
  });

  describe("handleJoinClick", () => {
    it("joins the active shared session", () => {
      const result = setup([makeSession({ id: "session-42" })]);
      act(() => result.current.handleJoinClick());
      expect(joinSharedSession).toHaveBeenCalledWith("session-42");
    });
  });
});
