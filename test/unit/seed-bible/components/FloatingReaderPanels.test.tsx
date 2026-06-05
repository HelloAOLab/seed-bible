import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  ChatList,
  FloatingChatPanel,
  FloatingReaderPanels,
} from "@packages/seed-bible/seed-bible/components/FloatingReaderPanels";
import type {
  ChatSession,
  TextChatMessage,
  UserChatParticipant,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";

jest.mock("seed-bible.i18n.I18nManager", () => ({
  useI18n: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
    language: "en",
  }),
}));

jest.mock("@packages/seed-bible/seed-bible/components/ChatView", () => {
  const actual = jest.requireActual(
    "@packages/seed-bible/seed-bible/components/ChatView"
  );
  return {
    ...actual,
    ChatView: ({ chat }: { chat: { id: string } }) => (
      <div className="sb-chat-view-stub" data-chat-id={chat.id} />
    ),
  };
});

jest.mock("seed-bible.components.ContextMenu", () => ({
  closeContextMenus: jest.fn(),
  ContextMenuItem: ({
    children,
    onClick,
    className,
  }: {
    children: ComponentChildren;
    onClick?: () => void;
    className?: string;
  }) => (
    <button className={className} onClick={onClick} role="menuitem">
      {children}
    </button>
  ),
  ContextMenuWithButton: ({
    children,
    buttonClassName,
    anchorClassName,
    onClick,
    icon,
    ...props
  }: {
    children: ComponentChildren;
    buttonClassName?: string;
    anchorClassName?: string;
    onClick?: () => void;
    icon?: string;
  }) => (
    <div className={anchorClassName}>
      <button className={buttonClassName} onClick={onClick} {...props}>
        {icon}
      </button>
      <div>{children}</div>
    </div>
  ),
}));

describe("FloatingReaderPanels", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    jest.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    jest.useRealTimers();
  });

  it("creates a local chat from a provider and selects it", async () => {
    const state = await createTestSeedBibleState();
    state.chats.createLocalSession();
    state.chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: jest.fn(),
    });
    state.chats.isOpen.value = true;

    act(() => {
      render(<FloatingReaderPanels state={state} />, container);
    });

    const createButton = container.querySelector(
      ".sb-floating-chat-list-create-button"
    ) as HTMLButtonElement | null;
    expect(createButton).not.toBeNull();

    const providerOption = container.querySelector(
      ".sb-floating-chat-list-create-item"
    ) as HTMLButtonElement | null;
    expect(providerOption).not.toBeNull();
    expect(providerOption?.textContent).toBe("Helper AI");

    await act(async () => {
      providerOption?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(state.chats.chats.value).toHaveLength(2);
    expect(state.chats.chats.value[1]?.participants.value).toContainEqual(
      expect.objectContaining({
        id: "provider-1",
      })
    );
    expect(state.chats.selectedChat.value).not.toBeNull();
    expect(state.chats.selectedChat.value?.participants.value).toContainEqual(
      expect.objectContaining({
        id: "provider-1",
      })
    );
  });

  it("shows the create button when providers are available", async () => {
    const state = await createTestSeedBibleState();
    state.chats.createLocalSession();
    state.chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: jest.fn(),
    });
    state.chats.isOpen.value = true;

    await act(async () => {
      render(<FloatingReaderPanels state={state} />, container);
      await Promise.resolve();
    });

    expect(
      container.querySelector(".sb-floating-chat-list-create-anchor")
    ).not.toBeNull();
    expect(
      container.querySelector(".sb-floating-chat-list-create-button")
    ).not.toBeNull();
  });

  it("hides the create button when no providers are available", async () => {
    const state = await createTestSeedBibleState();
    state.chats.createLocalSession();
    state.chats.isOpen.value = true;

    await act(async () => {
      render(<FloatingReaderPanels state={state} />, container);
      await Promise.resolve();
    });

    expect(
      container.querySelector(".sb-floating-chat-list-create-button")
    ).toBeNull();
  });
});

