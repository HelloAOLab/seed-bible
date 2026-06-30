import { render } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import { ChatView } from "@packages/seed-bible/seed-bible/components/ChatView";
import type {
  ChatSession,
  ParsedChatTextMessage,
  UserChatParticipant,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { BookId } from "@packages/seed-bible/seed-bible/managers/BibleDataManager";
import type { Mock } from "vitest";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const actual = await vi.importActual<
    typeof import("@packages/seed-bible/seed-bible/i18n/I18nManager")
  >("@packages/seed-bible/seed-bible/i18n/I18nManager");
  return {
    ...actual,
    useI18n: () => ({
      t: (
        key: string,
        options?: { defaultValue?: string; [k: string]: unknown }
      ) => {
        const template = options?.defaultValue ?? key;
        if (!options) return template;
        return template.replace(/\{\{(\w+)\}\}/g, (_: string, k: string) => {
          const val = options[k];
          return val != null ? String(val) : `{{${k}}}`;
        });
      },
      language: "en",
    }),
  };
});

function createMockParticipant(
  overrides: Partial<UserChatParticipant> = {}
): UserChatParticipant {
  return {
    id: "participant-1",
    name: null,
    isSelf: false,
    isAI: false,
    isRemote: false,
    isActive: true,
    userId: null,
    connectionId: null,
    profile: null,
    visual: { defaultIcon: "person", color: "#aaa", colorName: "gray" },
    ...overrides,
  };
}

function createMockMessage(
  overrides: Partial<ParsedChatTextMessage> = {}
): ParsedChatTextMessage {
  return {
    id: "msg-1",
    authors: ["participant-1"],
    timeMs: 0,
    targets: [],
    type: "text",
    text: "Hello world",
    parts: ["Hello world"],
    ...overrides,
  };
}

function createMockChatSession(
  overrides: Partial<ChatSession> = {}
): ChatSession {
  return {
    id: "chat-1",
    messages: signal([]),
    parsedMessages: signal([]),
    unreadMessages: signal([]),
    lastMessageRead: signal(null),
    wasMentioned: signal(false),
    markAsRead: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    setTypingStatus: vi.fn(),
    participants: signal([]),
    totalParticipants: signal([]),
    inactiveParticipants: signal([]),
    availableParticipants: signal([]),
    typingParticipants: signal([]),
    addParticipant: vi.fn(),
    removeParticipant: vi.fn(),
    getMessageAuthors: vi.fn().mockReturnValue([]),
    ...overrides,
  };
}

function createMockState(): SeedBibleState {
  return {
    app: {
      openVerseReference: vi.fn().mockResolvedValue(undefined),
    },
  } as unknown as SeedBibleState;
}

function typeIntoInput(input: HTMLInputElement, text: string) {
  act(() => {
    input.value = text;
    input.selectionStart = text.length;
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  });
}

