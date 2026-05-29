import { signal } from "@preact/signals";
import {
  createChatsManager,
  resolveMessageTargets,
  type ChatMessage,
  type ChatParticipant,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";
import type { LoginManager } from "@packages/seed-bible/seed-bible/managers/LoginManager";
import type { BibleReadingSession } from "@packages/seed-bible/seed-bible/managers/SessionsManager";

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

function createSharedSessionMock(options?: {
  initialChats?: unknown[];
  connectedUsers?: ChatParticipant[];
  currentUserId?: string | null;
}) {
  const sharedChats = new MockSharedArray<unknown>(options?.initialChats ?? []);
  const sharedChatProviders = new MockSharedMap<unknown>();
  const connectedUsers = signal(
    (options?.connectedUsers ?? []).map((user) => ({
      userId: user.id,
      connectionId: `conn-${user.id}`,
      profile: user.name ? { name: user.name } : null,
      isSelf: user.isSelf,
      color: "#000000",
      sessionId: null,
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
      getArray: jest.fn().mockReturnValue(sharedChats),
      getMap: jest.fn().mockImplementation((name: string) => {
        if (name === "chat_providers") {
          return sharedChatProviders;
        }
        return new MockSharedMap<unknown>();
      }),
      transact: (callback: () => void) => callback(),
    },
    connectedUsers,
    currentUser,
  } as unknown as BibleReadingSession;

  return {
    session,
    sharedChats,
    sharedChatProviders,
    connectedUsers,
    currentUser,
  };
}

describe("createChatsManager", () => {
  beforeEach(() => {
    (globalThis as any).uuid = jest.fn(() => "msg-1");
    jest.spyOn(Date, "now").mockReturnValue(1_717_000_000_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as any).uuid;
  });

  it("createLocalSession() derives local participant from login profile/user id", () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const chats = createChatsManager(loginManager);
    const session = chats.createLocalSession();

    expect(session.participants.value).toEqual([
      {
        id: "user-1",
        name: "Alice",
        isSelf: true,
        isAI: false,
        isRemote: false,
      },
    ]);
  });

  it("resolveMessageTargets() matches by participant id", () => {
    const participants: ChatParticipant[] = [
      {
        id: "user-1",
        name: "Alice",
        isSelf: true,
        isAI: false,
        isRemote: false,
      },
      {
        id: "provider-1",
        name: "Helper AI",
        isSelf: false,
        isAI: true,
        isRemote: false,
      },
    ];

    expect(resolveMessageTargets(participants, "Hi @provider-1")).toEqual([
      participants[1]!,
    ]);
  });

  it("resolveMessageTargets() matches remote non-AI participants by name", () => {
    const participants: ChatParticipant[] = [
      {
        id: "u1",
        name: "Alpha",
        isSelf: false,
        isAI: false,
        isRemote: true,
      },
      {
        id: "u2",
        name: "Alpha",
        isSelf: false,
        isAI: true,
        isRemote: true,
      },
    ];

    expect(resolveMessageTargets(participants, "Hi @Alpha")).toEqual([
      participants[0]!,
    ]);
  });

  it("resolveMessageTargets() matches local AI participants by name", () => {
    const participants: ChatParticipant[] = [
      {
        id: "provider-1",
        name: "Helper AI",
        isSelf: false,
        isAI: true,
        isRemote: false,
      },
      {
        id: "user-1",
        name: "Helper AI",
        isSelf: false,
        isAI: false,
        isRemote: false,
      },
    ];

    expect(resolveMessageTargets(participants, "Hi @Helper AI")).toEqual([
      participants[0]!,
    ]);
  });

  it("resolveMessageTargets() does not match local non-AI or remote AI by name", () => {
    const participants: ChatParticipant[] = [
      {
        id: "user-1",
        name: "Alpha",
        isSelf: false,
        isAI: false,
        isRemote: false,
      },
      {
        id: "provider-1",
        name: "Alpha",
        isSelf: false,
        isAI: true,
        isRemote: true,
      },
    ];

    expect(resolveMessageTargets(participants, "Hi @Alpha")).toEqual([]);
  });

  it("resolveMessageTargets() dedupes repeated and overlapping matches", () => {
    const participants: ChatParticipant[] = [
      {
        id: "user-1",
        name: "Alpha",
        isSelf: false,
        isAI: false,
        isRemote: true,
      },
    ];

    expect(
      resolveMessageTargets(participants, "@user-1 @Alpha @user-1")
    ).toEqual([participants[0]!]);
  });

  it("createLocalSession() updates participant when login profile changes", () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    const chats = createChatsManager(loginManager);
    const session = chats.createLocalSession();

    userId.value = "user-2";
    profile.value = { name: "Bob" };

    expect(session.participants.value[0]).toEqual({
      id: "user-2",
      name: "Bob",
      isSelf: true,
      isAI: false,
      isRemote: false,
    });
  });

  it("createLocalSession() stores messages in a local array and resolves message author", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-3";
    profile.value = { name: "Cara" };

    const chats = createChatsManager(loginManager);
    const session = chats.createLocalSession();

    await session.sendMessage({
      type: "text",
      text: "Hello local",
    });

    expect(session.messages.value).toHaveLength(1);
    expect(session.messages.value[0]).toMatchObject({
      id: "msg-1",
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

    const chats = createChatsManager(loginManager);
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

    const chats = createChatsManager(loginManager);
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

    const chats = createChatsManager(loginManager);
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

  it("createSharedSession() maps participants and resolves message authors", () => {
    const { loginManager } = createLoginManagerMock();
    const { session } = createSharedSessionMock({
      connectedUsers: [
        {
          id: "u1",
          name: "Alpha",
          isSelf: false,
          isAI: false,
          isRemote: true,
        },
        { id: "u2", name: null, isSelf: true, isAI: false, isRemote: false },
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

    const chats = createChatsManager(loginManager);
    const chatSession = chats.createSharedSession(session);

    expect(chatSession.participants.value).toEqual([
      { id: "u1", name: "Alpha", isSelf: false, isAI: false, isRemote: true },
      { id: "u2", name: null, isSelf: true, isAI: false, isRemote: false },
    ]);

    const firstMessage = chatSession.messages.value[0] as ChatMessage;
    expect(chatSession.getMessageAuthors(firstMessage)).toEqual([
      {
        id: "u1",
        name: "Alpha",
        isSelf: false,
        isAI: false,
        isRemote: true,
      },
    ]);
  });

  it("sendMessage() rejects invalid message payloads", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager);
    const session = chats.createLocalSession();

    await expect(
      session.sendMessage({
        type: "text",
      } as any)
    ).rejects.toThrow();
  });

  it("registerProvider() adds AI provider participants to local sessions", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager);
    const session = chats.createLocalSession();

    const unregister = chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      generateResponse: jest.fn().mockResolvedValue({
        type: "text",
        text: "response",
      }),
    });

    expect(session.participants.value).toContainEqual({
      id: "provider-1",
      name: "Helper AI",
      isSelf: false,
      isAI: true,
      isRemote: false,
    });

    unregister();
    expect(
      session.participants.value.find((p) => p.id === "provider-1")
    ).toBeUndefined();
  });

  it("registerProvider() replaces providers that have the same id", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager);
    const session = chats.createLocalSession();

    chats.registerProvider({
      id: "provider-1",
      name: "Old Name",
      generateResponse: jest.fn(),
    });

    chats.registerProvider({
      id: "provider-1",
      name: "New Name",
      generateResponse: jest.fn(),
    });

    const providerParticipants = session.participants.value.filter(
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
    const chats = createChatsManager(loginManager);
    const session = chats.createLocalSession();

    const unregisterOld = chats.registerProvider({
      id: "provider-1",
      name: "Old Name",
      generateResponse: jest.fn(),
    });

    chats.registerProvider({
      id: "provider-1",
      name: "New Name",
      generateResponse: jest.fn(),
    });

    unregisterOld();

    expect(session.participants.value).toContainEqual({
      id: "provider-1",
      name: "New Name",
      isSelf: false,
      isAI: true,
      isRemote: false,
    });
  });

  it("createSharedSession() publishes local providers into chat_providers map", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager);
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      generateResponse: jest.fn(),
    });

    const { session, sharedChatProviders } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
        },
      ],
    });
    chats.createSharedSession(session);

    expect(sharedChatProviders.get("user-a")).toEqual([
      {
        id: "user-a_provider-1",
        name: "Helper AI",
        isAI: true,
      },
    ]);
  });

  it("createSharedSession() replaces provider participant entry in chat_providers by provider id", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager);
    chats.registerProvider({
      id: "provider-1",
      name: "Old Name",
      generateResponse: jest.fn(),
    });

    const { session, sharedChatProviders } = createSharedSessionMock({
      currentUserId: "user-a",
      connectedUsers: [
        {
          id: "user-a",
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
        },
      ],
    });
    chats.createSharedSession(session);

    chats.registerProvider({
      id: "provider-1",
      name: "New Name",
      generateResponse: jest.fn(),
    });

    expect(sharedChatProviders.get("user-a")).toEqual([
      {
        id: "user-a_provider-1",
        name: "New Name",
        isAI: true,
      },
    ]);
  });

  it("createSharedSession() merges shared provider participants from chat_providers map", () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager);
    const { session, sharedChatProviders } = createSharedSessionMock({
      connectedUsers: [
        {
          id: "u1",
          name: "Alpha",
          isSelf: false,
          isAI: false,
          isRemote: true,
        },
      ],
    });
    sharedChatProviders.set("u1", [
      {
        id: "u1_provider-x",
        name: "Remote AI",
        isAI: true,
      },
    ]);

    const chatSession = chats.createSharedSession(session);

    expect(chatSession.participants.value).toContainEqual({
      id: "u1_provider-x",
      name: "Remote AI",
      isSelf: false,
      isAI: true,
      isRemote: true,
    });
  });

  it("sendMessage() stores targets matched by participant id and remote user name", async () => {
    const { loginManager, userId, profile } = createLoginManagerMock();
    userId.value = "user-1";
    profile.value = { name: "Alice" };

    const chats = createChatsManager(loginManager);
    const session = chats.createLocalSession();
    const providerResponse = jest.fn().mockResolvedValue({
      type: "text",
      text: "Provider reply",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      generateResponse: providerResponse,
    });

    await session.sendMessage({
      type: "text",
      text: "Hello @provider-1",
    });

    expect(session.messages.value[0]).toMatchObject({
      targets: ["provider-1"],
    });
    expect(providerResponse).toHaveBeenCalledTimes(1);
  });

  it("createSharedSession() stores targets matched by remote participant name and local AI name", async () => {
    const { loginManager } = createLoginManagerMock();
    const chats = createChatsManager(loginManager);
    const providerResponse = jest.fn().mockResolvedValue({
      type: "text",
      text: "I can help",
    });
    chats.registerProvider({
      id: "provider-1",
      name: "Helper AI",
      generateResponse: providerResponse,
    });

    const { session, sharedChats } = createSharedSessionMock({
      currentUserId: "self-user",
      connectedUsers: [
        {
          id: "self-user",
          name: "Alice",
          isSelf: true,
          isAI: false,
          isRemote: false,
        },
        {
          id: "u1",
          name: "Alpha",
          isSelf: false,
          isAI: false,
          isRemote: true,
        },
      ],
    });
    const chatSession = chats.createSharedSession(session);

    await chatSession.sendMessage({
      type: "text",
      text: "Hi @Alpha and @Helper AI",
    });

    expect(sharedChats.toArray()[0]).toMatchObject({
      targets: ["u1", "self-user_provider-1"],
    });
    expect(sharedChats.toArray()[1]).toMatchObject({
      authors: ["self-user_provider-1"],
      text: "I can help",
    });
    expect(providerResponse).toHaveBeenCalledTimes(1);
  });
});
