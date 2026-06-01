import {
  computed,
  effect,
  Signal,
  signal,
  type ReadonlySignal,
} from "@preact/signals";
import { z } from "zod";
import type {
  LoginManager,
  UserProfile,
} from "seed-bible.managers.LoginManager";
import type { BibleReadingSession } from "seed-bible.managers.SessionsManager";

export const chatMessageBaseSchema = z.object({
  /**
   * The ID of the message, which should be unique within the chat session.
   */
  id: z.string(),

  /**
   * The IDs of the participants who sent the message.
   * If empty, the message is considered anonymous and has no author.
   */
  authors: z.array(z.string()),

  /**
   * The unix time in milliseconds when the message was sent.
   */
  timeMs: z.number().int().nonnegative(),

  /**
   * The IDs of the participants targeted by the message.
   */
  targets: z.array(z.string()),
});

export const textChatMessageSchema = chatMessageBaseSchema.extend({
  type: z.literal("text"),
  text: z.string(),
});

export const chatMessageSchema = z.discriminatedUnion("type", [
  textChatMessageSchema,
]);

export type ChatMessageBase = z.infer<typeof chatMessageBaseSchema>;
export type TextChatMessage = z.infer<typeof textChatMessageSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const chatMessageOptionsSchema = z.discriminatedUnion("type", [
  textChatMessageSchema.omit({
    timeMs: true,
    id: true,
    authors: true,
    targets: true,
  }),
]);

export type ChatMessageOptions = z.infer<typeof chatMessageOptionsSchema>;

export interface ChatContext {
  messages: ChatMessage[];
  participant: ChatParticipant;
  participants: ChatParticipant[];
}

export interface ChatProvider {
  /** The name of the chat provider. */
  name: string;
  /** The ID of the chat provider */
  id: string;
  /** Generates a response for the given chat context. */
  generateResponse: (
    context: ChatContext
  ) => ChatMessageOptions | Promise<ChatMessageOptions | null> | null;
}

export interface BaseChatParticipant {
  /**
   * The ID of the participant.
   */
  id: string;

  /**
   * The display name of the participant. May be null if the participant is anonymous.
   */
  name: string | null;

  /**
   * Whether this participant is the current user.
   */
  isSelf: boolean;

  /**
   * Whether this participant is an AI.
   */
  isAI: boolean;

  /**
   * Whether this participant is from a remote user.
   */
  isRemote: boolean;
}

export interface UserChatParticipant extends BaseChatParticipant {
  /** The user ID for this participant, if known. */
  userId: string | null;
  /** The connection ID for this participant, if known. */
  connectionId: string | null;
  isAI: false;
}

export interface AIChatParticipant extends BaseChatParticipant {
  /** The user ID that this AI participant is associated with, if any. */
  userId: string | null;
  /**
   * The connection ID that this AI participant is associated with, if any. This may be null even if userId is not null, in which case the participant is associated with the user but not with any specific connection of that user.
   */
  connectionId: string | null;

  /**
   * The ID of the participant that owns this AI participant.
   */
  ownerParticipantId: string;

  isSelf: false;
  isAI: true;
}

export type ChatParticipant = UserChatParticipant | AIChatParticipant;

type SharedAIChatParticipant = Pick<AIChatParticipant, "id" | "name" | "isAI">;

const sharedAIChatParticipantSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  isAI: z.literal(true),
});

const sharedAIChatParticipantArraySchema = z.array(
  sharedAIChatParticipantSchema
);

export interface ChatSession {
  /**
   * The ID of the chat.
   */
  id: string;

  /** Chat messages ordered from oldest to most recent. */
  messages: ReadonlySignal<ChatMessage[]>;
  /** Sends a message and notifies the other participants. */
  sendMessage: (message: ChatMessageOptions) => Promise<void>;
  participants: ReadonlySignal<ChatParticipant[]>;

  /**
   * Gets the authors of a given message. Returns an empty array if the authors are anonymous or have left the session.
   * @param message The message to get the authors of.
   * @returns The authors of the message, or an empty array if the authors are anonymous or have left the session.
   */
  getMessageAuthors: (message: ChatMessage) => ChatParticipant[];
}

