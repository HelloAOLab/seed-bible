import { signal } from "@preact/signals";
import {
  createChatsManager,
  resolveMessageTargets,
  type ChatMessage,
  type ChatMessageOptions,
  type ChatParticipant,
  type UserChatParticipant,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { AIProviderFunctionTool } from "@packages/seed-bible/seed-bible/managers/AIManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { I18nManager } from "@packages/seed-bible/seed-bible/i18n/I18nManager";
import type { i18n } from "i18next";
import {
  getUserAnimalVisual,
  type BibleReadingSession,
} from "@packages/seed-bible/seed-bible/managers/SessionsManager";

// ChatsManager only reads `i18nManager.i18n` and `i18n.t` (via translateTitle,
// which returns plain string titles unchanged), so a passthrough mock keeps the
// existing behavior of these tests intact.
const mockI18n = { t: (key: string) => key } as unknown as i18n;
const mockI18nManager = { i18n: mockI18n } as unknown as I18nManager;

// Builds a minimal AIProviderFunctionTool for asserting that custom context
// flows through to a chat provider. The `function` is never invoked here.
function makeTool(name: string): AIProviderFunctionTool {
  return {
    name,
    type: "function",
    description: `${name} tool`,
    parameters: {} as AIProviderFunctionTool["parameters"],
    function: async () => "ok",
  };
}

// ChatsManager generates ids via `v4` from the "uuid" package, so mock the
// module to produce deterministic, sequential ids.
const uuidState = vi.hoisted(() => ({ count: 0 }));
vi.mock("uuid", () => ({
  v4: () => `msg-${++uuidState.count}`,
}));

class MockSharedArray<T> {
  private values: T[];
  private listeners = new Set<() => void>();

  constructor(initialValues: T[] = []) {
    this.values = [...initialValues];
  }

  toArray(): T[] {
    return [...this.values];
  }

  push(...items: T[]): void {
    this.values.push(...items);
    this.emitChange();
  }

  emitChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  readonly changes = {
    subscribe: (listener: () => void) => {
      this.listeners.add(listener);
      return {
        unsubscribe: () => {
          this.listeners.delete(listener);
        },
      };
    },
  };
}

class MockSharedMap<T> {
  private values = new Map<string, T>();
  private listeners = new Set<() => void>();

  set(key: string, value: T): void {
    this.values.set(key, value);
    this.emitChange();
  }

  get(key: string): T | undefined {
    return this.values.get(key);
  }

  delete(key: string): void {
    this.values.delete(key);
    this.emitChange();
  }

  forEach(callback: (value: T, key: string) => void): void {
    this.values.forEach((value, key) => callback(value, key));
  }

  emitChange(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  readonly changes = {
    subscribe: (listener: () => void) => {
      this.listeners.add(listener);
      return {
        unsubscribe: () => {
          this.listeners.delete(listener);
        },
      };
    },
  };
}

function createLoginManagerMock() {
  const userId = signal<string | null>(null);
  const profile = signal<{ name: string } | null>(null);

  const loginManager = {
    userId,
    profile,
  } as LoginManager;

  return {
    userId,
    profile,
    loginManager,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve,
    reject,
  };
}

function createSharedSessionMock(options?: {
  initialChats?: unknown[];
  connectedUsers?: Array<Omit<UserChatParticipant, "joinTimeMs">>;
  connectedSessionUsers?: Array<{
    userId: string | null;
    connectionId: string | null;
    name: string | null;
    isSelf: boolean;
  }>;
  currentUserId?: string | null;
}) {
  const sharedChats = new MockSharedArray<unknown>(options?.initialChats ?? []);
  const sharedChatProviders = new MockSharedMap<unknown>();
  const sharedParticipantAliases = new MockSharedMap<unknown>();
  const sharedTyping = new MockSharedMap<unknown>();
  const mappedConnectedUsers = options?.connectedUsers
    ? options.connectedUsers.map((user) => ({
        userId: user.id,
        connectionId: `conn-${user.id}`,
        profile: user.name ? { name: user.name } : null,
        isSelf: user.isSelf,
        isActive: user.isActive,
        color: "#000000",
        sessionId: null,
        joinedAtMs: Date.now(),
      }))
    : [];
  const explicitConnectedUsers = (options?.connectedSessionUsers ?? []).map(
    (user) => ({
      userId: user.userId,
      connectionId: user.connectionId,
      profile: user.name ? { name: user.name } : null,
      isSelf: user.isSelf,
      isActive: true,
      color: "#000000",
      sessionId: null,
      joinedAtMs: Date.now(),
    })
  );
  const connectedUsers = signal(
    options?.connectedSessionUsers
      ? explicitConnectedUsers
      : mappedConnectedUsers
  );
  const allUsers = signal(
    connectedUsers.value.map((user) => ({
      ...user,
      isActive: user.isActive ?? true,
    }))
  );

  const currentUser = signal(
    options?.currentUserId
      ? {
          userId: options.currentUserId,
          connectionId: `conn-${options.currentUserId}`,
          profile: null,
          isSelf: true,
          color: "#000000",
          sessionId: null,
        }
      : null
  );

  const session = {
    id: "session-1",
    document: {
      getArray: vi.fn().mockReturnValue(sharedChats),
      getMap: vi.fn().mockImplementation((name: string) => {
        if (name === "chat_providers") {
          return sharedChatProviders;
        }
        if (name === "chat_participant_aliases") {
          return sharedParticipantAliases;
        }
        if (name === "chat_typing") {
          return sharedTyping;
        }
        return new MockSharedMap<unknown>();
      }),
      transact: (callback: () => void) => callback(),
    },
    connectedUsers,
    allUsers,
    currentUser,
  } as unknown as BibleReadingSession;

  return {
    session,
    sharedChats,
    sharedChatProviders,
    sharedParticipantAliases,
    sharedTyping,
    connectedUsers,
    allUsers,
    currentUser,
  };
}

describe("createChatsManager", () => {
  beforeEach(() => {
    uuidState.count = 0;
    vi.spyOn(Date, "now").mockReturnValue(1_717_000_000_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("createLocalSession() derives local participant from login profile/user id", () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    expect(session.participants.value).toEqual([
      {
        id: "user-1",
        userId: "user-1",
        connectionId: null,
        profile: { name: "Alice" },
        name: "Alice",
        isSelf: true,
        isAI: false,
        isRemote: false,
        isActive: true,
        visual: getUserAnimalVisual("user-1"),
        joinTimeMs: 1_717_000_000_000,
      },
    ]);
  });

  it("tracks created chats in creation order", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const { session: sharedReadingSession } = createSharedSessionMock({
      currentUserId: "shared-user",
    });

    expect(chats.chats.value).toEqual([]);

    const localChat = chats.createLocalSession();
    const sharedChat = chats.createSharedSession(sharedReadingSession);

    expect(chats.chats.value).toEqual([localChat, sharedChat]);
  });

  it("tracks multiple created local chats as distinct sessions", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);

    const firstChat = chats.createLocalSession();
    const secondChat = chats.createLocalSession();

    expect(chats.chats.value).toHaveLength(2);
    expect(chats.chats.value[0]).toBe(firstChat);
    expect(chats.chats.value[1]).toBe(secondChat);
    expect(firstChat).not.toBe(secondChat);
  });

  it("createLocalSession() exposes lastMessageRead and markAsRead()", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    expect(session.lastMessageRead.value).toBeNull();

    await session.sendMessage({
      type: "text",
      text: "hello",
    });

    expect(session.lastMessageRead.value).toBeNull();

    session.markAsRead();

    expect(session.lastMessageRead.value).toBe("msg-2");
  });

  it("markAsRead(messageId) advances lastMessageRead to the given message when it is more recent", () => {
    const { loginManager } = createLoginManagerMock();
    const { session, sharedChats } = createSharedSessionMock();

    sharedChats.push({
      id: "m1",
      authors: [],
      targets: [],
      timeMs: 1,
      type: "text",
      text: "a",
    });
    sharedChats.push({
      id: "m2",
      authors: [],
      targets: [],
      timeMs: 2,
      type: "text",
      text: "b",
    });
    sharedChats.push({
      id: "m3",
      authors: [],
      targets: [],
      timeMs: 3,
      type: "text",
      text: "c",
    });

    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    chatSession.markAsRead("m1");
    expect(chatSession.lastMessageRead.value).toBe("m1");

    chatSession.markAsRead("m3");
    expect(chatSession.lastMessageRead.value).toBe("m3");
  });

  it("markAsRead(messageId) does not retreat lastMessageRead to an older message", () => {
    const { loginManager } = createLoginManagerMock();
    const { session, sharedChats } = createSharedSessionMock();

    sharedChats.push({
      id: "m1",
      authors: [],
      targets: [],
      timeMs: 1,
      type: "text",
      text: "a",
    });
    sharedChats.push({
      id: "m2",
      authors: [],
      targets: [],
      timeMs: 2,
      type: "text",
      text: "b",
    });
    sharedChats.push({
      id: "m3",
      authors: [],
      targets: [],
      timeMs: 3,
      type: "text",
      text: "c",
    });

    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    chatSession.markAsRead("m3");
    chatSession.markAsRead("m1");

    expect(chatSession.lastMessageRead.value).toBe("m3");
  });

  it("markAsRead(messageId) is a no-op when the message id is not found", () => {
    const { loginManager } = createLoginManagerMock();
    const { session, sharedChats } = createSharedSessionMock();

    sharedChats.push({
      id: "m1",
      authors: [],
      targets: [],
      timeMs: 1,
      type: "text",
      text: "a",
    });

    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    chatSession.markAsRead("unknown-id");

    expect(chatSession.lastMessageRead.value).toBeNull();
  });

  it("tracks unreadMessages and wasMentioned across chats", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const { session, sharedChats } = createSharedSessionMock({
      currentUserId: "self-user",
      connectedUsers: [
        {
          id: "self-user",
          userId: "self-user",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("self-user"),
        },
        {
          id: "u1",
          userId: "u1",
          connectionId: null,
          name: "Alpha",
          isSelf: false,
          isAI: false,
          isRemote: true,
          isActive: true,
          visual: getUserAnimalVisual("u1"),
        },
      ],
    });

    const chatSession = chats.createSharedSession(session);

    expect(chats.numberOfUnreadMessages.value).toBe(0);
    expect(chats.wasMentioned.value).toBe(false);

    sharedChats.push({
      id: "m1",
      authors: ["u1"],
      targets: [],
      timeMs: 1,
      type: "text",
      text: "hello",
    });

    expect(chats.numberOfUnreadMessages.value).toBe(1);
    expect(chats.wasMentioned.value).toBe(false);

    sharedChats.push({
      id: "m2",
      authors: ["u1"],
      targets: ["self-user"],
      timeMs: 2,
      type: "text",
      text: "hi @self-user",
    });

    expect(chats.numberOfUnreadMessages.value).toBe(2);
    expect(chats.wasMentioned.value).toBe(true);

    chatSession.markAsRead();

    expect(chats.numberOfUnreadMessages.value).toBe(0);
    expect(chats.wasMentioned.value).toBe(false);
  });

  it("does not automatically mark selected chat as read when chat is closed", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const { session, sharedChats } = createSharedSessionMock({
      currentUserId: "self-user",
      connectedUsers: [
        {
          id: "self-user",
          userId: "self-user",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("self-user"),
        },
        {
          id: "u1",
          userId: "u1",
          connectionId: null,
          name: "Alpha",
          isSelf: false,
          isAI: false,
          isRemote: true,
          isActive: true,
          visual: getUserAnimalVisual("u1"),
        },
      ],
    });
    const chatSession = chats.createSharedSession(session);

    chats.selectChat(chatSession.id);
    chats.isOpen.value = false;

    sharedChats.push({
      id: "m1",
      authors: ["u1"],
      targets: ["self-user"],
      timeMs: 1,
      type: "text",
      text: "mention",
    });

    expect(chatSession.lastMessageRead.value).toBe(null);
    expect(chats.numberOfUnreadMessages.value).toBe(1);
    expect(chats.wasMentioned.value).toBe(true);
  });

  it("resolveMessageTargets() matches by participant id", () => {
    const participants: ChatParticipant[] = [
      {
        id: "user-1",
        userId: "user-1",
        connectionId: null,
        name: "Alice",
        isSelf: true,
        isAI: false,
        isRemote: false,
        isActive: true,
        visual: getUserAnimalVisual("user-1"),
        joinTimeMs: 0,
      },
      {
        id: "provider-1",
        providerId: "provider-1",
        ownerParticipantId: "user-1",
        userId: null,
        connectionId: null,
        name: "Helper AI",
        isSelf: false,
        isAI: true,
        isRemote: false,
        isActive: true,
        joinTimeMs: 0,
      },
    ];

    expect(
      resolveMessageTargets(participants, "Hi @provider-1", mockI18n)
    ).toEqual([participants[1]!]);
  });

  it("resolveMessageTargets() matches by partial participant id", () => {
    const participants: ChatParticipant[] = [
      {
        id: "user-1",
        userId: "user-1",
        connectionId: null,
        name: "Alice",
        isSelf: true,
        isAI: false,
        isRemote: false,
        isActive: true,
        visual: getUserAnimalVisual("user-1"),
        joinTimeMs: 0,
      },
      {
        id: "d7d90348-fc03-4272-b7c1-b565d968bb5c",
        providerId: "provider-1",
        ownerParticipantId: "user-1",
        userId: null,
        connectionId: null,
        name: "Helper AI",
        isSelf: false,
        isAI: true,
        isRemote: false,
        isActive: true,
        joinTimeMs: 0,
      },
    ];

    expect(resolveMessageTargets(participants, "Hi @d7d903", mockI18n)).toEqual(
      [participants[1]!]
    );
  });

  it("resolveMessageTargets() matches remote non-AI participants by name", () => {
    const participants: ChatParticipant[] = [
      {
        id: "u1",
        userId: "u1",
        connectionId: null,
        name: "Alpha",
        isSelf: false,
        isAI: false,
        isRemote: true,
        isActive: true,
        visual: getUserAnimalVisual("u1"),
        joinTimeMs: 0,
      },
      {
        id: "u2",
        providerId: "u2",
        ownerParticipantId: "user-1",
        userId: null,
        connectionId: null,
        name: "Alpha",
        isSelf: false,
        isAI: true,
        isRemote: true,
        isActive: true,
        joinTimeMs: 0,
      },
    ];

    expect(resolveMessageTargets(participants, "Hi @Alpha", mockI18n)).toEqual([
      participants[0]!,
    ]);
  });

  it("resolveMessageTargets() matches local AI participants by name", () => {
    const participants: ChatParticipant[] = [
      {
        id: "provider-1",
        providerId: "provider-1",
        ownerParticipantId: "user-1",
        userId: null,
        connectionId: null,
        name: "Helper AI",
        isSelf: false,
        isAI: true,
        isRemote: false,
        isActive: true,
        joinTimeMs: 0,
      },
      {
        id: "user-1",
        userId: "user-1",
        connectionId: null,
        name: "Helper AI",
        isSelf: false,
        isAI: false,
        isRemote: false,
        isActive: true,
        visual: getUserAnimalVisual("user-1"),
        joinTimeMs: 0,
      },
    ];

    expect(
      resolveMessageTargets(participants, "Hi @Helper AI", mockI18n)
    ).toEqual([participants[0]!]);
  });

  it("resolveMessageTargets() does not match local non-AI or remote AI by name", () => {
    const participants: ChatParticipant[] = [
      {
        id: "user-1",
        userId: "user-1",
        connectionId: null,
        name: "Alpha",
        isSelf: false,
        isAI: false,
        isRemote: false,
        isActive: true,
        visual: getUserAnimalVisual("user-1"),
        joinTimeMs: 0,
      },
      {
        id: "provider-1",
        providerId: "provider-1",
        ownerParticipantId: "user-1",
        userId: null,
        connectionId: null,
        name: "Alpha",
        isSelf: false,
        isAI: true,
        isRemote: true,
        isActive: true,
        joinTimeMs: 0,
      },
    ];

    expect(resolveMessageTargets(participants, "Hi @Alpha", mockI18n)).toEqual(
      []
    );
  });

  it("resolveMessageTargets() dedupes repeated and overlapping matches", () => {
    const participants: ChatParticipant[] = [
      {
        id: "user-1",
        userId: "user-1",
        connectionId: null,
        name: "Alpha",
        isSelf: false,
        isAI: false,
        isRemote: true,
        isActive: true,
        visual: getUserAnimalVisual("user-1"),
        joinTimeMs: 0,
      },
    ];

    expect(
      resolveMessageTargets(participants, "@user-1 @Alpha @user-1", mockI18n)
    ).toEqual([participants[0]!]);
  });

  it("createLocalSession() updates participant when login profile changes", () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    userId.value = "user-2";
    profile.value = { name: "Bob" };

    expect(session.participants.value[0]).toEqual({
      id: "user-2",
      userId: "user-2",
      connectionId: null,
      profile: { name: "Bob" },
      name: "Bob",
      isSelf: true,
      isAI: false,
      isRemote: false,
      isActive: true,
      visual: getUserAnimalVisual("user-2"),
      joinTimeMs: 1_717_000_000_000,
    });
  });

  it("createLocalSession() stores messages in a local array and resolves message author", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-3";
    profile.value = { name: "Cara" };

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    await session.sendMessage({
      type: "text",
      text: "Hello local",
    });

    expect(session.messages.value).toHaveLength(1);
    expect(session.messages.value[0]).toMatchObject({
      id: "msg-2",
      authors: ["user-3"],
      targets: [],
      timeMs: 1_717_000_000_000,
      type: "text",
      text: "Hello local",
    });
    expect(
      session.getMessageAuthors(session.messages.value[0] as ChatMessage)
    ).toEqual([session.participants.value[0]]);
  });

  it("createLocalSession() resolves old local author id to current participant after login", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    await session.sendMessage({
      type: "text",
      text: "Sent while anonymous",
    });

    const firstMessage = session.messages.value[0] as ChatMessage;
    expect(firstMessage.authors).toEqual(["local-user"]);

    userId.value = "user-1";
    profile.value = { name: "Alice" };

    expect(session.getMessageAuthors(firstMessage)).toEqual([
      expect.objectContaining({
        id: "user-1",
        isSelf: true,
      }),
    ]);
  });

  it("createLocalSession() tracks local typing participant", () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-typing";
    profile.value = { name: "Typer" };

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    expect(session.typingParticipants.value).toEqual([]);

    session.setTypingStatus(true);

    expect(session.typingParticipants.value).toEqual([
      session.participants.value[0],
    ]);

    session.setTypingStatus(false);

    expect(session.typingParticipants.value).toEqual([]);
  });

  it("createSharedSession() reads only schema-valid messages", () => {
    const { loginManager } = createLoginManagerMock();
    const { session } = createSharedSessionMock({
      initialChats: [
        {
          id: "existing-1",
          authors: ["user-a"],
          targets: [],
          timeMs: 100,
          type: "text",
          text: "valid",
        },
        {
          bogus: true,
        },
      ],
    });

    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    expect(chatSession.messages.value).toEqual([
      {
        id: "existing-1",
        authors: ["user-a"],
        targets: [],
        timeMs: 100,
        type: "text",
        text: "valid",
      },
    ]);
  });

  it("createSharedSession() syncs messages on shared array changes", () => {
    const { loginManager } = createLoginManagerMock();
    const { session, sharedChats } = createSharedSessionMock();

    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    sharedChats.push({
      id: "existing-2",
      authors: [],
      targets: [],
      timeMs: 200,
      type: "text",
      text: "from peer",
    });

    expect(chatSession.messages.value).toHaveLength(1);
    expect(chatSession.messages.value[0]).toMatchObject({
      id: "existing-2",
      text: "from peer",
    });
  });

  it("createSharedSession() sends messages to shared chats with current user as author", async () => {
    const { loginManager } = createLoginManagerMock();
    const { session, sharedChats } = createSharedSessionMock({
      currentUserId: "self-user",
    });

    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    await chatSession.sendMessage({
      type: "text",
      text: "hello shared",
    });

    const pushed = sharedChats.toArray()[0] as Record<string, unknown>;
    expect(pushed).toMatchObject({
      id: "msg-1",
      authors: ["self-user"],
      targets: [],
      timeMs: 1_717_000_000_000,
      type: "text",
      text: "hello shared",
    });
  });

  it("createSharedSession() setTypingStatus(true) writes true into chatTypingMap for local participant", () => {
    const { loginManager } = createLoginManagerMock();
    const { session, sharedTyping } = createSharedSessionMock({
      currentUserId: "user-a",
    });

    const chats = createChatsManager(loginManager, mockI18nManager);
    chats.createSharedSession(session);

    expect(sharedTyping.get("user-a")).toBe(false);

    const chatSession = chats.chats.value[0]!;
    chatSession.setTypingStatus(true);

    expect(sharedTyping.get("user-a")).toBe(true);
  });

  it("createSharedSession() setTypingStatus(false) writes false into chatTypingMap for local participant", () => {
    const { loginManager } = createLoginManagerMock();
    const { session, sharedTyping } = createSharedSessionMock({
      currentUserId: "user-a",
    });

    const chats = createChatsManager(loginManager, mockI18nManager);
    chats.createSharedSession(session);

    const chatSession = chats.chats.value[0]!;
    chatSession.setTypingStatus(true);
    expect(sharedTyping.get("user-a")).toBe(true);

    chatSession.setTypingStatus(false);
    expect(sharedTyping.get("user-a")).toBe(false);
  });

  it("createSharedSession() tracks typing participants from shared typing map", async () => {
    const { loginManager } = createLoginManagerMock();
    const { session, sharedTyping } = createSharedSessionMock({
      connectedSessionUsers: [
        {
          userId: "u1",
          connectionId: "conn-u1",
          name: "Alpha",
          isSelf: false,
        },
      ],
    });
    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    expect(chatSession.typingParticipants.value).toEqual([]);

    sharedTyping.set("u1", true);
    await Promise.resolve();

    expect(chatSession.typingParticipants.value).toEqual([
      expect.objectContaining({
        id: "u1",
        isActive: true,
      }),
    ]);
  });

  it("createSharedSession() removes inactive participants from typing list", () => {
    const { loginManager } = createLoginManagerMock();
    const { session, allUsers, sharedTyping } = createSharedSessionMock({
      connectedSessionUsers: [
        {
          userId: "u1",
          connectionId: "conn-u1",
          name: "Alpha",
          isSelf: false,
        },
      ],
    });
    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    sharedTyping.set("u1", true);
    expect(chatSession.typingParticipants.value).toHaveLength(1);

    allUsers.value = [
      {
        userId: "u1",
        connectionId: "conn-u1",
        profile: { name: "Alpha" },
        isSelf: false,
        isActive: false,
        color: "#000000",
        sessionId: null,
        joinedAtMs: Date.now(),
      },
    ];

    expect(chatSession.typingParticipants.value).toEqual([]);
  });

  it("createSharedSession() maps participants and resolves message authors", () => {
    const { loginManager } = createLoginManagerMock();
    const { session } = createSharedSessionMock({
      connectedUsers: [
        {
          id: "u1",
          userId: "u1",
          connectionId: null,
          name: "Alpha",
          isSelf: false,
          isAI: false,
          isRemote: true,
          isActive: true,
          visual: getUserAnimalVisual("u1"),
        },
        {
          id: "u2",
          userId: "u2",
          connectionId: null,
          name: null,
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("u2"),
        },
      ],
      initialChats: [
        {
          id: "m1",
          authors: ["u1"],
          targets: [],
          timeMs: 10,
          type: "text",
          text: "hey",
        },
      ],
    });

    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    expect(chatSession.participants.value).toEqual([
      {
        id: "u1",
        userId: "u1",
        connectionId: "conn-u1",
        profile: { name: "Alpha" },
        name: "Alpha",
        isSelf: false,
        isAI: false,
        isRemote: true,
        isActive: true,
        sessionUser: session.connectedUsers.value.find(
          (u) => u.connectionId === "conn-u1"
        )!,
        visual: getUserAnimalVisual("u1"),
        joinTimeMs: 1_717_000_000_000,
      },
      {
        id: "u2",
        userId: "u2",
        connectionId: "conn-u2",
        profile: null,
        name: null,
        isSelf: true,
        isAI: false,
        isRemote: false,
        isActive: true,
        sessionUser: session.connectedUsers.value.find(
          (u) => u.connectionId === "conn-u2"
        )!,
        visual: getUserAnimalVisual("u2"),
        joinTimeMs: 1_717_000_000_000,
      },
    ]);

    const firstMessage = chatSession.messages.value[0] as ChatMessage;
    expect(chatSession.getMessageAuthors(firstMessage)).toEqual([
      {
        id: "u1",
        userId: "u1",
        connectionId: "conn-u1",
        profile: { name: "Alpha" },
        name: "Alpha",
        isSelf: false,
        isAI: false,
        isRemote: true,
        isActive: true,
        sessionUser: session.connectedUsers.value.find(
          (u) => u.connectionId === "conn-u1"
        )!,
        visual: getUserAnimalVisual("u1"),
        joinTimeMs: 1_717_000_000_000,
      },
    ]);
  });

  it("createSharedSession() groups multiple connections for the same user into one participant", () => {
    const { loginManager } = createLoginManagerMock();
    const { session } = createSharedSessionMock({
      connectedSessionUsers: [
        {
          userId: "u1",
          connectionId: "conn-u1-a",
          name: "Alpha",
          isSelf: false,
        },
        {
          userId: "u1",
          connectionId: "conn-u1-b",
          name: "Alpha",
          isSelf: false,
        },
      ],
    });

    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    expect(chatSession.participants.value).toEqual([
      {
        id: "u1",
        userId: "u1",
        connectionId: "conn-u1-a",
        profile: { name: "Alpha" },
        name: "Alpha",
        isSelf: false,
        isAI: false,
        isRemote: true,
        isActive: true,
        sessionUser: session.connectedUsers.value.find(
          (u) => u.connectionId === "conn-u1-a"
        )!,
        visual: getUserAnimalVisual("u1"),
        joinTimeMs: 1_717_000_000_000,
      },
    ]);
  });

  it("createSharedSession() keeps anonymous connections as separate participants", () => {
    const { loginManager } = createLoginManagerMock();
    const { session } = createSharedSessionMock({
      connectedSessionUsers: [
        {
          userId: null,
          connectionId: "anon-1",
          name: "Guest",
          isSelf: false,
        },
        {
          userId: null,
          connectionId: "anon-2",
          name: "Guest",
          isSelf: false,
        },
      ],
    });

    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    expect(chatSession.participants.value).toEqual([
      {
        id: "anon-1",
        userId: null,
        connectionId: "anon-1",
        profile: { name: "Guest" },
        name: "Guest",
        isSelf: false,
        isAI: false,
        isRemote: true,
        isActive: true,
        sessionUser: session.connectedUsers.value.find(
          (u) => u.connectionId === "anon-1"
        )!,
        visual: getUserAnimalVisual("anon-1"),
        joinTimeMs: 1_717_000_000_000,
      },
      {
        id: "anon-2",
        userId: null,
        connectionId: "anon-2",
        profile: { name: "Guest" },
        name: "Guest",
        isSelf: false,
        isAI: false,
        isRemote: true,
        isActive: true,
        sessionUser: session.connectedUsers.value.find(
          (u) => u.connectionId === "anon-2"
        )!,
        visual: getUserAnimalVisual("anon-2"),
        joinTimeMs: 1_717_000_000_000,
      },
    ]);
  });

  it("createSharedSession() keeps previously connected users as inactive participants", () => {
    const { loginManager } = createLoginManagerMock();
    const { session, connectedUsers, allUsers } = createSharedSessionMock({
      connectedSessionUsers: [
        {
          userId: "u1",
          connectionId: "conn-u1",
          name: "Alpha",
          isSelf: false,
        },
      ],
    });

    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    expect(chatSession.participants.value).toContainEqual({
      id: "u1",
      userId: "u1",
      connectionId: "conn-u1",
      profile: { name: "Alpha" },
      name: "Alpha",
      isSelf: false,
      isAI: false,
      isRemote: true,
      isActive: true,
      sessionUser: session.connectedUsers.value.find(
        (u) => u.connectionId === "conn-u1"
      )!,
      visual: getUserAnimalVisual("u1"),
      joinTimeMs: 1_717_000_000_000,
    });

    connectedUsers.value = [];
    allUsers.value = [
      {
        userId: "u1",
        connectionId: "conn-u1",
        profile: { name: "Alpha" },
        isSelf: false,
        isActive: false,
        color: "#000000",
        sessionId: null,
        joinedAtMs: Date.now(),
      },
    ];

    expect(chatSession.totalParticipants.value).toContainEqual({
      id: "u1",
      userId: "u1",
      connectionId: "conn-u1",
      profile: { name: "Alpha" },
      name: "Alpha",
      isSelf: false,
      isAI: false,
      isRemote: true,
      isActive: false,
      sessionUser: allUsers.value.find((u) => u.connectionId === "conn-u1")!,
      visual: getUserAnimalVisual("u1"),
      joinTimeMs: 1_717_000_000_000,
    });
  });

  it("createSharedSession() keeps AI participants active only while owner is active", () => {
    const { loginManager } = createLoginManagerMock();
    const { session, connectedUsers, allUsers, sharedChatProviders } =
      createSharedSessionMock({
        connectedSessionUsers: [
          {
            userId: "u1",
            connectionId: "conn-u1",
            name: "Alpha",
            isSelf: false,
          },
        ],
      });
    sharedChatProviders.set("u1", [
      {
        id: "u1_provider-x",
        providerId: "provider-x",
        name: "Remote AI",
        isAI: true,
      },
    ]);

    const chats = createChatsManager(loginManager, mockI18nManager);
    const chatSession = chats.createSharedSession(session);

    expect(chatSession.participants.value).toContainEqual({
      id: "u1_provider-x",
      providerId: "provider-x",
      ownerParticipantId: "u1",
      userId: "u1",
      connectionId: "conn-u1",
      name: "Remote AI",
      isSelf: false,
      isAI: true,
      isRemote: true,
      isActive: true,
      joinTimeMs: 1_717_000_000_000,
    });

    connectedUsers.value = [];
    allUsers.value = [
      {
        userId: "u1",
        connectionId: "conn-u1",
        profile: { name: "Alpha" },
        isSelf: false,
        isActive: false,
        color: "#000000",
        sessionId: null,
        joinedAtMs: Date.now(),
      },
    ];

    expect(chatSession.totalParticipants.value).toContainEqual({
      id: "u1_provider-x",
      providerId: "provider-x",
      ownerParticipantId: "u1",
      userId: "u1",
      connectionId: "conn-u1",
      name: "Remote AI",
      isSelf: false,
      isAI: true,
      isRemote: true,
      isActive: false,
      joinTimeMs: 1_717_000_000_000,
    });
  });

  it("sendMessage() rejects invalid message payloads", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    await expect(
      session.sendMessage({
        type: "text",
      } as any)
    ).rejects.toThrow();
  });

  it("registerProvider() adds AI provider participants to availableParticipants", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    const unregister = chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi.fn().mockResolvedValue({
        type: "text",
        text: "response",
      }),
    });

    expect(session.availableParticipants.value).toContainEqual({
      id: "provider-1",
      providerId: "provider-1",
      ownerParticipantId: session.participants.value[0]!.id,
      userId: null,
      connectionId: null,
      name: "Helper AI",
      iconUrl: null,
      isSelf: false,
      isAI: true,
      isRemote: false,
      isActive: true,
      joinTimeMs: 0,
    });

    session.addParticipant("provider-1");
    expect(session.participants.value).toContainEqual(
      expect.objectContaining({
        id: "provider-1",
      })
    );

    session.removeParticipant("provider-1");
    expect(
      session.participants.value.find((p) => p.id === "provider-1")
    ).toBeUndefined();

    unregister();
    expect(
      session.availableParticipants.value.find((p) => p.id === "provider-1")
    ).toBeUndefined();
  });

  it("records joinTimeMs when participants join or are added", () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    vi.mocked(Date.now).mockReturnValue(1_000);
    const chats = createChatsManager(loginManager, mockI18nManager);
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
    });
    const session = chats.createLocalSession();

    // The local user is observed at session creation time.
    expect(session.participants.value[0]!.joinTimeMs).toBe(1_000);
    // An available-but-unadded provider has no join time yet.
    expect(
      session.availableParticipants.value.find((p) => p.id === "provider-1")
        ?.joinTimeMs
    ).toBe(0);

    // Adding the provider later captures the add time, not a later recompute.
    vi.mocked(Date.now).mockReturnValue(2_000);
    session.addParticipant("provider-1");
    expect(
      session.participants.value.find((p) => p.id === "provider-1")?.joinTimeMs
    ).toBe(2_000);

    // The recorded time is stable across subsequent recomputes.
    vi.mocked(Date.now).mockReturnValue(3_000);
    profile.value = { name: "Alice II" };
    expect(
      session.participants.value.find((p) => p.id === "provider-1")?.joinTimeMs
    ).toBe(2_000);
  });

  it("derives AI participant joinTimeMs from its owner's join time", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
    });

    const { session, sharedChatProviders } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });
    const chat = chats.createSharedSession(session);

    // The owner joined at the mocked session time; adding the provider later
    // must not change the AI's join time — it follows the owner.
    vi.mocked(Date.now).mockReturnValue(5_000);
    chat.addParticipant("conn-user-a_provider-1");
    await Promise.resolve();

    const aiParticipant = chat.participants.value.find(
      (p) => p.id === "conn-user-a_provider-1"
    );
    expect(aiParticipant?.joinTimeMs).toBe(1_717_000_000_000);

    // The join time is no longer stored in the shared doc; only identity is.
    const shared = sharedChatProviders.get("user-a") as Array<
      Record<string, unknown>
    >;
    expect(shared).toEqual([
      expect.objectContaining({ id: "conn-user-a_provider-1" }),
    ]);
    expect(shared[0]).not.toHaveProperty("joinTimeMs");
  });

  it("registerProvider() replaces providers that have the same id", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    chats.registerProvider({
      id: "provider-1",
      name: "Old Name",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
    });

    chats.registerProvider({
      id: "provider-1",
      name: "New Name",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
    });

    const providerParticipants = session.availableParticipants.value.filter(
      (p) => p.isAI
    );
    expect(providerParticipants).toHaveLength(1);
    expect(providerParticipants[0]).toMatchObject({
      id: "provider-1",
      name: "New Name",
    });
  });

  it("registerProvider() unregister callback does not remove replacement provider", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    const unregisterOld = chats.registerProvider({
      id: "provider-1",
      name: "Old Name",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
    });

    chats.registerProvider({
      id: "provider-1",
      name: "New Name",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
    });

    unregisterOld();

    expect(session.availableParticipants.value).toContainEqual({
      id: "provider-1",
      providerId: "provider-1",
      ownerParticipantId: session.participants.value[0]!.id,
      userId: null,
      connectionId: null,
      name: "New Name",
      iconUrl: null,
      isSelf: false,
      isAI: true,
      isRemote: false,
      isActive: true,
      joinTimeMs: 0,
    });
  });

  it("addParticipant()/removeParticipant() call onJoinChat() and onLeaveChat() for local chats", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    const onJoinChat = vi.fn();
    const onLeaveChat = vi.fn();
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
      onJoinChat,
      onLeaveChat,
    });

    session.addParticipant("provider-1");
    await Promise.resolve();

    expect(onJoinChat).toHaveBeenCalledTimes(1);
    expect(onJoinChat).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: session.id,
      })
    );

    expect(
      session.participants.value.find((p) => p.id === "provider-1")
    ).toBeDefined();

    session.removeParticipant("provider-1");
    await Promise.resolve();

    expect(onLeaveChat).toHaveBeenCalledTimes(1);
    expect(onLeaveChat).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: session.id,
      })
    );

    expect(
      session.participants.value.find((p) => p.id === "provider-1")
    ).toBeUndefined();
  });

  it("addParticipant()/removeParticipant() call onJoinChat() and onLeaveChat() for shared chats", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);

    const onJoinChat = vi.fn();
    const onLeaveChat = vi.fn();
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
      onJoinChat,
      onLeaveChat,
    });

    const { session } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });
    const chatSession = chats.createSharedSession(session);

    chatSession.addParticipant("conn-user-a_provider-1");
    await Promise.resolve();
    await Promise.resolve();

    expect(onJoinChat).toHaveBeenCalledTimes(1);
    expect(onJoinChat).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: session.id,
      })
    );

    expect(
      chatSession.participants.value.find(
        (p) => p.id === "conn-user-a_provider-1"
      )
    ).toBeDefined();

    chatSession.removeParticipant("conn-user-a_provider-1");
    await Promise.resolve();
    await Promise.resolve();

    expect(onLeaveChat).toHaveBeenCalledTimes(1);
    expect(onLeaveChat).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: session.id,
      })
    );

    expect(
      chatSession.participants.value.find(
        (p) => p.id === "conn-user-a_provider-1"
      )
    ).toBeUndefined();
  });

  it("addParticipant() does nothing when trying to add a provider that doesnt support shared chats", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);

    const onJoinChat = vi.fn();
    const onLeaveChat = vi.fn();
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: false,
      generateResponse: vi.fn(),
      onJoinChat,
      onLeaveChat,
    });

    const { session } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });

    const chatSession = chats.createSharedSession(session);

    expect(chatSession.availableParticipants.value).not.toContainEqual(
      expect.objectContaining({
        id: "conn-user-a_provider-1",
        providerId: "provider-1",
      })
    );

    chatSession.addParticipant("conn-user-a_provider-1");
    await Promise.resolve();
    await Promise.resolve();

    expect(onJoinChat).toHaveBeenCalledTimes(0);
    expect(
      chatSession.participants.value.find(
        (p) => p.id === "conn-user-a_provider-1"
      )
    ).toBeUndefined();

    chatSession.removeParticipant("conn-user-a_provider-1");
    await Promise.resolve();
    await Promise.resolve();

    expect(onLeaveChat).toHaveBeenCalledTimes(0);
    expect(
      chatSession.participants.value.find((p) => p.id === "provider-1")
    ).toBeUndefined();
  });

  it("registerProvider() unregister triggers onLeaveChat() for chats that selected the provider", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    const onLeaveChat = vi.fn();
    const unregister = chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
      onLeaveChat,
    });

    session.addParticipant("provider-1");
    await Promise.resolve();

    unregister();
    await Promise.resolve();

    expect(onLeaveChat).toHaveBeenCalledTimes(1);
    expect(
      session.participants.value.find(
        (participant) => participant.id === "provider-1"
      )
    ).toBeUndefined();
  });

  it("createSharedSession() does not publish local providers into chat_providers map until they are added to the session", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
    });

    const { session, sharedChatProviders } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: "conn-user-a",
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });
    const chat = chats.createSharedSession(session);

    expect(sharedChatProviders.get("user-a")).toEqual([]);
    expect(chat.availableParticipants.value).toContainEqual({
      id: "conn-user-a_provider-1",
      providerId: "provider-1",
      ownerParticipantId: "user-a",
      userId: "user-a",
      connectionId: "conn-user-a",
      name: "Helper AI",
      iconUrl: null,
      isSelf: false,
      isAI: true,
      isRemote: false,
      isActive: true,
      // AI participants inherit their owner's join time.
      joinTimeMs: 1_717_000_000_000,
    });

    chat.addParticipant("conn-user-a_provider-1");
    await Promise.resolve();
    expect(chat.participants.value).toContainEqual(
      expect.objectContaining({
        id: "conn-user-a_provider-1",
      })
    );
  });

  it("createSharedSession() replaces provider participant entry in chat_providers by provider id", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    chats.registerProvider({
      id: "provider-1",
      name: "Old Name",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
    });

    const { session, sharedChatProviders } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });
    const chat = chats.createSharedSession(session);

    chats.registerProvider({
      id: "provider-1",
      name: "New Name",
      supportsSharedChats: true,
      generateResponse: vi.fn(),
    });

    await Promise.resolve();

    chat.addParticipant("conn-user-a_provider-1");

    await Promise.resolve();

    expect(sharedChatProviders.get("user-a")).toEqual([
      {
        id: "conn-user-a_provider-1",
        providerId: "provider-1",
        name: "New Name",
        isAI: true,
      },
    ]);
  });

  it("createSharedSession() merges shared provider participants from chat_providers map", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const { session, sharedChatProviders } = createSharedSessionMock({
      connectedUsers: [
        {
          id: "u1",
          userId: "u1",
          connectionId: null,
          name: "Alpha",
          isSelf: false,
          isAI: false,
          isRemote: true,
          isActive: true,
          visual: getUserAnimalVisual("u1"),
        },
      ],
    });
    sharedChatProviders.set("u1", [
      {
        id: "u1_provider-x",
        providerId: "provider-x",
        name: "Remote AI",
        isAI: true,
      },
    ]);

    const chatSession = chats.createSharedSession(session);

    expect(chatSession.participants.value).toContainEqual({
      id: "u1_provider-x",
      providerId: "provider-x",
      ownerParticipantId: "u1",
      userId: "u1",
      connectionId: "conn-u1",
      name: "Remote AI",
      isSelf: false,
      isAI: true,
      isRemote: true,
      isActive: true,
      joinTimeMs: 1_717_000_000_000,
    });
  });

  it("sendMessage() stores targets matched by participant id and remote user name", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const providerResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "Provider reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: providerResponse,
    });
    session.addParticipant("provider-1");

    await session.sendMessage({
      type: "text",
      text: "Hello @provider-1",
    });

    expect(session.messages.value[0]).toMatchObject({
      targets: ["provider-1"],
    });
    expect(providerResponse).toHaveBeenCalledTimes(1);
  });

  it("setContext() on the manager passes custom instructions and tools to the provider", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const tool = makeTool("addItem");
    const chats = createChatsManager(loginManager, mockI18nManager);
    chats.setContext({ instructions: "Be concise.", tools: [tool] });
    const session = chats.createLocalSession();
    const providerResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "Provider reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: providerResponse,
    });
    session.addParticipant("provider-1");

    // Both the manager and each session expose the same merged context.
    expect(chats.context.value).toEqual({
      instructions: "Be concise.",
      tools: [tool],
    });
    expect(session.context.value).toEqual(chats.context.value);

    await session.sendMessage({ type: "text", text: "Hello @provider-1" });

    expect(providerResponse).toHaveBeenCalledTimes(1);
    expect(providerResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: "Be concise.",
        tools: [tool],
      })
    );
  });

  it("setContext() merges fields and applies on the next message", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const tool = makeTool("addItem");
    const chats = createChatsManager(loginManager, mockI18nManager);
    chats.setContext({ tools: [tool] });
    const session = chats.createLocalSession();
    const providerResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "Provider reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: providerResponse,
    });
    session.addParticipant("provider-1");

    // Merge in instructions; the previously-set tools must be preserved.
    chats.setContext({ instructions: "Updated instructions." });
    expect(chats.context.value).toEqual({
      instructions: "Updated instructions.",
      tools: [tool],
    });

    await session.sendMessage({ type: "text", text: "Hi @provider-1" });

    expect(providerResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: "Updated instructions.",
        tools: [tool],
      })
    );
  });

  it("passes undefined context fields when no context is set", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const providerResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "Provider reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: providerResponse,
    });
    session.addParticipant("provider-1");

    expect(chats.context.value).toEqual({});

    await session.sendMessage({ type: "text", text: "Hello @provider-1" });

    const call = providerResponse.mock.calls[0]![0];
    expect(call.instructions).toBeUndefined();
    expect(call.tools).toBeUndefined();
  });

  it("addContext() merges additional instructions and tools into the default context", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const baseTool = makeTool("baseTool");
    const playlistTool = makeTool("editPlaylist");
    const chats = createChatsManager(loginManager, mockI18nManager);
    chats.setContext({ instructions: "Be concise.", tools: [baseTool] });
    const session = chats.createLocalSession();
    const providerResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "Provider reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: providerResponse,
    });
    session.addParticipant("provider-1");

    chats.addContext({
      id: "playlist",
      instructions: "Current playlist: {}",
      tools: [playlistTool],
    });

    await session.sendMessage({ type: "text", text: "Edit it @provider-1" });

    expect(providerResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        instructions: "Be concise.\n\nCurrent playlist: {}",
        tools: [baseTool, playlistTool],
      })
    );
    // The merged context reflects both the default and the added context.
    expect(chats.context.value).toEqual({
      instructions: "Be concise.\n\nCurrent playlist: {}",
      tools: [baseTool, playlistTool],
    });
  });

  it("addContext() replaces a context with the same id", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const providerResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "Provider reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: providerResponse,
    });
    session.addParticipant("provider-1");

    chats.addContext({ id: "playlist", instructions: "First playlist." });
    chats.addContext({ id: "playlist", instructions: "Second playlist." });

    await session.sendMessage({ type: "text", text: "Hi @provider-1" });

    expect(providerResponse).toHaveBeenCalledWith(
      expect.objectContaining({ instructions: "Second playlist." })
    );
  });

  it("removeContext() drops an added context from subsequent messages", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const playlistTool = makeTool("editPlaylist");
    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const providerResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "Provider reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: providerResponse,
    });
    session.addParticipant("provider-1");

    chats.addContext({
      id: "playlist",
      instructions: "Current playlist: {}",
      tools: [playlistTool],
    });
    chats.removeContext("playlist");

    await session.sendMessage({ type: "text", text: "Hi @provider-1" });

    const call = providerResponse.mock.calls[0]![0];
    expect(call.instructions).toBeUndefined();
    expect(call.tools).toBeUndefined();
  });

  it("makes a manager context available to providers in every chat", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const tool = makeTool("editPlaylist");
    const chats = createChatsManager(loginManager, mockI18nManager);
    const providerResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "Provider reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: providerResponse,
    });

    const sessionA = chats.createLocalSession();
    const sessionB = chats.createLocalSession();
    sessionA.addParticipant("provider-1");
    sessionB.addParticipant("provider-1");

    // A context added to the manager is visible to both sessions.
    chats.addContext({ id: "playlist", instructions: "Shared", tools: [tool] });
    expect(sessionA.context.value).toEqual(sessionB.context.value);
    expect(sessionA.context.value).toEqual({
      instructions: "Shared",
      tools: [tool],
    });

    await sessionA.sendMessage({ type: "text", text: "Hi @provider-1" });
    await sessionB.sendMessage({ type: "text", text: "Hi @provider-1" });

    expect(providerResponse).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ instructions: "Shared", tools: [tool] })
    );
    expect(providerResponse).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ instructions: "Shared", tools: [tool] })
    );
  });

  it("sendMessage() defaults to first local AI target when no targets are resolved", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const firstProviderResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "First provider reply",
    });
    const secondProviderResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "Second provider reply",
    });

    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: firstProviderResponse,
    });
    chats.registerProvider({
      id: "provider-2",
      name: "Helper AI 2",
      supportsSharedChats: true,
      generateResponse: secondProviderResponse,
    });
    session.addParticipant("provider-1");
    session.addParticipant("provider-2");

    await session.sendMessage({
      type: "text",
      text: "Hello there",
    });

    expect(session.messages.value[0]).toMatchObject({
      targets: ["provider-1"],
    });
    expect(firstProviderResponse).toHaveBeenCalledTimes(1);
    expect(secondProviderResponse).not.toHaveBeenCalled();
  });

  it("sendMessage() defaults to the provider that authored the most recent message", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const firstProviderResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "First provider reply",
    });
    const secondProviderResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "Second provider reply",
    });

    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: firstProviderResponse,
    });
    chats.registerProvider({
      id: "provider-2",
      name: "Helper AI 2",
      supportsSharedChats: true,
      generateResponse: secondProviderResponse,
    });
    session.addParticipant("provider-1");
    session.addParticipant("provider-2");

    await session.sendMessage({
      type: "text",
      text: "Hello @provider-2",
    });

    await session.sendMessage({
      type: "text",
      text: "Hello again",
    });

    expect(secondProviderResponse).toHaveBeenCalledTimes(2);
    expect(firstProviderResponse).toHaveBeenCalledTimes(0);
    expect(session.messages.value).toHaveLength(4);
    expect(session.messages.value[2]).toMatchObject({
      authors: ["user-1"],
      targets: ["provider-2"],
      type: "text",
      text: "Hello again",
    });
  });

  it("sendMessage() appends first provider response when no targets are resolved", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const firstProviderResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "First provider reply",
    });
    const secondProviderResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "Second provider reply",
    });

    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: firstProviderResponse,
    });
    chats.registerProvider({
      id: "provider-2",
      name: "Helper AI 2",
      supportsSharedChats: true,
      generateResponse: secondProviderResponse,
    });
    session.addParticipant("provider-1");
    session.addParticipant("provider-2");

    await session.sendMessage({
      type: "text",
      text: "Hello there",
    });

    expect(firstProviderResponse).toHaveBeenCalledTimes(1);
    expect(secondProviderResponse).not.toHaveBeenCalled();
    expect(session.messages.value).toHaveLength(2);
    expect(session.messages.value[0]).toMatchObject({
      authors: ["user-1"],
      targets: ["provider-1"],
      type: "text",
      text: "Hello there",
    });
    expect(session.messages.value[1]).toMatchObject({
      authors: ["provider-1"],
      type: "text",
      text: "First provider reply",
    });
  });

  it("sendMessage() marks local AI participant as typing while generating response", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const deferred = createDeferred<ChatMessageOptions | null>();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi.fn().mockImplementation(() => deferred.promise),
    });
    session.addParticipant("provider-1");

    const sendPromise = session.sendMessage({
      type: "text",
      text: "Hello there",
    });

    expect(session.typingParticipants.value).toContainEqual(
      expect.objectContaining({
        id: "provider-1",
        isAI: true,
      })
    );

    deferred.resolve({
      type: "text",
      text: "Provider reply",
    });
    await sendPromise;

    expect(session.typingParticipants.value).not.toContainEqual(
      expect.objectContaining({
        id: "provider-1",
      })
    );
  });

  it("createSharedSession() marks local AI participant as typing while generating response", async () => {
    const { loginManager } = createLoginManagerMock();
    const deferred = createDeferred<ChatMessageOptions | null>();
    const chats = createChatsManager(loginManager, mockI18nManager);

    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi.fn().mockImplementation(() => deferred.promise),
    });

    const { session } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });
    const chat = chats.createSharedSession(session);
    chat.addParticipant("conn-user-a_provider-1");
    await Promise.resolve();

    const sendPromise = chat.sendMessage({
      type: "text",
      text: "Hello @conn-user-a_provider-1",
    });
    await Promise.resolve();

    expect(chat.typingParticipants.value).toContainEqual(
      expect.objectContaining({
        id: "conn-user-a_provider-1",
        isAI: true,
      })
    );

    deferred.resolve({
      type: "text",
      text: "Shared provider reply",
    });
    await sendPromise;
    await Promise.resolve();

    expect(chat.typingParticipants.value).not.toContainEqual(
      expect.objectContaining({
        id: "conn-user-a_provider-1",
      })
    );
  });

  it("sendMessage() incrementally updates local provider responses when streaming", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const firstChunk = createDeferred<IteratorResult<string>>();
    const secondChunk = createDeferred<IteratorResult<string>>();

    const stream = {
      next: vi
        .fn<() => Promise<IteratorResult<string>>>()
        .mockImplementationOnce(() => firstChunk.promise)
        .mockImplementationOnce(() => secondChunk.promise)
        .mockResolvedValue({ done: true, value: undefined as any }),
    };

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();

    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi.fn().mockResolvedValue({
        type: "text",
        text: stream,
      }),
    });
    session.addParticipant("provider-1");

    const sendPromise = session.sendMessage({
      type: "text",
      text: "Hello there",
    });

    await Promise.resolve();
    expect(session.messages.value).toHaveLength(1);

    firstChunk.resolve({ done: false, value: "Hel" });
    await Promise.resolve();
    await Promise.resolve();

    expect(session.messages.value).toHaveLength(2);
    expect(session.messages.value[1]).toMatchObject({
      authors: ["provider-1"],
      type: "text",
      text: "Hel",
    });

    secondChunk.resolve({ done: false, value: "lo" });
    await sendPromise;

    expect(session.messages.value).toHaveLength(2);
    expect(session.messages.value[1]).toMatchObject({
      authors: ["provider-1"],
      type: "text",
      text: "Hello",
    });
  });

  it("createSharedSession() incrementally updates provider responses when streaming", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);

    const firstChunk = createDeferred<IteratorResult<string>>();
    const secondChunk = createDeferred<IteratorResult<string>>();

    const stream = {
      next: vi
        .fn<() => Promise<IteratorResult<string>>>()
        .mockImplementationOnce(() => firstChunk.promise)
        .mockImplementationOnce(() => secondChunk.promise)
        .mockResolvedValue({ done: true, value: undefined as any }),
    };

    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi.fn().mockResolvedValue({
        type: "text",
        text: stream,
      }),
    });

    const { session } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });
    const chat = chats.createSharedSession(session);
    chat.addParticipant("conn-user-a_provider-1");
    await Promise.resolve();

    const sendPromise = chat.sendMessage({
      type: "text",
      text: "Hello @conn-user-a_provider-1",
    });

    await Promise.resolve();
    expect(chat.messages.value).toHaveLength(1);

    firstChunk.resolve({ done: false, value: "Sha" });
    await Promise.resolve();
    await Promise.resolve();

    expect(chat.messages.value).toHaveLength(2);
    expect(chat.messages.value[1]).toMatchObject({
      authors: ["conn-user-a_provider-1"],
      type: "text",
      text: "Sha",
    });

    secondChunk.resolve({ done: false, value: "red" });
    await sendPromise;
    await Promise.resolve();

    expect(chat.messages.value).toHaveLength(2);
    expect(chat.messages.value[1]).toMatchObject({
      authors: ["conn-user-a_provider-1"],
      type: "text",
      text: "Shared",
    });
  });

  it("createSharedSession() stores targets matched by remote participant name and local AI name", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const providerResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "I can help",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: providerResponse,
    });

    const { session, sharedChats } = createSharedSessionMock({
      currentUserId: "self-user",
      connectedUsers: [
        {
          id: "self-user",
          userId: "self-user",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("self-user"),
        },
        {
          id: "u1",
          userId: "u1",
          connectionId: null,
          name: "Alpha",
          isSelf: false,
          isAI: false,
          isRemote: true,
          isActive: true,
          visual: getUserAnimalVisual("u1"),
        },
      ],
    });
    const chatSession = chats.createSharedSession(session);
    chatSession.addParticipant("conn-self-user_provider-1");
    await Promise.resolve();

    await chatSession.sendMessage({
      type: "text",
      text: "Hi @Alpha and @Helper AI",
    });

    expect(sharedChats.toArray()[0]).toMatchObject({
      targets: ["u1", "conn-self-user_provider-1"],
    });
    expect(sharedChats.toArray()[1]).toMatchObject({
      authors: ["conn-self-user_provider-1"],
      text: "I can help",
    });
    expect(providerResponse).toHaveBeenCalledTimes(1);
  });

  it("createSharedSession() resolves mentions of old anonymous id to logged-in user participant", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const { session, sharedChats, connectedUsers, allUsers } =
      createSharedSessionMock({
        currentUserId: "self-user",
        connectedSessionUsers: [
          {
            userId: "self-user",
            connectionId: "conn-self-user",
            name: "Alice",
            isSelf: true,
          },
          {
            userId: null,
            connectionId: "anon-1",
            name: "Guest",
            isSelf: false,
          },
        ],
      });
    const chatSession = chats.createSharedSession(session);

    connectedUsers.value = [
      {
        userId: "self-user",
        connectionId: "conn-self-user",
        profile: { name: "Alice" },
        isSelf: true,
        isActive: true,
        color: "#000000",
        sessionId: null,
        joinedAtMs: Date.now(),
      },
      {
        userId: "u1",
        connectionId: "anon-1",
        profile: { name: "Guest" },
        isSelf: false,
        isActive: true,
        color: "#000000",
        sessionId: null,
        joinedAtMs: Date.now(),
      },
    ];
    allUsers.value = connectedUsers.value.map((user) => ({
      ...user,
      isActive: true,
    }));

    await chatSession.sendMessage({
      type: "text",
      text: "Hi @anon-1",
    });

    expect(sharedChats.toArray()[0]).toMatchObject({
      targets: ["u1"],
    });
  });

  it("createSharedSession() lets late joiners resolve anonymous mentions after login handoff", async () => {
    const { loginManager: firstLoginManager } = createLoginManagerMock();
    const {
      session,
      connectedUsers,
      allUsers,
      sharedParticipantAliases,
      sharedChats,
    } = createSharedSessionMock({
      currentUserId: "self-user",
      connectedSessionUsers: [
        {
          userId: "self-user",
          connectionId: "conn-self-user",
          name: "Alice",
          isSelf: true,
        },
        {
          userId: null,
          connectionId: "anon-1",
          name: "Guest",
          isSelf: false,
        },
      ],
    });

    const firstChatsManager = createChatsManager(
      firstLoginManager,
      mockI18nManager
    );
    firstChatsManager.createSharedSession(session);

    connectedUsers.value = [
      {
        userId: "self-user",
        connectionId: "conn-self-user",
        profile: { name: "Alice" },
        isSelf: true,
        isActive: true,
        color: "#000000",
        sessionId: null,
        joinedAtMs: Date.now(),
      },
      {
        userId: "u1",
        connectionId: "anon-1",
        profile: { name: "Guest" },
        isSelf: false,
        isActive: true,
        color: "#000000",
        sessionId: null,
        joinedAtMs: Date.now(),
      },
    ];
    allUsers.value = connectedUsers.value.map((user) => ({
      ...user,
      isActive: true,
    }));

    await Promise.resolve();
    expect(sharedParticipantAliases.get("anon-1")).toBe("u1");

    const { loginManager: lateJoinerLoginManager } = createLoginManagerMock();
    const lateJoinerChatsManager = createChatsManager(
      lateJoinerLoginManager,
      mockI18nManager
    );
    const lateJoinerChatSession =
      lateJoinerChatsManager.createSharedSession(session);

    await lateJoinerChatSession.sendMessage({
      type: "text",
      text: "Hi @anon-1",
    });

    const latestMessage = sharedChats.toArray().at(-1) as Record<
      string,
      unknown
    >;
    expect(latestMessage).toMatchObject({
      targets: ["u1"],
    });
  });

  it("createSharedSession() resolves old anonymous author ids to aliased participant", async () => {
    const { loginManager: firstLoginManager } = createLoginManagerMock();
    const {
      session,
      connectedUsers,
      allUsers,
      sharedParticipantAliases,
      sharedChats,
    } = createSharedSessionMock({
      connectedSessionUsers: [
        {
          userId: null,
          connectionId: "anon-1",
          name: "Guest",
          isSelf: false,
        },
      ],
      initialChats: [
        {
          id: "m-anon",
          authors: ["anon-1"],
          targets: [],
          timeMs: 100,
          type: "text",
          text: "before login",
        },
      ],
    });

    const firstChatsManager = createChatsManager(
      firstLoginManager,
      mockI18nManager
    );
    firstChatsManager.createSharedSession(session);

    connectedUsers.value = [
      {
        userId: "u1",
        connectionId: "anon-1",
        profile: { name: "Guest" },
        isSelf: false,
        isActive: true,
        color: "#000000",
        sessionId: null,
        joinedAtMs: Date.now(),
      },
    ];
    allUsers.value = connectedUsers.value.map((user) => ({
      ...user,
      isActive: true,
    }));

    await Promise.resolve();
    expect(sharedParticipantAliases.get("anon-1")).toBe("u1");

    const { loginManager: lateJoinerLoginManager } = createLoginManagerMock();
    const lateJoinerChatsManager = createChatsManager(
      lateJoinerLoginManager,
      mockI18nManager
    );
    const lateJoinerChatSession =
      lateJoinerChatsManager.createSharedSession(session);

    // Wait for participant-alias map subscription to update the late joiner's local alias cache.
    await Promise.resolve();

    const legacyAuthorMessage = (sharedChats.toArray()[0] ??
      null) as ChatMessage | null;
    expect(legacyAuthorMessage).not.toBeNull();
    expect(
      lateJoinerChatSession.getMessageAuthors(
        legacyAuthorMessage as ChatMessage
      )
    ).toEqual([
      expect.objectContaining({
        id: "u1",
        isAI: false,
      }),
    ]);
  });

  it("sendMessage() auto-adds available participant when mentioned by id (local session)", async () => {
    const { loginManager, userId } = createLoginManagerMock();
    userId.value = "user-1";

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const generateResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse,
    });

    expect(session.availableParticipants.value).toContainEqual(
      expect.objectContaining({ id: "provider-1" })
    );
    expect(session.participants.value).not.toContainEqual(
      expect.objectContaining({ id: "provider-1" })
    );

    await session.sendMessage({ type: "text", text: "Hey @provider-1" });

    expect(session.participants.value).toContainEqual(
      expect.objectContaining({ id: "provider-1" })
    );
    expect(session.availableParticipants.value).not.toContainEqual(
      expect.objectContaining({ id: "provider-1" })
    );
    expect(session.messages.value[0]).toMatchObject({
      targets: ["provider-1"],
    });
    expect(generateResponse).toHaveBeenCalledTimes(1);
  });

  it("sendMessage() auto-adds available participant when mentioned by name (local session)", async () => {
    const { loginManager, userId } = createLoginManagerMock();
    userId.value = "user-1";

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const generateResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "HelperAI",
      supportsSharedChats: true,
      generateResponse,
    });

    await session.sendMessage({ type: "text", text: "Hey @HelperAI" });

    expect(session.participants.value).toContainEqual(
      expect.objectContaining({ id: "provider-1" })
    );
    expect(session.messages.value[0]).toMatchObject({
      targets: ["provider-1"],
    });
    expect(generateResponse).toHaveBeenCalledTimes(1);
  });

  it("sendMessage() calls onJoinChat when auto-adding mentioned available participant (local session)", async () => {
    const { loginManager, userId } = createLoginManagerMock();
    userId.value = "user-1";

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const onJoinChat = vi.fn();
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi
        .fn()
        .mockResolvedValue({ type: "text", text: "reply" }),
      onJoinChat,
    });

    await session.sendMessage({ type: "text", text: "Hey @provider-1" });

    expect(onJoinChat).toHaveBeenCalledTimes(1);
    expect(onJoinChat).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: session.id })
    );
  });

  it("sendMessage() does not re-add an already-participating provider when mentioned (local session)", async () => {
    const { loginManager, userId } = createLoginManagerMock();
    userId.value = "user-1";

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const onJoinChat = vi.fn();
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi
        .fn()
        .mockResolvedValue({ type: "text", text: "reply" }),
      onJoinChat,
    });

    session.addParticipant("provider-1");
    expect(onJoinChat).toHaveBeenCalledTimes(1);

    await session.sendMessage({ type: "text", text: "Hey @provider-1" });

    expect(onJoinChat).toHaveBeenCalledTimes(1);
    expect(
      session.participants.value.filter((p) => p.id === "provider-1")
    ).toHaveLength(1);
  });

  it("sendMessage() auto-adds available participant when mentioned by id (shared session)", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const generateResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse,
    });

    const { session, sharedChats } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });
    const chat = chats.createSharedSession(session);

    expect(chat.availableParticipants.value).toContainEqual(
      expect.objectContaining({ id: "conn-user-a_provider-1" })
    );

    await chat.sendMessage({
      type: "text",
      text: "Hey @conn-user-a_provider-1",
    });
    await Promise.resolve();

    expect(chat.participants.value).toContainEqual(
      expect.objectContaining({ id: "conn-user-a_provider-1" })
    );
    expect(sharedChats.toArray()[0]).toMatchObject({
      targets: ["conn-user-a_provider-1"],
    });
    expect(generateResponse).toHaveBeenCalledTimes(1);
  });

  it("sendMessage() auto-adds available participant when mentioned by name (shared session)", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const generateResponse = vi.fn().mockResolvedValue({
      type: "text",
      text: "reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "HelperAI",
      supportsSharedChats: true,
      generateResponse,
    });

    const { session, sharedChats } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });
    const chat = chats.createSharedSession(session);

    await chat.sendMessage({ type: "text", text: "Hey @HelperAI" });
    await Promise.resolve();

    expect(chat.participants.value).toContainEqual(
      expect.objectContaining({ id: "conn-user-a_provider-1" })
    );
    expect(sharedChats.toArray()[0]).toMatchObject({
      targets: ["conn-user-a_provider-1"],
    });
    expect(generateResponse).toHaveBeenCalledTimes(1);
  });

  it("sendMessage() calls onJoinChat when auto-adding mentioned available participant (shared session)", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const onJoinChat = vi.fn();
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi
        .fn()
        .mockResolvedValue({ type: "text", text: "reply" }),
      onJoinChat,
    });

    const { session } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });
    const chat = chats.createSharedSession(session);

    await chat.sendMessage({
      type: "text",
      text: "Hey @conn-user-a_provider-1",
    });

    expect(onJoinChat).toHaveBeenCalledTimes(1);
    expect(onJoinChat).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: session.id })
    );
  });

  it("sendMessage() does not re-add an already-participating provider when mentioned (shared session)", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const onJoinChat = vi.fn();
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi
        .fn()
        .mockResolvedValue({ type: "text", text: "reply" }),
      onJoinChat,
    });

    const { session } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });
    const chat = chats.createSharedSession(session);

    chat.addParticipant("conn-user-a_provider-1");
    await Promise.resolve();
    expect(onJoinChat).toHaveBeenCalledTimes(1);

    await chat.sendMessage({
      type: "text",
      text: "Hey @conn-user-a_provider-1",
    });
    await Promise.resolve();

    expect(onJoinChat).toHaveBeenCalledTimes(1);
    expect(
      chat.participants.value.filter((p) => p.id === "conn-user-a_provider-1")
    ).toHaveLength(1);
  });

  it("resolveMessageTargets() does not match @everyone", () => {
    const participants: ChatParticipant[] = [
      {
        id: "user-1",
        userId: "user-1",
        connectionId: null,
        name: "Alice",
        isSelf: true,
        isAI: false,
        isRemote: false,
        isActive: true,
        visual: getUserAnimalVisual("user-1"),
        joinTimeMs: 0,
      },
      {
        id: "provider-1",
        providerId: "provider-1",
        ownerParticipantId: "user-1",
        userId: null,
        connectionId: null,
        name: "Helper AI",
        isSelf: false,
        isAI: true,
        isRemote: false,
        isActive: true,
        joinTimeMs: 0,
      },
    ];

    expect(
      resolveMessageTargets(participants, "Hello @everyone", mockI18n)
    ).toEqual([]);
  });

  it("sendMessage() sets targets to true when @everyone is mentioned (local session)", async () => {
    const { loginManager, userId } = createLoginManagerMock();
    userId.value = "user-1";

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi
        .fn()
        .mockResolvedValue({ type: "text", text: "reply" }),
    });
    session.addParticipant("provider-1");

    await session.sendMessage({ type: "text", text: "@everyone Hello!" });

    expect(session.messages.value[0]).toMatchObject({ targets: true });
  });

  it("sendMessage() calls all active local AI providers when @everyone is mentioned (local session)", async () => {
    const { loginManager, userId } = createLoginManagerMock();
    userId.value = "user-1";

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const firstResponse = vi
      .fn()
      .mockResolvedValue({ type: "text", text: "reply 1" });
    const secondResponse = vi
      .fn()
      .mockResolvedValue({ type: "text", text: "reply 2" });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: firstResponse,
    });
    chats.registerProvider({
      id: "provider-2",
      name: "Helper AI 2",
      supportsSharedChats: true,
      generateResponse: secondResponse,
    });
    session.addParticipant("provider-1");
    session.addParticipant("provider-2");

    await session.sendMessage({ type: "text", text: "@everyone Hello!" });

    expect(session.messages.value[0]).toMatchObject({ targets: true });
    expect(firstResponse).toHaveBeenCalledTimes(1);
    expect(secondResponse).toHaveBeenCalledTimes(1);
  });

  it("sendMessage() auto-adds all available participants when @everyone is mentioned (local session)", async () => {
    const { loginManager, userId } = createLoginManagerMock();
    userId.value = "user-1";

    const chats = createChatsManager(loginManager, mockI18nManager);
    const session = chats.createLocalSession();
    const firstResponse = vi
      .fn()
      .mockResolvedValue({ type: "text", text: "reply 1" });
    const secondResponse = vi
      .fn()
      .mockResolvedValue({ type: "text", text: "reply 2" });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: firstResponse,
    });
    chats.registerProvider({
      id: "provider-2",
      name: "Helper AI 2",
      supportsSharedChats: true,
      generateResponse: secondResponse,
    });

    expect(session.availableParticipants.value).toHaveLength(2);

    await session.sendMessage({ type: "text", text: "@everyone Hello!" });

    expect(session.participants.value).toContainEqual(
      expect.objectContaining({ id: "provider-1" })
    );
    expect(session.participants.value).toContainEqual(
      expect.objectContaining({ id: "provider-2" })
    );
    expect(session.messages.value[0]).toMatchObject({ targets: true });
    expect(firstResponse).toHaveBeenCalledTimes(1);
    expect(secondResponse).toHaveBeenCalledTimes(1);
  });

  it("sendMessage() sets targets to true when @everyone is mentioned (shared session)", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: vi
        .fn()
        .mockResolvedValue({ type: "text", text: "reply" }),
    });

    const { session, sharedChats } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });
    const chat = chats.createSharedSession(session);
    chat.addParticipant("conn-user-a_provider-1");
    await Promise.resolve();

    await chat.sendMessage({ type: "text", text: "@everyone Hello!" });

    expect(sharedChats.toArray()[0]).toMatchObject({ targets: true });
  });

  it("sendMessage() calls all local AI providers when @everyone is mentioned (shared session)", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const firstResponse = vi
      .fn()
      .mockResolvedValue({ type: "text", text: "reply 1" });
    const secondResponse = vi
      .fn()
      .mockResolvedValue({ type: "text", text: "reply 2" });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      supportsSharedChats: true,
      generateResponse: firstResponse,
    });
    chats.registerProvider({
      id: "provider-2",
      name: "Helper AI 2",
      supportsSharedChats: true,
      generateResponse: secondResponse,
    });

    const { session, sharedChats } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          userId: "user-a",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("user-a"),
        },
      ],
    });
    const chat = chats.createSharedSession(session);
    chat.addParticipant("conn-user-a_provider-1");
    chat.addParticipant("conn-user-a_provider-2");
    await Promise.resolve();

    await chat.sendMessage({ type: "text", text: "@everyone Hello!" });

    expect(sharedChats.toArray()[0]).toMatchObject({ targets: true });
    expect(firstResponse).toHaveBeenCalledTimes(1);
    expect(secondResponse).toHaveBeenCalledTimes(1);
  });

  describe("parsedMessages", () => {
    it("returns a single string part for plain text without mentions (local session)", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();

      await session.sendMessage({ type: "text", text: "Hello world" });

      expect(session.parsedMessages.value).toMatchObject([
        { type: "text", text: "Hello world", parts: ["Hello world"] },
      ]);
    });

    it("splits on @id mention resolving to a known participant (local session)", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();
      chats.registerProvider({
        id: "provider-1",
        name: "Helper AI",
        supportsSharedChats: true,
        generateResponse: vi.fn().mockResolvedValue(null),
      });
      session.addParticipant("provider-1");

      await session.sendMessage({
        type: "text",
        text: "Hey @provider-1 how are you?",
      });

      const provider = session.participants.value.find(
        (p) => p.id === "provider-1"
      )!;
      expect(session.parsedMessages.value[0]).toMatchObject({
        type: "text",
        text: "Hey @provider-1 how are you?",
        parts: [
          "Hey ",
          { type: "mention", text: "@provider-1", participant: provider },
          " how are you?",
        ],
      });
    });

    it("splits on @{id} bracketed mention (local session)", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();
      chats.registerProvider({
        id: "provider-1",
        name: "Helper AI",
        supportsSharedChats: true,
        generateResponse: vi.fn().mockResolvedValue(null),
      });
      session.addParticipant("provider-1");

      await session.sendMessage({ type: "text", text: "Hey @{provider-1}!" });

      const provider = session.participants.value.find(
        (p) => p.id === "provider-1"
      )!;
      expect(session.parsedMessages.value[0]).toMatchObject({
        type: "text",
        text: "Hey @{provider-1}!",
        parts: [
          "Hey ",
          { type: "mention", text: "@{provider-1}", participant: provider },
          "!",
        ],
      });
    });

    it("resolves unknown mention token to participant: null (local session)", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();

      await session.sendMessage({ type: "text", text: "Hi @ghost there" });

      expect(session.parsedMessages.value[0]).toMatchObject({
        type: "text",
        text: "Hi @ghost there",
        parts: [
          "Hi ",
          { type: "mention", text: "@ghost", participant: null },
          " there",
        ],
      });
    });

    it("treats @everyone as a mention with null participant (local session)", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();

      await session.sendMessage({ type: "text", text: "@everyone Hello!" });

      expect(session.parsedMessages.value[0]).toMatchObject({
        type: "text",
        text: "@everyone Hello!",
        parts: [
          { type: "mention", text: "@everyone", participant: null },
          " Hello!",
        ],
      });
    });

    it("handles multiple mentions in a single message (local session)", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();
      chats.registerProvider({
        id: "provider-1",
        name: "Helper AI",
        supportsSharedChats: true,
        generateResponse: vi.fn().mockResolvedValue(null),
      });
      chats.registerProvider({
        id: "provider-2",
        name: "Helper AI 2",
        supportsSharedChats: true,
        generateResponse: vi.fn().mockResolvedValue(null),
      });
      session.addParticipant("provider-1");
      session.addParticipant("provider-2");

      await session.sendMessage({
        type: "text",
        text: "@provider-1 and @provider-2",
      });

      const p1 = session.participants.value.find((p) => p.id === "provider-1")!;
      const p2 = session.participants.value.find((p) => p.id === "provider-2")!;
      expect(session.parsedMessages.value[0]).toMatchObject({
        type: "text",
        text: "@provider-1 and @provider-2",
        parts: [
          { type: "mention", text: "@provider-1", participant: p1 },
          " and ",
          { type: "mention", text: "@provider-2", participant: p2 },
        ],
      });
    });

    it("resolves mention by short id (first 6 chars) (local session)", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();
      chats.registerProvider({
        id: "d7d90348-fc03-4272-b7c1-b565d968bb5c",
        name: "Helper AI",
        supportsSharedChats: true,
        generateResponse: vi.fn().mockResolvedValue(null),
      });
      session.addParticipant("d7d90348-fc03-4272-b7c1-b565d968bb5c");

      await session.sendMessage({ type: "text", text: "Hey @d7d903" });

      const provider = session.participants.value.find(
        (p) => p.id === "d7d90348-fc03-4272-b7c1-b565d968bb5c"
      )!;
      expect(session.parsedMessages.value[0]).toMatchObject({
        parts: [
          "Hey ",
          { type: "mention", text: "@d7d903", participant: provider },
        ],
      });
    });

    it("resolves mention by AI participant display name (local session)", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();
      chats.registerProvider({
        id: "provider-1",
        name: "HelperAI",
        supportsSharedChats: true,
        generateResponse: vi.fn().mockResolvedValue(null),
      });
      session.addParticipant("provider-1");

      await session.sendMessage({ type: "text", text: "Hey @HelperAI!" });

      const provider = session.participants.value.find(
        (p) => p.id === "provider-1"
      )!;
      expect(session.parsedMessages.value[0]).toMatchObject({
        parts: [
          "Hey ",
          { type: "mention", text: "@HelperAI", participant: provider },
          "!",
        ],
      });
    });

    it("resolves mention via participant id alias (local session)", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();

      // Send while anonymous (id = DEFAULT_LOCAL_PARTICIPANT_ID = "local-user")
      await session.sendMessage({ type: "text", text: "Hi @local-user" });

      // Log in — triggers alias local-user → user-1
      userId.value = "user-1";

      const participant = session.participants.value.find(
        (p) => p.id === "user-1"
      )!;
      expect(session.parsedMessages.value[0]).toMatchObject({
        parts: ["Hi ", { type: "mention", text: "@local-user", participant }],
      });
    });

    it("updates reactively as messages are added (local session)", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();

      expect(session.parsedMessages.value).toEqual([]);

      await session.sendMessage({ type: "text", text: "first" });
      expect(session.parsedMessages.value).toHaveLength(1);

      await session.sendMessage({ type: "text", text: "second" });
      expect(session.parsedMessages.value).toHaveLength(2);
    });

    it("returns a single string part for plain text without mentions (shared session)", () => {
      const { loginManager } = createLoginManagerMock();
      const { session, sharedChats } = createSharedSessionMock();
      const chats = createChatsManager(loginManager, mockI18nManager);
      const chatSession = chats.createSharedSession(session);

      sharedChats.push({
        id: "m1",
        authors: [],
        targets: [],
        timeMs: 1,
        type: "text",
        text: "Hello world",
      });

      expect(chatSession.parsedMessages.value).toMatchObject([
        { type: "text", text: "Hello world", parts: ["Hello world"] },
      ]);
    });

    it("splits on @id mention resolving to a known participant (shared session)", () => {
      const { loginManager } = createLoginManagerMock();
      const { session, sharedChats } = createSharedSessionMock({
        connectedSessionUsers: [
          {
            userId: "u1",
            connectionId: "conn-u1",
            name: "Alpha",
            isSelf: false,
          },
        ],
      });
      const chats = createChatsManager(loginManager, mockI18nManager);
      const chatSession = chats.createSharedSession(session);

      sharedChats.push({
        id: "m1",
        authors: ["u1"],
        targets: [],
        timeMs: 1,
        type: "text",
        text: "Hey @u1!",
      });

      const u1 = chatSession.totalParticipants.value.find(
        (p) => p.id === "u1"
      )!;
      expect(chatSession.parsedMessages.value[0]).toMatchObject({
        type: "text",
        text: "Hey @u1!",
        parts: ["Hey ", { type: "mention", text: "@u1", participant: u1 }, "!"],
      });
    });

    it("resolves unknown mention token to participant: null (shared session)", () => {
      const { loginManager } = createLoginManagerMock();
      const { session, sharedChats } = createSharedSessionMock();
      const chats = createChatsManager(loginManager, mockI18nManager);
      const chatSession = chats.createSharedSession(session);

      sharedChats.push({
        id: "m1",
        authors: [],
        targets: [],
        timeMs: 1,
        type: "text",
        text: "Hi @unknown!",
      });

      expect(chatSession.parsedMessages.value[0]).toMatchObject({
        type: "text",
        text: "Hi @unknown!",
        parts: [
          "Hi ",
          { type: "mention", text: "@unknown", participant: null },
          "!",
        ],
      });
    });

    it("updates reactively when the shared array receives a new message (shared session)", () => {
      const { loginManager } = createLoginManagerMock();
      const { session, sharedChats } = createSharedSessionMock();
      const chats = createChatsManager(loginManager, mockI18nManager);
      const chatSession = chats.createSharedSession(session);

      expect(chatSession.parsedMessages.value).toEqual([]);

      sharedChats.push({
        id: "m1",
        authors: [],
        targets: [],
        timeMs: 1,
        type: "text",
        text: "Hello",
      });

      expect(chatSession.parsedMessages.value).toHaveLength(1);
      expect(chatSession.parsedMessages.value[0]).toMatchObject({
        type: "text",
        text: "Hello",
      });
    });

    it("parses a single verse reference", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();

      await session.sendMessage({ type: "text", text: "See GEN 1:1" });

      expect(session.parsedMessages.value[0]).toMatchObject({
        parts: [
          "See ",
          {
            type: "verse_reference",
            text: "GEN 1:1",
            ref: { book: "GEN", chapter: 1, verse: 1 },
          },
        ],
      });
    });

    it("parses a chapter-only verse reference", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();

      await session.sendMessage({ type: "text", text: "Read GEN 1 today" });

      expect(session.parsedMessages.value[0]).toMatchObject({
        parts: [
          "Read ",
          {
            type: "verse_reference",
            text: "GEN 1",
            ref: { book: "GEN", chapter: 1 },
          },
          " today",
        ],
      });
    });

    it("parses a verse range reference", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();

      await session.sendMessage({ type: "text", text: "Check GEN 1:1-5" });

      expect(session.parsedMessages.value[0]).toMatchObject({
        parts: [
          "Check ",
          {
            type: "verse_reference",
            text: "GEN 1:1-5",
            ref: { book: "GEN", chapter: 1, verse: 1, endVerse: 5 },
          },
        ],
      });
    });

    it("parses multiple verse references in one message", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();

      await session.sendMessage({
        type: "text",
        text: "Compare John 3:16 and Romans 8:1",
      });

      expect(session.parsedMessages.value[0]).toMatchObject({
        parts: [
          "Compare ",
          {
            type: "verse_reference",
            text: "John 3:16",
            ref: { book: "JHN", chapter: 3, verse: 16 },
          },
          " and ",
          {
            type: "verse_reference",
            text: "Romans 8:1",
            ref: { book: "ROM", chapter: 8, verse: 1 },
          },
        ],
      });
    });

    it("parses a verse reference alongside a mention", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();
      chats.registerProvider({
        id: "provider-1",
        name: "Helper AI",
        supportsSharedChats: true,
        generateResponse: vi.fn().mockResolvedValue(null),
      });
      session.addParticipant("provider-1");

      await session.sendMessage({
        type: "text",
        text: "@provider-1 explain GEN 1:1",
      });

      const provider = session.participants.value.find(
        (p) => p.id === "provider-1"
      )!;
      expect(session.parsedMessages.value[0]).toMatchObject({
        parts: [
          { type: "mention", text: "@provider-1", participant: provider },
          " explain ",
          {
            type: "verse_reference",
            text: "GEN 1:1",
            ref: { book: "GEN", chapter: 1, verse: 1 },
          },
        ],
      });
    });

    it("does not produce verse_reference parts for plain text", async () => {
      const { loginManager, userId } = createLoginManagerMock();
      userId.value = "user-1";
      const chats = createChatsManager(loginManager, mockI18nManager);
      const session = chats.createLocalSession();

      await session.sendMessage({ type: "text", text: "Hello world" });

      expect(session.parsedMessages.value[0]).toMatchObject({
        parts: ["Hello world"],
      });
    });

    it("resolves mention by shared participant id alias (shared session)", async () => {
      const { loginManager } = createLoginManagerMock();
      const { session, sharedChats, sharedParticipantAliases } =
        createSharedSessionMock({
          connectedSessionUsers: [
            {
              userId: "u1",
              connectionId: "anon-1",
              name: "Guest",
              isSelf: false,
            },
          ],
        });
      sharedParticipantAliases.set("anon-1", "u1");
      await Promise.resolve();

      const chats = createChatsManager(loginManager, mockI18nManager);
      const chatSession = chats.createSharedSession(session);

      await Promise.resolve();

      sharedChats.push({
        id: "m1",
        authors: ["u1"],
        targets: [],
        timeMs: 1,
        type: "text",
        text: "Hi @anon-1",
      });

      const u1 = chatSession.totalParticipants.value.find(
        (p) => p.id === "u1"
      )!;
      expect(chatSession.parsedMessages.value[0]).toMatchObject({
        parts: ["Hi ", { type: "mention", text: "@anon-1", participant: u1 }],
      });
    });
  });

  it("wasMentioned is true for an unread message with targets: true", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager, mockI18nManager);
    const { session, sharedChats } = createSharedSessionMock({
      currentUserId: "self-user",
      connectedUsers: [
        {
          id: "self-user",
          userId: "self-user",
          connectionId: null,
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
          isActive: true,
          visual: getUserAnimalVisual("self-user"),
        },
        {
          id: "u1",
          userId: "u1",
          connectionId: null,
          name: "Bob",
          isSelf: false,
          isAI: false,
          isRemote: true,
          isActive: true,
          visual: getUserAnimalVisual("u1"),
        },
      ],
    });
    const chatSession = chats.createSharedSession(session);

    expect(chats.wasMentioned.value).toBe(false);

    sharedChats.push({
      id: "m1",
      authors: ["u1"],
      targets: true,
      timeMs: 1,
      type: "text",
      text: "@everyone Hello!",
    });

    expect(chats.numberOfUnreadMessages.value).toBe(1);
    expect(chats.wasMentioned.value).toBe(true);

    chatSession.markAsRead();

    expect(chats.wasMentioned.value).toBe(false);
  });
});
