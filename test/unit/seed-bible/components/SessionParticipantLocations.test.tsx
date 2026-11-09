import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  MobileSessionParticipants,
  TAB_PARTICIPANTS_EXPANDED_STORAGE_KEY,
  TabSessionParticipants,
  isTabParticipantsListExpanded,
} from "@packages/seed-bible/seed-bible/components/SessionParticipants/SessionParticipants";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import {
  COME_BACK_REQUEST_COOLDOWN_MS,
  type BibleReadingSession,
  type ComeBackRequest,
  type ConnectedSessionUser,
  type ParticipantReadingPosition,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

const HOST_CONNECTION = "conn-grace";

function user(
  connectionId: string,
  name: string,
  isSelf = false
): ConnectedSessionUser {
  return {
    connectionId,
    // No account, so the rows carry no Add friend button to set up.
    userId: null,
    isSelf,
    profile: { name },
    visual: { defaultIcon: "pets", color: "#8B5CF6", colorName: "purple" },
    isActive: true,
    joinedAtMs: null,
  } as ConnectedSessionUser;
}

/**
 * A session whose group is on John 3, as seen by Grace (`HOST_CONNECTION`).
 * `askToComeBack` records the request the way the real session does, so the
 * button's Asked state comes from the shared requests like it would live.
 */
function createSession({
  localIsHost,
  positions,
  localIsAway = false,
}: {
  localIsHost: boolean;
  positions: Record<string, ParticipantReadingPosition>;
  localIsAway?: boolean;
}) {
  const comeBackRequests = signal<ReadonlyMap<string, ComeBackRequest>>(
    new Map()
  );
  const askToComeBack = vi.fn((connectionId: string) => {
    comeBackRequests.value = new Map([
      ...comeBackRequests.value,
      [
        connectionId,
        {
          id: `request-${connectionId}`,
          fromConnectionId: HOST_CONNECTION,
          fromUserId: null,
          sentAtMs: Date.now(),
        },
      ],
    ]);
  });
  const session = {
    id: "session-1",
    options: signal({
      hostUserId: localIsHost ? HOST_CONNECTION : "conn-someone",
      coHostUserIds: [],
      allowedNavigators: localIsHost ? [HOST_CONNECTION] : ["conn-someone"],
      allowedDecorators: null,
      highlightDurationSeconds: 16,
      shareTranslation: true,
      endedAt: null,
    }),
    connectedUsers: signal([
      user(HOST_CONNECTION, "Grace", true),
      user("conn-ana", "Ana"),
      user("conn-priya", "Priya"),
    ]),
    readingState: {
      bookId: signal("JHN"),
      chapterNumber: signal(3),
      visibleVerseRange: signal({ first: 1, last: 8 }),
      translationBooks: signal({
        books: [
          { id: "JHN", name: "John" },
          { id: "PSA", name: "Psalm" },
        ],
      }),
    },
    groupPosition: signal({
      translationId: "BSB",
      bookId: "JHN",
      chapterNumber: 3,
      scrollToVerse: null,
    }),
    participantPositions: signal(new Map(Object.entries(positions))),
    comeBackRequests,
    askToComeBack,
    isAwayFromGroup: signal(localIsAway),
    rejoinGroup: vi.fn(async () => undefined),
  } as unknown as BibleReadingSession;
  return { session, askToComeBack };
}

function createState(): SeedBibleState {
  return {
    login: { userId: signal(null) },
    os: { connectionId: HOST_CONNECTION },
  } as unknown as SeedBibleState;
}

describe("Session participants — where everyone is", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
    vi.useRealTimers();
  });

  function openSheet(session: BibleReadingSession) {
    act(() =>
      render(
        <MobileSessionParticipants state={createState()} session={session} />,
        container
      )
    );
    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-session-participants-stack")!
        .click();
    });
    return document.querySelector<HTMLElement>(
      ".sb-session-participants-sheet"
    )!;
  }

  const sectionTitles = (sheet: HTMLElement) =>
    Array.from(
      sheet.querySelectorAll(".sb-session-participants-section-title")
    ).map((title) => title.textContent);

  const rowFor = (sheet: HTMLElement, name: string) =>
    Array.from(
      sheet.querySelectorAll<HTMLElement>(".sb-session-participants-list-item")
    ).find((row) => row.textContent?.includes(name))!;

  const elsewherePositions = {
    "conn-ana": { bookId: "JHN", chapterNumber: 3 },
    "conn-priya": {
      bookId: "PSA",
      chapterNumber: 23,
      firstVerse: 1,
      lastVerse: 4,
    },
  };

  it("splits people with the group from those reading elsewhere, and says where", () => {
    const { session } = createSession({
      localIsHost: true,
      positions: elsewherePositions,
    });
    const sheet = openSheet(session);

    expect(sectionTitles(sheet)).toEqual([
      "With the group · John 3",
      "Reading elsewhere",
    ]);
    const lists = sheet.querySelectorAll(".sb-session-participants-list");
    expect(lists[0]!.textContent).toContain("Grace");
    expect(lists[0]!.textContent).toContain("Ana");
    expect(lists[1]!.textContent).toContain("Priya");
    expect(rowFor(sheet, "Priya").textContent).toContain("Psalm 23:1–4");
  });

  it("lets a host ask someone to come back, then shows Asked for 30 seconds", () => {
    vi.useFakeTimers();
    const { session, askToComeBack } = createSession({
      localIsHost: true,
      positions: elsewherePositions,
    });
    const sheet = openSheet(session);

    // Only the person who is away can be asked.
    expect(rowFor(sheet, "Ana").querySelector(".sb-ask-come-back")).toBeNull();
    const ask = rowFor(sheet, "Priya").querySelector<HTMLButtonElement>(
      ".sb-ask-come-back"
    )!;
    expect(ask.textContent).toBe("Ask to come back");

    act(() => ask.click());

    expect(askToComeBack).toHaveBeenCalledWith("conn-priya");
    const asked = rowFor(sheet, "Priya").querySelector<HTMLButtonElement>(
      ".sb-ask-come-back"
    )!;
    expect(asked.textContent).toContain("Asked");
    expect(asked.disabled).toBe(true);

    act(() => {
      vi.advanceTimersByTime(COME_BACK_REQUEST_COOLDOWN_MS - 1000);
    });
    expect(
      rowFor(sheet, "Priya").querySelector<HTMLButtonElement>(
        ".sb-ask-come-back"
      )!.disabled
    ).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    const again = rowFor(sheet, "Priya").querySelector<HTMLButtonElement>(
      ".sb-ask-come-back"
    )!;
    expect(again.textContent).toBe("Ask to come back");
    expect(again.disabled).toBe(false);
  });

  it("shows a participant who isn't a host where people are, without Ask to come back", () => {
    const { session } = createSession({
      localIsHost: false,
      positions: elsewherePositions,
    });
    const sheet = openSheet(session);

    expect(rowFor(sheet, "Priya").textContent).toContain("Psalm 23:1–4");
    expect(sheet.querySelector(".sb-ask-come-back")).toBeNull();
  });

  it("keeps one plain list while everyone is with the group", () => {
    const { session } = createSession({
      localIsHost: true,
      positions: {
        "conn-ana": { bookId: "JHN", chapterNumber: 3 },
        "conn-priya": { bookId: "JHN", chapterNumber: 3 },
      },
    });
    const sheet = openSheet(session);

    expect(sectionTitles(sheet)).toEqual([]);
    expect(sheet.querySelector(".sb-ask-come-back")).toBeNull();
  });
});