export interface ChatsManager {
  chats: ReadonlySignal<ChatSession[]>;
  selectedChat: ReadonlySignal<ChatSession | null>;
  createSharedSession: (session: BibleReadingSession) => ChatSession;
  createLocalSession: () => ChatSession;
  registerProvider: (provider: ChatProvider) => () => void;
  selectChat: (chatId: string | null) => void;
}

const DEFAULT_LOCAL_PARTICIPANT_ID = "local-user";

function getParticipantName(profile: UserProfile | null): string | null {
  const name = profile?.name;
  if (typeof name !== "string") {
    return null;
  }
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getConnectedUserName(user: {
  profile?: {
    name?: string | null;
  } | null;
}): string | null {
  const name = user.profile?.name;
  if (typeof name !== "string") {
    return null;
  }
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function createChatMessage(
  options: ChatMessageOptions,
  authors: string[],
  targets: string[]
): ChatMessage {
  const validMessage = chatMessageOptionsSchema.parse(options);
  return {
    id: uuid(),
    timeMs: Date.now(),
    authors,
    targets,
    ...validMessage,
  };
}

function createProviderParticipantId(
  ownerParticipantId: string,
  providerId: string
): string {
  return `${ownerParticipantId}_${providerId}`;
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractMentionTokens(text: string): string[] {
  const tokens = new Set<string>();

  for (const match of text.matchAll(/(?:^|[^\w])@\{([^}]+)\}/g)) {
    const token = (match[1] ?? "").trim();
    if (token.length > 0) {
      tokens.add(token);
    }
  }

  for (const match of text.matchAll(/(?:^|[^\w])@([^\s@.,!?;:)}\]]+)/g)) {
    const token = (match[1] ?? "").trim();
    if (token.length > 0) {
      tokens.add(token);
    }
  }

  return Array.from(tokens);
}

function textIncludesMention(text: string, value: string): boolean {
  const token = value.trim();
  if (token.length === 0) {
    return false;
  }

  const escapedToken = escapeRegExp(token);
  const mentionPattern = new RegExp(
    `(?:^|[^\\w])@(?:\\{${escapedToken}\\}|${escapedToken})(?=$|[\\s.,!?;:)}\\]])`
  );
  return mentionPattern.test(text);
}

export function resolveMessageTargets(
  participants: ChatParticipant[],
  text: string
): ChatParticipant[] {
  if (extractMentionTokens(text).length === 0) {
    return [];
  }

  const matches = new Map<string, ChatParticipant>();

  for (const participant of participants) {
    if (textIncludesMention(text, participant.id)) {
      matches.set(participant.id, participant);
    }
  }

  for (const participant of participants) {
    if (!participant.name || !textIncludesMention(text, participant.name)) {
      continue;
    }

    if (
      (participant.isRemote && !participant.isAI) ||
      (!participant.isRemote && participant.isAI)
    ) {
      matches.set(participant.id, participant);
    }
  }

  return Array.from(matches.values());
}

function resolveMessageAuthors(
  participants: ChatParticipant[],
  message: ChatMessage
): ChatParticipant[] {
  if (message.authors.length === 0) {
    return [];
  }

  return message.authors
    .map((id) => participants.find((p) => p.id === id))
    .filter((p) => p) as ChatParticipant[];
}

function resolveMessageTargetsWithAliases(
  participants: ChatParticipant[],
  text: string,
  participantIdAliases: Readonly<Record<string, string>>
): ChatParticipant[] {
  const matches = new Map<string, ChatParticipant>(
    resolveMessageTargets(participants, text).map((participant) => [
      participant.id,
      participant,
    ])
  );

  for (const token of extractMentionTokens(text)) {
    const resolvedId = participantIdAliases[token];
    if (!resolvedId) {
      continue;
    }

    const resolvedParticipant = participants.find((p) => p.id === resolvedId);
    if (resolvedParticipant) {
      matches.set(resolvedParticipant.id, resolvedParticipant);
    }
  }

  return Array.from(matches.values());
}

