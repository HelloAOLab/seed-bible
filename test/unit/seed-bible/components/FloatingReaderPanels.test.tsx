import { render, type ComponentChildren } from "preact";
import { act } from "preact/test-utils";
import { signal } from "@preact/signals";
import {
  ChatList,
  FloatingChatPanel,
  FloatingReaderPanels,
} from "@packages/seed-bible/seed-bible/components/FloatingReaderPanels/FloatingReaderPanels";
import type {
  AIChatParticipant,
  ChatProvider,
  ChatSession,
  IdentifiedLocalChatContext,
  TextChatMessage,
  UserChatParticipant,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { AIProviderFunctionTool } from "@packages/seed-bible/seed-bible/managers/AIManager";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import { createTestSeedBibleState } from "../testUtils/createTestSeedBibleState";
import type { Mock } from "vitest";

vi.mock("@packages/seed-bible/seed-bible/i18n/I18nManager", async () => {
  const { mockI18nManager } = await import("../testUtils/mockI18n");
  return mockI18nManager();
});

vi.mock(
  "@packages/seed-bible/seed-bible/components/ChatView/ChatView",
  async () => {
    const actual = await vi.importActual(
      "@packages/seed-bible/seed-bible/components/ChatView/ChatView"
    );
    return {
      ...actual,
      ChatView: ({ chat }: { chat: { id: string } }) => (
        <div className="sb-chat-view-stub" data-chat-id={chat.id} />
      ),
    };
  }
);

vi.mock(
  "@packages/seed-bible/seed-bible/components/ContextMenu/ContextMenu",
  () => ({
    closeContextMenus: vi.fn(),
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
  })
);

describe("FloatingReaderPanels", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    container.remove();
    vi.useRealTimers();
  });

  it("creates a local chat from a provider and selects it", async () => {
    const state = await createTestSeedBibleState();
    state.chats.createLocalSession();
    state.chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
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
      generateResponse: vi.fn(),
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
    joinTimeMs: 0,
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
    context: signal({}),
    ...overrides,
  };
}

function createMockChatListState(
  overrides: {
    providers?: SeedBibleState["chats"]["providers"]["value"];
    selectChat?: Mock;
  } = {}
): SeedBibleState {
  return {
    chats: {
      providers: signal(overrides.providers ?? []),
      selectChat: overrides.selectChat ?? vi.fn(),
    },
  } as unknown as SeedBibleState;
}