function pressKey(input: HTMLInputElement, key: string) {
  act(() => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

function submitForm(container: HTMLDivElement) {
  const form = container.querySelector<HTMLFormElement>(
    ".sb-chat-view-compose"
  )!;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
}

describe("ChatView", () => {
  let container: HTMLDivElement;
  let originalScrollIntoView: typeof HTMLElement.prototype.scrollIntoView;
  let scrollIntoViewMock: Mock;
  let latestIntersectionCallback: IntersectionObserverCallback | null;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    scrollIntoViewMock = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    latestIntersectionCallback = null;
    (globalThis as any).IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) {
        latestIntersectionCallback = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    };
    // DateTime is a CasualOS global from Luxon
    (globalThis as any).DateTime = {
      fromMillis: () => ({
        setLocale: () => ({
          toRelative: () => "just now",
        }),
      }),
    };
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    delete (globalThis as any).IntersectionObserver;
    vi.useRealTimers();
    delete (globalThis as any).DateTime;
  });

  it("renders chat messages with avatar, author, and content", () => {
    const participant = createMockParticipant({
      id: "participant-1",
      name: "Alice",
    });
    const message = createMockMessage({
      id: "msg-1",
      authors: ["participant-1"],
      text: "Hello world",
      parts: ["Hello world"],
    });
    const chat = createMockChatSession({
      parsedMessages: signal([message]),
      participants: signal([participant]),
      getMessageAuthors: vi.fn().mockReturnValue([participant]),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const messageEl = container.querySelector(".sb-chat-view-message");
    expect(messageEl).not.toBeNull();

    const avatarEl = container.querySelector(".sb-tab-user-icon");
    expect(avatarEl).not.toBeNull();

    const authorEl = container.querySelector(".sb-chat-view-message-author");
    expect(authorEl?.textContent).toBe("Alice");

    const bodyEl = container.querySelector(".sb-chat-view-message-body");
    expect(bodyEl?.textContent).toContain("Hello world");
  });

  it("renders typing indicators", () => {
    const typingParticipant = createMockParticipant({
      id: "participant-2",
      name: "Bob",
      isSelf: false,
    });
    const chat = createMockChatSession({
      typingParticipants: signal([typingParticipant]),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const indicator = container.querySelector(".sb-chat-view-typing-indicator");
    expect(indicator).not.toBeNull();
    expect(indicator?.textContent).toContain("Bob is typing...");
  });

  it("renders an input box", () => {
    const chat = createMockChatSession();
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const input = container.querySelector<HTMLInputElement>(
      ".sb-chat-view-input"
    );
    expect(input).not.toBeNull();
    expect(input?.tagName.toLowerCase()).toBe("input");
  });

  it("renders chat messages with mentions and verse references", () => {
    const mentionedParticipant = createMockParticipant({
      id: "participant-alice",
      name: "Alice",
    });
    const message = createMockMessage({
      parts: [
        "Hey ",
        {
          type: "mention" as const,
          text: "@Alice",
          participant: mentionedParticipant,
        },
        ", read ",
        {
          type: "verse_reference" as const,
          text: "John 3:16",
          ref: { book: "JHN" as BookId, chapter: 3, verse: 16 },
        },
        "!",
      ],
    });
    const chat = createMockChatSession({
      parsedMessages: signal([message]),
      getMessageAuthors: vi.fn().mockReturnValue([]),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const mentionEl = container.querySelector(".sb-chat-mention");
    expect(mentionEl).not.toBeNull();
    expect(mentionEl?.textContent).toBe("@Alice");

    const verseRefEl = container.querySelector(".sb-verse-reference-link");
    expect(verseRefEl).not.toBeNull();
    expect(verseRefEl?.textContent).toBe("John 3:16");
  });

  it("does not render typing indicators for the current user", () => {
    const selfParticipant = createMockParticipant({
      id: "self",
      isSelf: true,
    });
    const chat = createMockChatSession({
      typingParticipants: signal([selfParticipant]),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const indicator = container.querySelector(".sb-chat-view-typing-indicator");
    expect(indicator).toBeNull();
  });

  it("marks messages as read as they come into view", () => {
    const msg1 = createMockMessage({ id: "msg-1" });
    const msg2 = createMockMessage({ id: "msg-2" });
    const markAsRead = vi.fn();
    const chat = createMockChatSession({
      parsedMessages: signal([msg1, msg2]),
      markAsRead,
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const msg1El = container.querySelector(
      '[data-message-id="msg-1"]'
    ) as HTMLElement;
    expect(msg1El).not.toBeNull();
    expect(latestIntersectionCallback).not.toBeNull();

    markAsRead.mockClear();
    act(() => {
      latestIntersectionCallback!(
        [
          {
            target: msg1El,
            isIntersecting: true,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver
      );
    });

    // msg-1 is not the last message so markAsRead is called with its id
    expect(markAsRead).toHaveBeenCalledWith("msg-1");
  });

  it("scrolls to new messages when the user is at the bottom of the chat", () => {
    const msg1 = createMockMessage({ id: "msg-1" });
    const parsedMessages = signal([msg1]);
    const chat = createMockChatSession({
      parsedMessages,
      lastMessageRead: signal("msg-1"),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    scrollIntoViewMock.mockClear();

    const msg2 = createMockMessage({ id: "msg-2" });
    act(() => {
      parsedMessages.value = [msg1, msg2];
    });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("does not scroll when new messages arrive and the user has scrolled up", () => {
    const msg1 = createMockMessage({ id: "msg-1" });
    const parsedMessages = signal([msg1]);
    const chat = createMockChatSession({
      parsedMessages,
      lastMessageRead: signal("msg-1"),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    // Simulate the user having scrolled away from the bottom
    const msg1El = container.querySelector(
      '[data-message-id="msg-1"]'
    ) as HTMLElement;
    act(() => {
      latestIntersectionCallback!(
        [
          {
            target: msg1El,
            isIntersecting: false,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver
      );
    });

    scrollIntoViewMock.mockClear();

    const msg2 = createMockMessage({ id: "msg-2" });
    act(() => {
      parsedMessages.value = [msg1, msg2];
    });

    expect(scrollIntoViewMock).not.toHaveBeenCalled();
  });

  // ─── Empty state ────────────────────────────────────────────────────────────

  it("renders the empty state when there are no messages", () => {
    const chat = createMockChatSession({ parsedMessages: signal([]) });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const emptyEl = container.querySelector(".sb-chat-view-empty");
    expect(emptyEl).not.toBeNull();
    expect(emptyEl?.textContent).toContain("Start a conversation");
  });

  it("shows a presence prompt in the empty state when other users are present", () => {
    const alice = createMockParticipant({
      id: "p-alice",
      name: "Alice",
      isSelf: false,
    });
    const chat = createMockChatSession({
      parsedMessages: signal([]),
      participants: signal([alice]),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    expect(container.querySelector(".sb-chat-view-presence")).not.toBeNull();
  });

  // ─── Typing indicator label variants ────────────────────────────────────────

  it("shows both names when two participants are typing", () => {
    const alice = createMockParticipant({ id: "p1", name: "Alice" });
    const bob = createMockParticipant({ id: "p2", name: "Bob" });
    const chat = createMockChatSession({
      typingParticipants: signal([alice, bob]),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const indicator = container.querySelector(".sb-chat-view-typing-indicator");
    expect(indicator?.textContent).toContain("Alice and Bob are typing...");
  });

  it("shows first name and overflow count when three or more participants are typing", () => {
    const participants = [
      createMockParticipant({ id: "p1", name: "Alice" }),
      createMockParticipant({ id: "p2", name: "Bob" }),
      createMockParticipant({ id: "p3", name: "Carol" }),
    ];
    const chat = createMockChatSession({
      typingParticipants: signal(participants),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const indicator = container.querySelector(".sb-chat-view-typing-indicator");
    expect(indicator?.textContent).toContain(
      "Alice and 2 others are typing..."
    );
  });

  // ─── Verse reference click ───────────────────────────────────────────────────

  it("calls openVerseReference when a verse reference link is clicked", () => {
    const verseRef = { book: "JHN" as BookId, chapter: 3, verse: 16 };
    const message = createMockMessage({
      parts: [
        { type: "verse_reference" as const, text: "John 3:16", ref: verseRef },
      ],
    });
    const chat = createMockChatSession({
      parsedMessages: signal([message]),
      getMessageAuthors: vi.fn().mockReturnValue([]),
    });
    const openVerseReference = vi.fn().mockResolvedValue(undefined);
    const state = {
      app: { openVerseReference },
    } as unknown as SeedBibleState;

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const link = container.querySelector(
      ".sb-verse-reference-link"
    ) as HTMLAnchorElement;
    expect(link).not.toBeNull();

    act(() => {
      link.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );
    });

    expect(openVerseReference).toHaveBeenCalledWith(verseRef);
  });

  // ─── Message submission ──────────────────────────────────────────────────────

  it("sends the typed message and clears the draft", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const chat = createMockChatSession({ sendMessage });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const input = container.querySelector<HTMLInputElement>(
      ".sb-chat-view-input"
    )!;
    typeIntoInput(input, "Hello");

    await act(async () => {
      submitForm(container);
      await Promise.resolve();
    });

    expect(sendMessage).toHaveBeenCalledWith({ type: "text", text: "Hello" });
    expect(input.value).toBe("");
  });

  it("does not call sendMessage when the draft is empty", async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    const chat = createMockChatSession({ sendMessage });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    await act(async () => {
      submitForm(container);
      await Promise.resolve();
    });

    expect(sendMessage).not.toHaveBeenCalled();
  });

  it("disables the send button while a message is being sent", async () => {
    const sendMessage = vi.fn().mockReturnValue(new Promise<void>(() => {}));
    const chat = createMockChatSession({ sendMessage });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const input = container.querySelector<HTMLInputElement>(
      ".sb-chat-view-input"
    )!;
    const sendButton =
      container.querySelector<HTMLButtonElement>(".sb-chat-view-send")!;

    typeIntoInput(input, "Hello");
    expect(sendButton.disabled).toBe(false);

    await act(async () => {
      submitForm(container);
      await Promise.resolve();
    });

    expect(sendButton.disabled).toBe(true);
  });

  it("shows an error message when sending fails", async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error("Network error"));
    const chat = createMockChatSession({ sendMessage });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    typeIntoInput(
      container.querySelector<HTMLInputElement>(".sb-chat-view-input")!,
      "Hello"
    );

    await act(async () => {
      submitForm(container);
      await Promise.resolve();
    });

    const errorEl = container.querySelector(
      '.sb-chat-view-error[role="alert"]'
    );
    expect(errorEl).not.toBeNull();
    expect(errorEl?.textContent).toBe("Network error");
  });

  it("clears the error message after a subsequent successful send", async () => {
    const sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(undefined);
    const chat = createMockChatSession({ sendMessage });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const input = container.querySelector<HTMLInputElement>(
      ".sb-chat-view-input"
    )!;

    typeIntoInput(input, "Hello");
    await act(async () => {
      submitForm(container);
      await Promise.resolve();
    });
    expect(container.querySelector(".sb-chat-view-error")).not.toBeNull();

    typeIntoInput(input, "Hello again");
    await act(async () => {
      submitForm(container);
      await Promise.resolve();
    });
    expect(container.querySelector(".sb-chat-view-error")).toBeNull();
  });

  // ─── Mention picker ──────────────────────────────────────────────────────────

  it("opens the mention picker when @ is typed", () => {
    const alice = createMockParticipant({ id: "p-alice", name: "Alice" });
    const chat = createMockChatSession({ participants: signal([alice]) });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    typeIntoInput(
      container.querySelector<HTMLInputElement>(".sb-chat-view-input")!,
      "@"
    );

    expect(
      container.querySelector('.sb-chat-view-mention-picker[role="listbox"]')
    ).not.toBeNull();
  });

  it("does not open the mention picker when @ appears mid-word", () => {
    const alice = createMockParticipant({ id: "p-alice", name: "Alice" });
    const chat = createMockChatSession({ participants: signal([alice]) });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    typeIntoInput(
      container.querySelector<HTMLInputElement>(".sb-chat-view-input")!,
      "foo@"
    );

    expect(container.querySelector(".sb-chat-view-mention-picker")).toBeNull();
  });

  it("filters mention suggestions by the typed query", () => {
    const alice = createMockParticipant({ id: "p-alice", name: "Alice" });
    const bob = createMockParticipant({ id: "p-bob", name: "Bob" });
    const chat = createMockChatSession({
      participants: signal([alice, bob]),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    typeIntoInput(
      container.querySelector<HTMLInputElement>(".sb-chat-view-input")!,
      "@ali"
    );

    const itemNames = Array.from(
      container.querySelectorAll(".sb-chat-view-mention-picker-name")
    ).map((el) => el.textContent);

    expect(itemNames).toContain("Alice");
    expect(itemNames).not.toContain("Bob");
  });

  it("inserts the mention text when a suggestion is clicked", () => {
    const alice = createMockParticipant({ id: "p-alice", name: "Alice" });
    const chat = createMockChatSession({
      participants: signal([alice]),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const input = container.querySelector<HTMLInputElement>(
      ".sb-chat-view-input"
    )!;
    typeIntoInput(input, "@");

    const aliceButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        ".sb-chat-view-mention-picker-item"
      )
    ).find(
      (btn) =>
        btn.querySelector(".sb-chat-view-mention-picker-name")?.textContent ===
        "Alice"
    )!;

    act(() => {
      aliceButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(input.value).toBe("@Alice ");
  });

  it("cycles through mention suggestions with ArrowDown and ArrowUp", () => {
    const alice = createMockParticipant({ id: "p-alice", name: "Alice" });
    const bob = createMockParticipant({ id: "p-bob", name: "Bob" });
    const chat = createMockChatSession({
      participants: signal([alice, bob]),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const input = container.querySelector<HTMLInputElement>(
      ".sb-chat-view-input"
    )!;
    typeIntoInput(input, "@");

    // Initially @everyone (index 0) is selected
    let items = container.querySelectorAll(".sb-chat-view-mention-picker-item");
    expect(items[0]?.getAttribute("aria-selected")).toBe("true");

    // ArrowDown → Alice (index 1)
    pressKey(input, "ArrowDown");
    items = container.querySelectorAll(".sb-chat-view-mention-picker-item");
    expect(items[1]?.getAttribute("aria-selected")).toBe("true");

    // ArrowUp → back to @everyone (index 0)
    pressKey(input, "ArrowUp");
    items = container.querySelectorAll(".sb-chat-view-mention-picker-item");
    expect(items[0]?.getAttribute("aria-selected")).toBe("true");
  });

  it("selects the active suggestion when Enter is pressed", () => {
    const alice = createMockParticipant({ id: "p-alice", name: "Alice" });
    const chat = createMockChatSession({
      participants: signal([alice]),
    });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const input = container.querySelector<HTMLInputElement>(
      ".sb-chat-view-input"
    )!;
    typeIntoInput(input, "@");

    // Move past @everyone to Alice
    pressKey(input, "ArrowDown");
    pressKey(input, "Enter");

    expect(input.value).toBe("@Alice ");
  });

  it("closes the mention picker when Escape is pressed", () => {
    const alice = createMockParticipant({ id: "p-alice", name: "Alice" });
    const chat = createMockChatSession({ participants: signal([alice]) });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    const input = container.querySelector<HTMLInputElement>(
      ".sb-chat-view-input"
    )!;
    typeIntoInput(input, "@");
    expect(
      container.querySelector(".sb-chat-view-mention-picker")
    ).not.toBeNull();

    pressKey(input, "Escape");
    expect(container.querySelector(".sb-chat-view-mention-picker")).toBeNull();
  });

  // ─── Component lifecycle ─────────────────────────────────────────────────────

  it("clears the typing status when the component unmounts", () => {
    const setTypingStatus = vi.fn();
    const chat = createMockChatSession({ setTypingStatus });
    const state = createMockState();

    act(() => {
      render(<ChatView chat={chat} state={state} />, container);
    });

    setTypingStatus.mockClear();

    act(() => {
      render(null, container);
    });

    expect(setTypingStatus).toHaveBeenCalledWith(false);
  });
});