function createSharedChatSession(
  session: BibleReadingSession,
  chatProviders: Signal<ChatProvider[]>
): ChatSession {
  const chats = session.document.getArray<unknown>("chats");
  const chatProvidersMap = session.document.getMap<unknown>("chat_providers");
  const participantAliasesMap = session.document.getMap<unknown>(
    "chat_participant_aliases"
  );
  const chatProvidersMapVersion = signal(0);
  const participantAliasesMapVersion = signal(0);
  const participantIdAliases = signal<Record<string, string>>({});
  chatProvidersMap.changes.subscribe(() => {
    // Avoid updating reactive graph synchronously during shared-doc
    // transactions to prevent dependency cycles.
    queueMicrotask(() => {
      chatProvidersMapVersion.value += 1;
    });
  });
  participantAliasesMap.changes.subscribe(() => {
    queueMicrotask(() => {
      participantAliasesMapVersion.value += 1;
    });
  });

  const participantsMatch = (
    left: SharedAIChatParticipant[],
    right: SharedAIChatParticipant[]
  ): boolean => {
    return JSON.stringify(left) === JSON.stringify(right);
  };

  const readValidChats = (): ChatMessage[] => {
    return chats
      .toArray()
      .map((rawMessage) => {
        const parsed = chatMessageSchema.safeParse(rawMessage);
        return parsed.success ? parsed.data : null;
      })
      .filter((message): message is ChatMessage => message !== null);
  };

  const messages = signal<ChatMessage[]>(readValidChats());
  chats.changes.subscribe(() => {
    messages.value = readValidChats();
  });

  effect(() => {
    void participantAliasesMapVersion.value;
    const nextAliases: Record<string, string> = {};
    participantAliasesMap.forEach((value, key) => {
      if (typeof key !== "string" || typeof value !== "string") {
        return;
      }
      nextAliases[key] = value;
    });
    participantIdAliases.value = nextAliases;
  });

  let previousParticipantIdByConnectionId = new Map<string, string>();
  effect(() => {
    const nextParticipantIdByConnectionId = new Map<string, string>();
    const aliases = {
      ...participantIdAliases.value,
    };
    let aliasesChanged = false;

    for (const connectedUser of session.connectedUsers.value) {
      const connectionId = connectedUser.connectionId ?? null;
      const userId = connectedUser.userId ?? null;
      const currentParticipantId = userId ?? connectionId;

      if (!connectionId || !currentParticipantId) {
        continue;
      }

      const previousParticipantId =
        previousParticipantIdByConnectionId.get(connectionId) ?? null;
      if (
        previousParticipantId &&
        previousParticipantId !== currentParticipantId &&
        previousParticipantId === connectionId
      ) {
        const existingSharedAlias = participantAliasesMap.get(
          previousParticipantId
        );
        if (existingSharedAlias !== currentParticipantId) {
          participantAliasesMap.set(
            previousParticipantId,
            currentParticipantId
          );
        }
        if (
          participantIdAliases.value[previousParticipantId] !==
          currentParticipantId
        ) {
          aliases[previousParticipantId] = currentParticipantId;
          aliasesChanged = true;
        }
      }

      nextParticipantIdByConnectionId.set(connectionId, currentParticipantId);
    }

    previousParticipantIdByConnectionId = nextParticipantIdByConnectionId;
    if (aliasesChanged) {
      participantIdAliases.value = aliases;
    }
  });

  const participants = computed(() => {
    const localUserId = session.currentUser.value?.userId ?? null;
    const localConnectionId = session.currentUser.value?.connectionId ?? null;
    const localParticipantId = localUserId ?? localConnectionId;

    const participantGroups = new Map<
      string,
      {
        id: string;
        userId: string | null;
        users: (typeof session.connectedUsers.value)[number][];
      }
    >();
    for (const user of session.connectedUsers.value) {
      const userId = user.userId ?? null;
      const connectionId = user.connectionId ?? null;
      const id = userId ?? connectionId;
      if (!id) {
        continue;
      }

      const existing = participantGroups.get(id);
      if (existing) {
        existing.users.push(user);
      } else {
        participantGroups.set(id, {
          id,
          userId,
          users: [user],
        });
      }
    }

    const connectedParticipants = Array.from(participantGroups.values()).map(
      (group): UserChatParticipant => {
        const representative = group.users[0]!;
        const isSelf = group.users.some((user) => user.isSelf);
        const name =
          group.users
            .map((user) => getConnectedUserName(user))
            .find((entry) => entry !== null) ?? null;

        return {
          id: group.id,
          userId: group.userId,
          connectionId: representative.connectionId ?? null,
          name,
          isSelf,
          isAI: false,
          isRemote: !isSelf,
        };
      }
    );

    void chatProvidersMapVersion.value;
    const sharedProviderParticipants: AIChatParticipant[] = [];
    chatProvidersMap.forEach((value, ownerParticipantId) => {
      const parsed = sharedAIChatParticipantArraySchema.safeParse(value);
      if (!parsed.success) {
        return;
      }
      const owner = connectedParticipants.find(
        (p) => p.id === ownerParticipantId
      );
      if (!owner) {
        return;
      }
      sharedProviderParticipants.push(
        ...parsed.data.map(
          (p): AIChatParticipant => ({
            ...p,
            ownerParticipantId,
            userId: owner.userId,
            connectionId: owner.connectionId,
            isSelf: false,
            isRemote: ownerParticipantId !== localParticipantId,
          })
        )
      );
    });

    return [...connectedParticipants, ...sharedProviderParticipants];
  });

  let previousLocalParticipantId: string | null = null;
  effect(() => {
    const localUserId = session.currentUser.value?.userId ?? null;
    const localConnectionId = session.currentUser.value?.connectionId ?? null;
    const localParticipantId = localUserId ?? localConnectionId;

    const localProviderParticipants: SharedAIChatParticipant[] =
      localParticipantId
        ? chatProviders.value.map(
            (provider): SharedAIChatParticipant => ({
              id: createProviderParticipantId(localParticipantId, provider.id),
              name: provider.name,
              isAI: true,
            })
          )
        : [];

    session.document.transact(() => {
      if (
        previousLocalParticipantId &&
        previousLocalParticipantId !== localParticipantId
      ) {
        chatProvidersMap.delete(previousLocalParticipantId);
      }

      if (!localParticipantId) {
        if (previousLocalParticipantId) {
          chatProvidersMap.delete(previousLocalParticipantId);
        }
        previousLocalParticipantId = null;
        return;
      }

      const existingParticipants = sharedAIChatParticipantArraySchema.safeParse(
        chatProvidersMap.get(localParticipantId)
      );
      const currentValue = existingParticipants.success
        ? existingParticipants.data
        : [];
      if (!participantsMatch(currentValue, localProviderParticipants)) {
        chatProvidersMap.set(localParticipantId, localProviderParticipants);
      }
      previousLocalParticipantId = localParticipantId;
    });
  });

  const sendMessage = async (message: ChatMessageOptions) => {
    const authorId =
      session.currentUser.value?.userId ??
      session.currentUser.value?.connectionId ??
      null;
    const targetParticipants =
      message.type === "text"
        ? resolveMessageTargetsWithAliases(
            participants.value,
            message.text,
            participantIdAliases.value
          )
        : [];
    const nextMessage = createChatMessage(
      message,
      authorId ? [authorId] : [],
      targetParticipants.map((participant) => participant.id)
    );

    chats.push(nextMessage);

    await Promise.all(
      targetParticipants.map(async (participant) => {
        if (!participant.isAI || participant.isRemote || !authorId) {
          return;
        }

        const providerId = participant.id.startsWith(`${authorId}_`)
          ? participant.id.slice(authorId.length + 1)
          : null;
        if (!providerId) {
          return;
        }

        const provider = chatProviders.value.find(
          (entry) => entry.id === providerId
        );
        if (!provider) {
          return;
        }

        const response = await provider.generateResponse({
          messages: [...messages.value, nextMessage],
          participant,
          participants: participants.value,
        });
        if (!response) {
          return;
        }
        const responseTargets =
          response.type === "text"
            ? resolveMessageTargets(participants.value, response.text)
            : [];
        chats.push(
          createChatMessage(
            response,
            [participant.id],
            responseTargets.map((target) => target.id)
          )
        );
      })
    );
  };

  return {
    id: uuid(),
    messages,
    sendMessage,
    participants,
    getMessageAuthors: (message: ChatMessage) =>
      resolveMessageAuthors(participants.value, message),
  };
}