describe("ChatList", () => {
  let container: HTMLDivElement;
  let originalDateTime: unknown;

  beforeEach(() => {
    vi.useFakeTimers();
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
    vi.useRealTimers();
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
          generateResponse: vi.fn(),
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

  it("shows a generic account icon for your own avatar when you are the only person in the chat", () => {
    const self = createMockParticipant({
      id: "self",
      name: "Me",
      isSelf: true,
    });
    const chat = createMockChatSession({
      participants: signal([self]),
      totalParticipants: signal([self]),
    });
    const state = createMockChatListState();

    act(() => {
      render(<ChatList chats={[chat]} state={state} />, container);
    });

    const cluster = container.querySelector(".sb-chat-list-avatar-cluster");
    expect(cluster?.querySelector(".sb-tab-user-icon-generic")).not.toBeNull();
    expect(cluster?.textContent).toContain("account_circle");
    expect(cluster?.querySelector(".sb-tab-user-icon-animal")).toBeNull();
  });

  it("shows the animal fallback for your own avatar when the other person is inactive", () => {
    const self = createMockParticipant({
      id: "self",
      name: "Me",
      isSelf: true,
    });
    const other = createMockParticipant({
      id: "other",
      name: "Alice",
      isSelf: false,
      isRemote: true,
      isActive: false,
    });
    const chat = createMockChatSession({
      participants: signal([self]),
      totalParticipants: signal([self, other]),
    });
    const state = createMockChatListState();

    act(() => {
      render(<ChatList chats={[chat]} state={state} />, container);
    });

    const cluster = container.querySelector(".sb-chat-list-avatar-cluster");
    expect(cluster?.querySelector(".sb-tab-user-icon-animal")).not.toBeNull();
    expect(cluster?.querySelector(".sb-tab-user-icon-generic")).toBeNull();
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
      getMessageAuthors: vi.fn().mockReturnValue([participant]),
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
    const selectChat = vi.fn();
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
  closeChatPanel: Mock;
  selectChat: Mock;
}

function createMockFloatingChatPanelState(
  opts: {
    isChatPanelOpen?: boolean;
    selectedChat?: ChatSession | null;
    chats?: ChatSession[];
    activeContexts?: IdentifiedLocalChatContext[];
    providers?: ChatProvider[];
  } = {}
): MockFloatingChatPanelResult {
  const closeChatPanel = vi.fn();
  const selectChat = vi.fn();
  const state = {
    sidebar: {
      isChatPanelOpen: signal(opts.isChatPanelOpen ?? true),
      closeChatPanel,
    },
    chats: {
      selectedChat: signal(opts.selectedChat ?? null),
      chats: signal(opts.chats ?? []),
      selectChat,
      providers: signal(opts.providers ?? []),
      activeContexts: signal(opts.activeContexts ?? []),
    },
  } as unknown as SeedBibleState;
  return { state, closeChatPanel, selectChat };
}

function createMockAIParticipant(
  overrides: Partial<AIChatParticipant> = {}
): AIChatParticipant {
  return {
    id: "ai-participant-1",
    name: "AI",
    isSelf: false,
    isAI: true,
    isRemote: false,
    isActive: true,
    joinTimeMs: 0,
    userId: null,
    connectionId: null,
    ownerParticipantId: "participant-1",
    providerId: "provider-1",
    ...overrides,
  };
}

function makeTool(name: string): AIProviderFunctionTool {
  return {
    name,
    type: "function",
    description: `${name} tool`,
    parameters: {} as AIProviderFunctionTool["parameters"],
    function: async () => "ok",
  };
}

describe("FloatingChatPanel", () => {
  let container: HTMLDivElement;
  let originalDateTime: unknown;

  beforeEach(() => {
    vi.useFakeTimers();
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
    vi.useRealTimers();
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

  it("shows no AI context button when there are no active contexts", () => {
    const { state } = createMockFloatingChatPanelState({ activeContexts: [] });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    expect(
      container.querySelector(".sb-floating-chat-header-ai-context-button")
    ).toBeNull();
  });

  it("shows the AI context button with no count badge for a single active context", () => {
    const { state } = createMockFloatingChatPanelState({
      activeContexts: [
        {
          id: "playlist",
          label: { key: "playlist-editor", defaultValue: "Playlist Editor" },
          tools: [makeTool("editPlaylist")],
        },
      ],
    });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    const button = container.querySelector(
      ".sb-floating-chat-header-ai-context-button"
    );
    expect(button).not.toBeNull();
    expect(button?.textContent).not.toMatch(/\d/);
  });

  it("shows a count badge on the AI context button when more than one context is active", () => {
    const { state } = createMockFloatingChatPanelState({
      activeContexts: [
        {
          id: "playlist",
          label: { key: "playlist-editor", defaultValue: "Playlist Editor" },
          tools: [makeTool("editPlaylist")],
        },
        {
          id: "other",
          label: "Other Context",
          tools: [],
        },
      ],
    });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    const button = container.querySelector(
      ".sb-floating-chat-header-ai-context-button"
    );
    expect(button?.textContent).toContain("2");
  });

  it("lists each active context's label and tool count in the AI context menu", () => {
    const { state } = createMockFloatingChatPanelState({
      activeContexts: [
        {
          id: "playlist",
          label: { key: "playlist-editor", defaultValue: "Playlist Editor" },
          tools: [makeTool("editPlaylist"), makeTool("insertPlaylistItem")],
        },
      ],
    });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    const item = container.querySelector(".sb-floating-chat-ai-context-item");
    expect(item?.textContent).toContain("Playlist Editor");
    expect(item?.textContent).toContain("2 tools");
  });

  it("hides the AI context button when the selected chat's only AI participant doesn't support tool calling", () => {
    const chat = createMockChatSession({
      participants: signal([
        createMockAIParticipant({ providerId: "provider-1" }),
      ]),
    });
    const { state } = createMockFloatingChatPanelState({
      selectedChat: chat,
      providers: [
        {
          id: "provider-1",
          name: "No Tools",
          supportsSharedChats: false,
          supportsToolCalling: false,
        } as ChatProvider,
      ],
      activeContexts: [
        {
          id: "playlist",
          label: { key: "playlist-editor", defaultValue: "Playlist Editor" },
          tools: [makeTool("editPlaylist")],
        },
      ],
    });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    expect(
      container.querySelector(".sb-floating-chat-header-ai-context-button")
    ).toBeNull();
  });

  it("shows the AI context button when the selected chat has a tool-calling AI participant", () => {
    const chat = createMockChatSession({
      participants: signal([
        createMockAIParticipant({ providerId: "provider-1" }),
      ]),
    });
    const { state } = createMockFloatingChatPanelState({
      selectedChat: chat,
      providers: [
        {
          id: "provider-1",
          name: "Tool User",
          supportsSharedChats: false,
          supportsToolCalling: true,
        } as ChatProvider,
      ],
      activeContexts: [
        {
          id: "playlist",
          label: { key: "playlist-editor", defaultValue: "Playlist Editor" },
          tools: [makeTool("editPlaylist")],
        },
      ],
    });

    act(() => {
      render(<FloatingChatPanel state={state} />, container);
    });

    expect(
      container.querySelector(".sb-floating-chat-header-ai-context-button")
    ).not.toBeNull();
  });
});