describe("Session participants — inside the desktop session tab", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    window.localStorage.clear();
    isTabParticipantsListExpanded.value = false;
  });

  afterEach(() => {
    act(() => render(null, container));
    container.remove();
  });

  const awayPositions = {
    "conn-ana": { bookId: "JHN", chapterNumber: 3 },
    "conn-priya": { bookId: "PSA", chapterNumber: 23 },
  };

  function renderTab(session: BibleReadingSession) {
    act(() =>
      render(
        <TabSessionParticipants state={createState()} session={session} />,
        container
      )
    );
  }

  const button = (label: string) =>
    Array.from(container.querySelectorAll("button")).find(
      (el) =>
        el.textContent?.includes(label) ||
        el.getAttribute("aria-label") === label
    );

  it("opens from a toggle that counts who is away, and remembers it on this device", () => {
    const { session } = createSession({
      localIsHost: true,
      positions: awayPositions,
    });
    renderTab(session);

    const toggle = button("Show participants")!;
    expect(toggle.textContent).toContain("1 away");
    expect(container.querySelector(".sb-tab-participants")).toBeNull();

    act(() => toggle.click());

    expect(container.textContent).toContain("Participants · 3");
    expect(container.textContent).toContain("Reading elsewhere");
    expect(
      window.localStorage.getItem(TAB_PARTICIPANTS_EXPANDED_STORAGE_KEY)
    ).toBe("true");

    act(() => button("Hide participants")!.click());

    expect(container.querySelector(".sb-tab-participants")).toBeNull();
    expect(
      window.localStorage.getItem(TAB_PARTICIPANTS_EXPANDED_STORAGE_KEY)
    ).toBe("false");
  });

  it("offers session settings to hosts only", () => {
    isTabParticipantsListExpanded.value = true;
    const host = createSession({ localIsHost: true, positions: {} });
    renderTab(host.session);
    expect(button("Session settings")).toBeDefined();
    expect(button("Share session")).toBeDefined();

    const participant = createSession({ localIsHost: false, positions: {} });
    renderTab(participant.session);
    expect(button("Session settings")).toBeUndefined();
    expect(button("Share session")).toBeDefined();
  });

  it("gives a reader who is away a Rejoin button on their own row", () => {
    isTabParticipantsListExpanded.value = true;
    const { session } = createSession({
      localIsHost: false,
      positions: awayPositions,
      localIsAway: true,
    });
    renderTab(session);

    const ownRow = Array.from(
      container.querySelectorAll(".sb-session-participants-list-item")
    ).find((row) => row.textContent?.includes("Grace (you)"))!;
    const rejoin = Array.from(ownRow.querySelectorAll("button")).find((el) =>
      el.textContent?.includes("Rejoin")
    )!;

    act(() => rejoin.click());

    expect(session.rejoinGroup).toHaveBeenCalledTimes(1);
  });
});