function createLocalChatSession(
  loginManager: LoginManager,
  chatProviders: Signal<ChatProvider[]>
): ChatSession {
  const localParticipant = computed<UserChatParticipant>(() => ({
    id: loginManager.userId.value ?? DEFAULT_LOCAL_PARTICIPANT_ID,
    userId: loginManager.userId.value ?? null,
    connectionId: null,
    name: getParticipantName(loginManager.profile.value),
    isSelf: true,
    isAI: false,
    isRemote: false,
  }));
  const chatProviderParticipants = computed<AIChatParticipant[]>(() =>
    chatProviders.value.map((provider) => ({
      id: provider.id,
      ownerParticipantId: localParticipant.value.id,
      userId: loginManager.userId.value ?? null,
      connectionId: null,
      name: provider.name,
      isSelf: false,
      isAI: true,
      isRemote: false,
    }))
  );

  const participants = computed<ChatParticipant[]>(() => [
    localParticipant.value,
    ...chatProviderParticipants.value,
  ]);
  const messages = signal<ChatMessage[]>([]);

  const sendMessage = async (message: ChatMessageOptions) => {
    const participant = localParticipant.value;
    const resolvedTargetParticipants =
      message.type === "text"
        ? resolveMessageTargets(participants.value, message.text)
        : [];
    const defaultProviderParticipant = participants.value.find(
      (entry): entry is AIChatParticipant => entry.isAI && !entry.isRemote
    );
    const targetParticipants =
      resolvedTargetParticipants.length > 0
        ? resolvedTargetParticipants
        : defaultProviderParticipant
          ? [defaultProviderParticipant]
          : [];
    const providerTargets = targetParticipants.filter(
      (target): target is AIChatParticipant => target.isAI && !target.isRemote
    );
    const nextMessage = createChatMessage(
      message,
      participant.id ? [participant.id] : [],
      targetParticipants.map((target) => target.id)
    );

    messages.value = [...messages.value, nextMessage];

    await Promise.all(
      providerTargets.map(async (target) => {
        const provider = chatProviders.value.find(
          (entry) => entry.id === target.id
        );
        if (!provider) {
          return;
        }

        const response = await provider.generateResponse({
          messages: [...messages.value],
          participant: target,
          participants: participants.value,
        });
        if (!response) {
          return;
        }
        const responseTargets =
          response.type === "text"
            ? resolveMessageTargets(participants.value, response.text)
            : [];
        messages.value = [
          ...messages.value,
          createChatMessage(
            response,
            [target.id],
            responseTargets.map((entry) => entry.id)
          ),
        ];
      })
    );
  };

  const getMessageAuthors = (message: ChatMessage) =>
    resolveMessageAuthors(participants.value, message);

  return {
    id: uuid(),
    messages,
    sendMessage,
    participants,
    getMessageAuthors,
  };
}