function createMockParticipant(
  overrides: Partial<UserChatParticipant> = {}
): UserChatParticipant {
  return {
    id: "participant-1",
    name: "Test User",
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
  overrides: Partial<TextChatMessage> = {}
): TextChatMessage {
  return {
    id: "msg-1",
    authors: ["participant-1"],
    timeMs: 1_000_000,
    targets: [],
    type: "text",
    text: "Hello world",
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
    markAsRead: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue(undefined),
    setTypingStatus: jest.fn(),
    participants: signal([]),
    totalParticipants: signal([]),
    inactiveParticipants: signal([]),
    availableParticipants: signal([]),
    typingParticipants: signal([]),
    addParticipant: jest.fn(),
    removeParticipant: jest.fn(),
    getMessageAuthors: jest.fn().mockReturnValue([]),
    ...overrides,
  };
}

function createMockChatListState(
  overrides: {
    providers?: SeedBibleState["chats"]["providers"]["value"];
    selectChat?: jest.Mock;
  } = {}
): SeedBibleState {
  return {
    chats: {
      providers: signal(overrides.providers ?? []),
      selectChat: overrides.selectChat ?? jest.fn(),
    },
  } as unknown as SeedBibleState;
}

describe("ChatList", () => {
  let container: HTMLDivElement;
  let originalDateTime: unknown;

  beforeEach(() => {
    jest.useFakeTimers();
    originalDateTime = (globalThis as Record<string, unknown>).DateTime;
    (globalThis as Record<string, unknown>).DateTime = {
      fromMillis: () => ({
        setLocale: () => ({ toRelative: () => "just now" }),
      }),
    };
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    (globalThis as Record<string, unknown>).DateTime = originalDateTime;
    jest.useRealTimers();
  });

  it("shows NoProvidersAvailable when there are no chats and no providers", () => {
    const state = createMockChatListState();

    act(() => {
      render(<ChatList chats={[]} state={state} />, container);
    });

    const empty = container.querySelector(".sb-floating-chat-empty");
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toContain("No chat providers are available");
  });

  it("shows NoChatsAvailable when there are no chats but providers exist", () => {
    const state = createMockChatListState({
      providers: [
        {
          id: "provider-1",
          name: "Helper AI",
          supportsSharedChats: false,
          generateResponse: jest.fn(),
        },
      ],
    });

    act(() => {
      render(<ChatList chats={[]} state={state} />, container);
    });

    const empty = container.querySelector(".sb-floating-chat-empty");
    expect(empty).not.toBeNull();
    expect(empty?.textContent).toContain("You have no chats");
  });

  it("renders one list item per chat", () => {
    const state = createMockChatListState();
    const chats = [
      createMockChatSession({ id: "chat-1" }),
      createMockChatSession({ id: "chat-2" }),
    ];

    act(() => {
      render(<ChatList chats={chats} state={state} />, container);
    });

    expect(
      container.querySelectorAll(".sb-floating-chat-list-item")
    ).toHaveLength(2);
  });

  it("shows the chat title derived from the participant's name", () => {
    const participant = createMockParticipant({ name: "Alice" });
    const chat = createMockChatSession({
      participants: signal([participant]),
    });
    const state = createMockChatListState();

    act(() => {
      render(<ChatList chats={[chat]} state={state} />, container);
    });

    const title = container.querySelector(".sb-floating-chat-list-item-title");
    expect(title?.textContent).toBe("Alice");
  });

  it("shows the message preview with author and text", () => {
    const participant = createMockParticipant({ name: "Alice" });
    const message = createMockMessage({ text: "Hello world" });
    const chat = createMockChatSession({
      messages: signal([message]),
      participants: signal([participant]),
      getMessageAuthors: jest.fn().mockReturnValue([participant]),
    });
    const state = createMockChatListState();

    act(() => {
      render(<ChatList chats={[chat]} state={state} />, container);
    });

    const preview = container.querySelector(
      ".sb-floating-chat-list-item-preview"
    );
    expect(preview?.textContent).toBe("Alice: Hello world");
  });

  it("shows 'No messages yet' preview for a chat with no messages", () => {
    const chat = createMockChatSession({ messages: signal([]) });
    const state = createMockChatListState();

    act(() => {
      render(<ChatList chats={[chat]} state={state} />, container);
    });

    const preview = container.querySelector(
      ".sb-floating-chat-list-item-preview"
    );
    expect(preview?.textContent).toBe("No messages yet");
  });

  it("shows a timestamp when the chat has messages", () => {
    const message = createMockMessage();
    const chat = createMockChatSession({ messages: signal([message]) });
    const state = createMockChatListState();

    act(() => {
      render(<ChatList chats={[chat]} state={state} />, container);
    });

    expect(
      container.querySelector(".sb-floating-chat-list-item-time")
    ).not.toBeNull();
  });

  it("hides the timestamp when the chat has no messages", () => {
    const chat = createMockChatSession({ messages: signal([]) });
    const state = createMockChatListState();

    act(() => {
      render(<ChatList chats={[chat]} state={state} />, container);
    });

    expect(
      container.querySelector(".sb-floating-chat-list-item-time")
    ).toBeNull();
  });

  it("hides the unread badge when unread count is 0", () => {
    const chat = createMockChatSession({ unreadMessages: signal([]) });
    const state = createMockChatListState();

    act(() => {
      render(<ChatList chats={[chat]} state={state} />, container);
    });

    expect(
      container.querySelector(".sb-floating-chat-list-item-unread")
    ).toBeNull();
  });

  it("shows the unread count when there are unread messages", () => {
    const message = createMockMessage();
    const chat = createMockChatSession({
      unreadMessages: signal([message]),
    });
    const state = createMockChatListState();

    act(() => {
      render(<ChatList chats={[chat]} state={state} />, container);
    });

    const badge = container.querySelector(".sb-floating-chat-list-item-unread");
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("1");
  });

  it("shows '99+' when unread count exceeds 99", () => {
    const messages = Array.from({ length: 100 }, (_, i) =>
      createMockMessage({ id: `msg-${i}` })
    );
    const chat = createMockChatSession({ unreadMessages: signal(messages) });
    const state = createMockChatListState();

    act(() => {
      render(<ChatList chats={[chat]} state={state} />, container);
    });

    const badge = container.querySelector(".sb-floating-chat-list-item-unread");
    expect(badge?.textContent).toBe("99+");
  });

  it("calls selectChat with the chat id when a chat item is clicked", () => {
    const selectChat = jest.fn();
    const chat = createMockChatSession({ id: "chat-abc" });
    const state = createMockChatListState({ selectChat });

    act(() => {
      render(<ChatList chats={[chat]} state={state} />, container);
    });

    const item = container.querySelector(
      ".sb-floating-chat-list-item"
    ) as HTMLButtonElement | null;
    act(() => {
      item?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(selectChat).toHaveBeenCalledWith("chat-abc");
  });

  it("updates the list when a new chat is added via signal", () => {
    const chatsSignal = signal([createMockChatSession({ id: "chat-1" })]);
    const state = createMockChatListState();

    act(() => {
      render(<ChatList chats={chatsSignal.value} state={state} />, container);
    });

    expect(
      container.querySelectorAll(".sb-floating-chat-list-item")
    ).toHaveLength(1);

    act(() => {
      chatsSignal.value = [
        ...chatsSignal.value,
        createMockChatSession({ id: "chat-2" }),
      ];
      render(<ChatList chats={chatsSignal.value} state={state} />, container);
    });

    expect(
      container.querySelectorAll(".sb-floating-chat-list-item")
    ).toHaveLength(2);
  });
});

interface MockFloatingChatPanelResult {
  state: SeedBibleState;
  closeChatPanel: jest.Mock;
  selectChat: jest.Mock;
}

function createMockFloatingChatPanelState(
  opts: {
    isChatPanelOpen?: boolean;
    selectedChat?: ChatSession | null;
    chats?: ChatSession[];
  } = {}
): MockFloatingChatPanelResult {
  const closeChatPanel = jest.fn();
  const selectChat = jest.fn();
  const state = {
    sidebar: {
      isChatPanelOpen: signal(opts.isChatPanelOpen ?? true),
      closeChatPanel,
    },
    chats: {
      selectedChat: signal(opts.selectedChat ?? null),
      chats: signal(opts.chats ?? []),
      selectChat,
      providers: signal([]),
    },
  } as unknown as SeedBibleState;
  return { state, closeChatPanel, selectChat };
}

describe("FloatingChatPanel", () => {
  let container: HTMLDivElement;
  let originalDateTime: unknown;

  beforeEach(() => {
    jest.useFakeTimers();
    originalDateTime = (globalThis as Record<string, unknown>).DateTime;
    (globalThis as Record<string, unknown>).DateTime = {
      fromMillis: () => ({
        setLocale: () => ({ toRelative: () => "just now" }),
      }),
    };
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    (globalThis as Record<string, unknown>).DateTime = originalDateTime;
    jest.useRealTimers();
  });

  it("renders nothing when the panel is closed", () => {
    const { state } = createMockFloatingChatPanelState({
      isChatPanelOpen: false,
    });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    expect(container.querySelector(".sb-floating-chat-panel")).toBeNull();
  });

  it("renders the panel when open", () => {
    const { state } = createMockFloatingChatPanelState();

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    expect(container.querySelector(".sb-floating-chat-panel")).not.toBeNull();
  });

  it("shows ChatList when no chat is selected", () => {
    const { state } = createMockFloatingChatPanelState({ selectedChat: null });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    expect(
      container.querySelector(".sb-floating-chat-list-shell")
    ).not.toBeNull();
    expect(container.querySelector(".sb-chat-view-stub")).toBeNull();
  });

  it("shows ChatView when a chat is selected", () => {
    const chat = createMockChatSession();
    const { state } = createMockFloatingChatPanelState({ selectedChat: chat });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    expect(container.querySelector(".sb-chat-view-stub")).not.toBeNull();
    expect(container.querySelector(".sb-floating-chat-list-shell")).toBeNull();
  });

  it("shows the generic 'Chat' title and no back button when no chat is selected", () => {
    const { state } = createMockFloatingChatPanelState({ selectedChat: null });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    expect(container.querySelector(".sb-floating-chat-header-back")).toBeNull();
    expect(
      container.querySelector(".sb-floating-chat-header-title")?.textContent
    ).toBe("Chat");
  });

  it("shows the back button and chat title when a chat is selected", () => {
    const participant = createMockParticipant({ name: "Alice" });
    const chat = createMockChatSession({
      participants: signal([participant]),
    });
    const { state } = createMockFloatingChatPanelState({ selectedChat: chat });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    expect(
      container.querySelector(".sb-floating-chat-header-back")
    ).not.toBeNull();
    expect(
      container.querySelector(".sb-floating-chat-header-title")?.textContent
    ).toBe("Alice");
  });

  it("clicking the back button calls selectChat with null", () => {
    const chat = createMockChatSession();
    const { state, selectChat } = createMockFloatingChatPanelState({
      selectedChat: chat,
    });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    const backBtn = container.querySelector(
      ".sb-floating-chat-header-back"
    ) as HTMLButtonElement;
    act(() => {
      backBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(selectChat).toHaveBeenCalledWith(null);
  });

  it("a pointerdown outside the panel calls closeChatPanel", () => {
    const { state, closeChatPanel } = createMockFloatingChatPanelState();

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    const outsideEl = document.createElement("div");
    document.body.appendChild(outsideEl);
    act(() => {
      outsideEl.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    });
    outsideEl.remove();

    expect(closeChatPanel).toHaveBeenCalled();
  });

  it("pressing Escape calls closeChatPanel", () => {
    const { state, closeChatPanel } = createMockFloatingChatPanelState();

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });

    expect(closeChatPanel).toHaveBeenCalled();
  });

  it("shows the members button when a chat is selected", () => {
    const participant = createMockParticipant();
    const chat = createMockChatSession({
      participants: signal([participant]),
    });
    const { state } = createMockFloatingChatPanelState({ selectedChat: chat });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    expect(
      container.querySelector(".sb-floating-chat-header-members-button")
    ).not.toBeNull();
  });
});
