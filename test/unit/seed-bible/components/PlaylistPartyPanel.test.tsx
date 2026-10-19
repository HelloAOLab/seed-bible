import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { PlaylistPartyPanel } from "@packages/seed-bible/seed-bible/components/PlaylistPartyPanel/PlaylistPartyPanel";
import {
  createPlayingState,
  type PlaylistItemData,
} from "@packages/seed-bible/seed-bible/managers/PlaylistManager";
import {
  getUserAnimalVisual,
  type BibleReadingSession,
  type ConnectedSessionUser,
  type ParticipantReadingPosition,
  type PlaylistReadiness,
  type SharedQuestionAnswer,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

function user(
  connectionId: string,
  name: string,
  isSelf = false
): ConnectedSessionUser {
  return {
    connectionId,
    userId: `user-${connectionId}`,
    isSelf,
    profile: { name },
    visual: getUserAnimalVisual(connectionId),
    isActive: true,
    joinedAtMs: 1,
  } as ConnectedSessionUser;
}

function createSession(options: {
  users: ConnectedSessionUser[];
  hostUserId?: string;
  readiness?: Record<string, PlaylistReadiness>;
  positions?: Record<string, ParticipantReadingPosition>;
  answers?: SharedQuestionAnswer[];
}) {
  const setPlaylistReady = vi.fn();
  const session = {
    options: signal({
      hostUserId: options.hostUserId ?? null,
      coHostUserIds: [],
      allowedNavigators: null,
      allowedDecorators: null,
      highlightDurationSeconds: 16,
      endedAt: null,
      shareTranslation: false,
    }),
    connectedUsers: signal(options.users),
    currentUser: signal(options.users.find((u) => u.isSelf) ?? null),
    playlistReadiness: signal(new Map(Object.entries(options.readiness ?? {}))),
    participantPositions: signal(
      new Map(Object.entries(options.positions ?? {}))
    ),
    questionAnswers: signal(options.answers ?? []),
    setPlaylistReady,
  } as unknown as BibleReadingSession;
  return { session, setPlaylistReady };
}

const steps: PlaylistItemData[] = [
  { type: "bible-verse", ref: { bookId: "GEN", chapter: 16, verse: 7 } },
  { type: "question", prompt: "God himself, or a messenger?" },
  { type: "bible-verse", ref: { bookId: "EXO", chapter: 3 } },
];

describe("PlaylistPartyPanel", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
  });

  function renderPanel(
    sessionOptions: Parameters<typeof createSession>[0],
    options: {
      isLeader?: boolean;
      step?: number;
      compact?: boolean;
      onOpenChat?: () => void;
      sendMessage?: ReturnType<typeof vi.fn>;
    } = {}
  ) {
    const tab = options.sendMessage
      ? ({
          sharedChat: { sendMessage: options.sendMessage },
          readingState: {
            translationId: signal("BSB"),
            selectTranslationAndChapter: vi.fn().mockResolvedValue(undefined),
            decorateVerses: vi.fn(() => "d"),
            removeDecoration: vi.fn(),
            chapterData: signal(null),
          },
        } as unknown as Parameters<typeof createPlayingState>[1])
      : undefined;
    const playing = createPlayingState(
      [
        {
          id: "p1",
          title: "Angel of the LORD",
          description: null,
          items: steps,
        },
      ],
      tab
    );
    if (options.step) {
      playing.currentIndex.value = options.step;
    }
    const { session, setPlaylistReady } = createSession(sessionOptions);
    act(() => {
      render(
        <PlaylistPartyPanel
          session={session}
          playing={playing}
          isLeader={options.isLeader ?? false}
          resolveBookName={(id) =>
            ({ GEN: "Genesis", EXO: "Exodus" })[id] ?? id
          }
          compact={options.compact}
          onOpenChat={options.onOpenChat}
        />,
        container
      );
    });
    return { playing, session, setPlaylistReady };
  }

  const people = () =>
    Array.from(container.querySelectorAll(".sb-party-person")).map((row) => ({
      name: row.querySelector(".sb-party-person-name")?.textContent,
      state: row.querySelector(".sb-party-person-state")?.textContent,
      ready: row.classList.contains("sb-party-person--ready"),
    }));

  it("shows the leader who's ready for the step, where the rest are, and a button to move everyone on", async () => {
    const mazen = user("c-mazen", "Mazen", true);
    const { playing } = renderPanel(
      {
        users: [mazen, user("c-sara", "Sara"), user("c-daniel", "Daniel")],
        hostUserId: "user-c-mazen",
        readiness: {
          "c-sara": { step: 0, readyAtMs: 1 },
          // Ready for an earlier step: doesn't count for this one.
          "c-daniel": { step: 5, readyAtMs: 1 },
        },
        positions: {
          "c-daniel": {
            bookId: "GEN",
            chapterNumber: 16,
            firstVerse: 13,
            lastVerse: 13,
          },
        },
      },
      { isLeader: true }
    );

    expect(container.querySelector(".sb-party-foot")?.textContent).toBe(
      "Everyone in the session follows your steps"
    );
    expect(container.querySelector(".sb-party-ready-count")?.textContent).toBe(
      "1 of 3"
    );
    expect(people()).toEqual([
      { name: "Mazen", state: "reading", ready: false },
      { name: "Sara", state: "check", ready: true },
      { name: "Daniel", state: "still reading Genesis 16:13", ready: false },
    ]);

    const move = container.querySelector<HTMLButtonElement>(".sb-party-move")!;
    expect(move.textContent).toContain("Move everyone to step 2");
    await act(async () => {
      move.click();
      await Promise.resolve();
    });
    expect(playing.currentIndex.value).toBe(1);
  });

  it("lets a follower say they're ready for this step, and take it back", () => {
    const sara = user("c-sara", "Sara", true);
    const { setPlaylistReady } = renderPanel({
      users: [user("c-mazen", "Mazen"), sara],
      hostUserId: "user-c-mazen",
    });

    expect(container.querySelector(".sb-party-foot")?.textContent).toBe(
      "Following Mazen · step 1 of 3"
    );
    expect(container.querySelector(".sb-party-move")).toBeNull();
    const toggle = container.querySelector<HTMLButtonElement>(
      ".sb-party-ready-toggle"
    )!;
    expect(toggle.textContent).toContain("I'm ready");

    act(() => toggle.click());
    expect(setPlaylistReady).toHaveBeenCalledWith(0);
  });

  it("offers to take readiness back once given", () => {
    const sara = user("c-sara", "Sara", true);
    const { setPlaylistReady } = renderPanel({
      users: [user("c-mazen", "Mazen"), sara],
      hostUserId: "user-c-mazen",
      readiness: { "c-sara": { step: 0, readyAtMs: 1 } },
    });

    const toggle = container.querySelector<HTMLButtonElement>(
      ".sb-party-ready-toggle"
    )!;
    expect(toggle.textContent).toContain("Not ready yet");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    act(() => toggle.click());
    expect(setPlaylistReady).toHaveBeenCalledWith(null);
  });

  it("shows the answers shared to the step's question, and nothing on other steps", () => {
    renderPanel(
      {
        users: [user("c-mazen", "Mazen", true)],
        hostUserId: "user-c-mazen",
        answers: [
          {
            prompt: "God himself, or a messenger?",
            text: "Only God can promise that.",
            connectionId: "c-sara",
            userId: null,
            name: "Sara",
            atMs: 2,
          },
          {
            prompt: "Another question",
            text: "Not this step",
            connectionId: "c-x",
            userId: null,
            name: "X",
            atMs: 3,
          },
        ],
      },
      { isLeader: true, step: 1 }
    );

    expect(container.querySelector(".sb-party-answers")).not.toBeNull();
    const answers = Array.from(
      container.querySelectorAll(".sb-party-answer")
    ).map((el) => el.textContent);
    expect(answers).toEqual(["SaraOnly God can promise that."]);
    expect(container.querySelector(".sb-party-move")?.textContent).toContain(
      "Move everyone to step 3"
    );

    render(null, container);
    renderPanel(
      { users: [user("c-mazen", "Mazen", true)], hostUserId: "user-c-mazen" },
      { isLeader: true }
    );
    expect(container.querySelector(".sb-party-answers")).toBeNull();
  });

  it("offers to finish the playlist on its last step", () => {
    renderPanel(
      { users: [user("c-mazen", "Mazen", true)], hostUserId: "user-c-mazen" },
      { isLeader: true, step: 2 }
    );
    // An unsaved queue can't finish, so the button is there but disabled.
    const move = container.querySelector<HTMLButtonElement>(".sb-party-move")!;
    expect(move.textContent).toContain("Finish the playlist");
    expect(move.disabled).toBe(true);
  });

  it("tells the chat when the leader moves everyone on, and can move them back", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const mazen = user("c-mazen", "Mazen", true);
    const { playing } = renderPanel(
      { users: [mazen, user("c-sara", "Sara")], hostUserId: "user-c-mazen" },
      { isLeader: true, sendMessage }
    );
    expect(
      container.querySelector<HTMLButtonElement>(".sb-party-back")!.disabled
    ).toBe(true);

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".sb-party-move")!.click();
      await Promise.resolve();
    });
    expect(playing.currentIndex.value).toBe(1);
    expect(sendMessage).toHaveBeenCalledWith({
      type: "text",
      text: "Mazen moved everyone to step 2 · God himself, or a messenger?",
      event: { kind: "moved" },
    });

    await act(async () => {
      container.querySelector<HTMLButtonElement>(".sb-party-back")!.click();
      await Promise.resolve();
    });
    expect(playing.currentIndex.value).toBe(0);
  });

  it("folds to one line with Chat and I'm ready on a phone", () => {
    const onOpenChat = vi.fn();
    const sara = user("c-sara", "Sara", true);
    const { setPlaylistReady } = renderPanel(
      {
        users: [user("c-mazen", "Mazen"), sara, user("c-daniel", "Daniel")],
        hostUserId: "user-c-mazen",
        readiness: { "c-mazen": { step: 0, readyAtMs: 1 } },
      },
      { compact: true, onOpenChat }
    );

    expect(container.querySelector(".sb-party-compact-line")?.textContent).toBe(
      "Mazen moves the group on when everyone's ready1 of 3 ready"
    );
    expect(container.querySelector(".sb-party-people")).toBeNull();
    act(() => {
      container.querySelector<HTMLButtonElement>(".sb-party-chat")!.click();
    });
    expect(onOpenChat).toHaveBeenCalledTimes(1);
    act(() => {
      container
        .querySelector<HTMLButtonElement>(".sb-party-ready-toggle")!
        .click();
    });
    expect(setPlaylistReady).toHaveBeenCalledWith(0);
  });
});