export function createChatsManager(loginManager: LoginManager): ChatsManager {
  const chats = signal<ChatSession[]>([]);
  const chatProviders = signal<ChatProvider[]>([]);
  const selectedChatId = signal<string | null>(null);
  const selectedChat = computed(
    () => chats.value.find((chat) => chat.id === selectedChatId.value) ?? null
  );

  const registerProvider = (provider: ChatProvider) => {
    chatProviders.value = [
      ...chatProviders.value.filter((p) => p.id !== provider.id),
      provider,
    ];

    return () => {
      const currentProvider = chatProviders.value.find(
        (p) => p.id === provider.id
      );
      if (currentProvider !== provider) {
        return;
      }

      chatProviders.value = chatProviders.value.filter(
        (p) => p.id !== provider.id
      );
    };
  };

  const createLocalSession = () => {
    const chat = createLocalChatSession(loginManager, chatProviders);
    chats.value = [...chats.value, chat];
    return chat;
  };

  const createSharedSession = (session: BibleReadingSession) => {
    const chat = createSharedChatSession(session, chatProviders);
    chats.value = [...chats.value, chat];
    return chat;
  };

  return {
    chats,
    createSharedSession,
    createLocalSession,
    registerProvider,
    selectedChat,
    selectChat: (chatId: string | null) => {
      selectedChatId.value = chatId;
    },
  };
}
