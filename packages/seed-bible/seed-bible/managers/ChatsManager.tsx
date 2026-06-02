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

export interface JoinLeaveChatContext {
  chatId: string;
  messages: ChatMessage[];
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
  /** Called when this provider is added as a participant to a chat. */
  onJoinChat?: (context: JoinLeaveChatContext) => void | Promise<void>;
  /** Called when this provider is removed as a participant from a chat. */
  onLeaveChat?: (context: JoinLeaveChatContext) => void | Promise<void>;
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

  /**
   * Whether this participant is currently connected to the session.
   */
  isActive: boolean;
}

export interface UserChatParticipant extends BaseChatParticipant {
  /** The user ID for this participant, if known. */
  userId: string | null;
  /** The connection ID for this participant, if known. */
  connectionId: string | null;
  /** The user's profile information, if available. */
  profile?: UserProfile | null;
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

  /** The ID of the AI provider. */
  providerId: string;

  isSelf: false;
  isAI: true;
}

export type ChatParticipant = UserChatParticipant | AIChatParticipant;

type SharedAIChatParticipant = Pick<
  AIChatParticipant,
  "id" | "name" | "isAI" | "providerId"
>;

const sharedAIChatParticipantSchema = z.object({
  id: z.string(),
  providerId: z.string(),
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
  /**
   * Unread messages that have been sent since the last time the user marked messages as read.
   */
  unreadMessages: ReadonlySignal<ChatMessage[]>;
  /** The message ID of the latest message the user has read, if any. */
  lastMessageRead: ReadonlySignal<string | null>;

  /**
   * Whether any unread messages target the local participant.
   */
  wasMentioned: ReadonlySignal<boolean>;

  /** Marks all current messages as read by moving lastMessageRead to the latest message ID. */
  markAsRead: () => void;
  /** Sends a message and notifies the other participants. */
  sendMessage: (message: ChatMessageOptions) => Promise<void>;
  /** Updates whether the local participant is currently typing. */
  setTypingStatus: (isTyping: boolean) => void;
  participants: ReadonlySignal<ChatParticipant[]>;
  /** Participants that can be added to this chat session. */
  availableParticipants: ReadonlySignal<ChatParticipant[]>;
  /** Participants currently typing. */
  typingParticipants: ReadonlySignal<ChatParticipant[]>;
  /** Adds a participant to this chat session. */
  addParticipant: (participantId: string) => void;
  /** Removes a participant from this chat session. */
  removeParticipant: (participantId: string) => void;

  /**
   * Gets the authors of a given message. Returns an empty array if the authors are anonymous or have left the session.
   * @param message The message to get the authors of.
   * @returns The authors of the message, or an empty array if the authors are anonymous or have left the session.
   */
  getMessageAuthors: (message: ChatMessage) => ChatParticipant[];
}

export interface ChatsManager {
  isOpen: Signal<boolean>;
  chats: ReadonlySignal<ChatSession[]>;
  /** Total number of unread messages across all chat sessions. */
  numberOfUnreadMessages: ReadonlySignal<number>;
  /** Whether any unread message targets the local participant in any chat session. */
  wasMentioned: ReadonlySignal<boolean>;
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

type ConnectedUserLike = {
  userId?: string | null;
  connectionId?: string | null;
  profile?: UserProfile | null;
  isSelf: boolean;
  isActive?: boolean;
};

type GroupedConnectedUser = {
  id: string;
  userId: string | null;
  connectionId: string | null;
  profile: UserProfile | null;
  name: string | null;
  isSelf: boolean;
  isActive: boolean;
};

function groupConnectedUsers(
  users: ConnectedUserLike[]
): GroupedConnectedUser[] {
  const groups = new Map<string, ConnectedUserLike[]>();

  for (const user of users) {
    const userId = user.userId ?? null;
    const connectionId = user.connectionId ?? null;
    const id = userId ?? connectionId;
    if (!id) {
      continue;
    }

    const group = groups.get(id);
    if (group) {
      group.push(user);
    } else {
      groups.set(id, [user]);
    }
  }

  return Array.from(groups.entries()).map(([id, group]) => {
    const representative = group.find((entry) => entry.isActive) ?? group[0]!;
    return {
      id,
      userId: representative.userId ?? null,
      connectionId: representative.connectionId ?? null,
      profile:
        group.find((entry) => entry.profile !== undefined)?.profile ?? null,
      name:
        group
          .map((entry) => getConnectedUserName(entry))
          .find((name) => name) ?? null,
      isSelf: group.some((entry) => entry.isSelf),
      isActive: group.some((entry) => entry.isActive !== false),
    };
  });
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
    if (!participant.isActive) {
      continue;
    }
    if (textIncludesMention(text, participant.id)) {
      matches.set(participant.id, participant);
    }
  }

  for (const participant of participants) {
    if (!participant.isActive) {
      continue;
    }
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
  message: ChatMessage,
  participantIdAliases: Readonly<Record<string, string>> = {}
): ChatParticipant[] {
  if (message.authors.length === 0) {
    return [];
  }

  const resolvedAuthors = new Map<string, ChatParticipant>();

  for (const authorId of message.authors) {
    let resolvedId: string | null = authorId;
    const visited = new Set<string>();

    while (resolvedId && participantIdAliases[resolvedId]) {
      if (visited.has(resolvedId)) {
        break;
      }
      visited.add(resolvedId);
      resolvedId = participantIdAliases[resolvedId] ?? null;
    }

    const participant = participants.find(
      (p) => p.id === (resolvedId ?? authorId)
    );
    if (participant) {
      resolvedAuthors.set(participant.id, participant);
    }
  }

  return Array.from(resolvedAuthors.values());
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

function parseTypingParticipantId(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }
    const trimmed = entry.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

function stringArraysEqual(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function createParticipantTypingMapKey(participantId: string): string {
  return `participant:${participantId}`;
}

function getUnreadMessagesSinceLastRead(
  messages: ChatMessage[],
  lastMessageRead: string | null
): ChatMessage[] {
  if (!lastMessageRead) {
    return messages;
  }

  const lastReadIndex = messages.findIndex(
    (message) => message.id === lastMessageRead
  );
  if (lastReadIndex < 0) {
    return messages;
  }

  return messages.slice(lastReadIndex + 1);
}

function getMostRecentProviderParticipant(
  participants: ChatParticipant[],
  messages: ChatMessage[]
): AIChatParticipant | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message) {
      continue;
    }

    for (
      let authorIndex = message.authors.length - 1;
      authorIndex >= 0;
      authorIndex -= 1
    ) {
      const authorId = message.authors[authorIndex];
      if (!authorId) {
        continue;
      }

      const participant = participants.find(
        (entry): entry is AIChatParticipant =>
          entry.isAI && !entry.isRemote && entry.id === authorId
      );
      if (participant) {
        return participant;
      }
    }
  }

  return (
    participants.find(
      (entry): entry is AIChatParticipant => entry.isAI && !entry.isRemote
    ) ?? null
  );
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
  const chatTypingMap = session.document.getMap<unknown>("chat_typing");
  const chatSelectedParticipantsMap = session.document.getMap<unknown>(
    "chat_selected_participants"
  );
  const chatProvidersMapVersion = signal(0);
  const participantAliasesMapVersion = signal(0);
  const chatTypingMapVersion = signal(0);
  const chatSelectedParticipantsMapVersion = signal(0);
  const participantIdAliases = signal<Record<string, string>>({});
  const localIsTyping = signal(false);
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
  chatTypingMap.changes.subscribe(() => {
    queueMicrotask(() => {
      chatTypingMapVersion.value += 1;
    });
  });
  chatSelectedParticipantsMap.changes.subscribe(() => {
    queueMicrotask(() => {
      chatSelectedParticipantsMapVersion.value += 1;
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
  const lastMessageRead = signal<string | null>(null);
  chats.changes.subscribe(() => {
    messages.value = readValidChats();
  });

  const unreadMessages = computed(() =>
    getUnreadMessagesSinceLastRead(messages.value, lastMessageRead.value)
  );

  const markAsRead = () => {
    const latestMessageId = messages.value.at(-1)?.id ?? null;
    lastMessageRead.value = latestMessageId;
  };

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

  const allUserParticipants = computed<UserChatParticipant[]>(() =>
    groupConnectedUsers(session.allUsers.value as ConnectedUserLike[]).map(
      (group): UserChatParticipant => ({
        id: group.id,
        userId: group.userId,
        connectionId: group.connectionId,
        profile: group.profile,
        name: group.name,
        isSelf: group.isSelf,
        isAI: false,
        isRemote: !group.isSelf,
        isActive: group.isActive,
      })
    )
  );

  const localParticipantId = computed(
    () =>
      session.currentUser.value?.userId ??
      session.currentUser.value?.connectionId ??
      null
  );

  const sharedProviderParticipants = computed<AIChatParticipant[]>(() => {
    const currentLocalParticipantId = localParticipantId.value;
    const users = allUserParticipants.value;
    void chatProvidersMapVersion.value;

    const providerParticipants: AIChatParticipant[] = [];
    chatProvidersMap.forEach((value, ownerParticipantId) => {
      const parsed = sharedAIChatParticipantArraySchema.safeParse(value);
      if (!parsed.success) {
        return;
      }
      const owner = users.find((p) => p.id === ownerParticipantId);
      if (!owner) {
        return;
      }
      providerParticipants.push(
        ...parsed.data.map(
          (p): AIChatParticipant => ({
            ...p,
            ownerParticipantId,
            userId: owner.userId,
            connectionId: owner.connectionId,
            isSelf: false,
            isRemote: ownerParticipantId !== currentLocalParticipantId,
            isActive: owner.isActive,
          })
        )
      );
    });

    return providerParticipants;
  });

  const selectedProviderParticipantIds = computed(() => {
    void chatSelectedParticipantsMapVersion.value;
    const ids = new Set<string>();
    chatSelectedParticipantsMap.forEach((value) => {
      for (const participantId of parseStringArray(value)) {
        ids.add(participantId);
      }
    });
    return ids;
  });

  const participants = computed(() => {
    const selectedIds = selectedProviderParticipantIds.value;
    return [
      ...allUserParticipants.value,
      ...sharedProviderParticipants.value.filter((p) => selectedIds.has(p.id)),
    ];
  });

  const availableParticipants = computed<ChatParticipant[]>(() => {
    const currentLocalParticipantId = localParticipantId.value;
    if (!currentLocalParticipantId) {
      return [];
    }

    const selectedIds = selectedProviderParticipantIds.value;
    return sharedProviderParticipants.value.filter(
      (participant) =>
        participant.ownerParticipantId === currentLocalParticipantId &&
        !selectedIds.has(participant.id)
    );
  });

  const typingParticipants = computed(() => {
    void chatTypingMapVersion.value;
    const typingParticipantIds = new Set<string>();
    chatTypingMap.forEach((value) => {
      const participantId = parseTypingParticipantId(value);
      if (participantId) {
        typingParticipantIds.add(participantId);
      }
    });

    return participants.value.filter(
      (participant) =>
        participant.isActive && typingParticipantIds.has(participant.id)
    );
  });

  const localProviderParticipants = computed(() => {
    const currentLocalParticipantId = localParticipantId.value;
    return currentLocalParticipantId
      ? chatProviders.value.map(
          (provider): SharedAIChatParticipant => ({
            id: createProviderParticipantId(
              currentLocalParticipantId,
              provider.id
            ),
            name: provider.name,
            isAI: true,
            providerId: provider.id,
          })
        )
      : [];
  });

  let previousLocalParticipantId: string | null = null;
  effect(() => {
    const currentLocalParticipantId = localParticipantId.value;

    session.document.transact(() => {
      if (
        previousLocalParticipantId &&
        previousLocalParticipantId !== currentLocalParticipantId
      ) {
        chatProvidersMap.delete(previousLocalParticipantId);
        chatSelectedParticipantsMap.delete(previousLocalParticipantId);
      }

      if (!currentLocalParticipantId) {
        if (previousLocalParticipantId) {
          chatProvidersMap.delete(previousLocalParticipantId);
          chatSelectedParticipantsMap.delete(previousLocalParticipantId);
        }
        previousLocalParticipantId = null;
        return;
      }

      const existingParticipants = sharedAIChatParticipantArraySchema.safeParse(
        chatProvidersMap.get(currentLocalParticipantId)
      );
      const currentValue = existingParticipants.success
        ? existingParticipants.data
        : [];
      if (!participantsMatch(currentValue, localProviderParticipants.value)) {
        chatProvidersMap.set(
          currentLocalParticipantId,
          localProviderParticipants.value
        );
      }

      const validParticipantIds = new Set(
        localProviderParticipants.value.map((participant) => participant.id)
      );
      const currentSelectedParticipantIds = parseStringArray(
        chatSelectedParticipantsMap.get(currentLocalParticipantId)
      );
      const nextSelectedParticipantIds = currentSelectedParticipantIds.filter(
        (participantId) => validParticipantIds.has(participantId)
      );

      if (nextSelectedParticipantIds.length === 0) {
        if (currentSelectedParticipantIds.length > 0) {
          chatSelectedParticipantsMap.delete(currentLocalParticipantId);
        }
      } else if (
        !stringArraysEqual(
          currentSelectedParticipantIds,
          nextSelectedParticipantIds
        )
      ) {
        chatSelectedParticipantsMap.set(
          currentLocalParticipantId,
          nextSelectedParticipantIds
        );
      }

      previousLocalParticipantId = currentLocalParticipantId;
    });
  });

  let previousLocalTypingConnectionId: string | null = null;
  effect(() => {
    const localConnectionId = session.currentUser.value?.connectionId ?? null;
    const localUserId = session.currentUser.value?.userId ?? null;
    const localParticipantId = localUserId ?? localConnectionId;

    session.document.transact(() => {
      if (
        previousLocalTypingConnectionId &&
        previousLocalTypingConnectionId !== localConnectionId
      ) {
        chatTypingMap.delete(previousLocalTypingConnectionId);
      }

      if (!localConnectionId || !localParticipantId || !localIsTyping.value) {
        if (localConnectionId) {
          chatTypingMap.delete(localConnectionId);
        }
        previousLocalTypingConnectionId = localConnectionId;
        return;
      }

      const existingTyping = parseTypingParticipantId(
        chatTypingMap.get(localConnectionId)
      );
      if (existingTyping !== localParticipantId) {
        chatTypingMap.set(localConnectionId, localParticipantId);
      }
      previousLocalTypingConnectionId = localConnectionId;
    });
  });

  effect(() => {
    void chatTypingMapVersion.value;
    const activeParticipantIds = new Set(
      participants.value
        .filter((entry) => entry.isActive)
        .map((entry) => entry.id)
    );
    const staleTypingKeys: string[] = [];

    chatTypingMap.forEach((value, key) => {
      const participantId = parseTypingParticipantId(value);
      if (!participantId || !activeParticipantIds.has(participantId)) {
        staleTypingKeys.push(key);
      }
    });

    if (staleTypingKeys.length === 0) {
      return;
    }

    session.document.transact(() => {
      for (const key of staleTypingKeys) {
        chatTypingMap.delete(key);
      }
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

        const typingKey = createParticipantTypingMapKey(participant.id);
        session.document.transact(() => {
          const existingTyping = parseTypingParticipantId(
            chatTypingMap.get(typingKey)
          );
          if (existingTyping !== participant.id) {
            chatTypingMap.set(typingKey, participant.id);
          }
        });

        try {
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
        } finally {
          session.document.transact(() => {
            chatTypingMap.delete(typingKey);
          });
        }
      })
    );
  };

  const wasMentioned = getWasMentionedSignal(participants, unreadMessages);

  const chatId = session.id;

  return {
    id: chatId,
    messages,
    unreadMessages,
    lastMessageRead,
    wasMentioned,
    markAsRead,
    sendMessage,
    setTypingStatus: (isTyping: boolean) => {
      localIsTyping.value = isTyping;
    },
    participants,
    availableParticipants,
    typingParticipants,
    addParticipant: (participantId: string) => {
      const currentLocalParticipantId = localParticipantId.value;
      if (!currentLocalParticipantId) {
        return;
      }

      const localProvider = localProviderParticipants.value.find(
        (participant) => participant.id === participantId
      );
      if (!localProvider) {
        return;
      }

      session.document.transact(() => {
        const currentSelectedParticipantIds = parseStringArray(
          chatSelectedParticipantsMap.get(currentLocalParticipantId)
        );
        if (currentSelectedParticipantIds.includes(participantId)) {
          return;
        }
        chatSelectedParticipantsMap.set(currentLocalParticipantId, [
          ...currentSelectedParticipantIds,
          participantId,
        ]);
      });

      const provider = chatProviders.value.find(
        (entry) => entry.id === localProvider.providerId
      );
      if (provider && provider.onJoinChat) {
        provider.onJoinChat({
          chatId,
          messages: messages.value,
          participants: participants.value,
        });
      }
    },
    removeParticipant: (participantId: string) => {
      const currentLocalParticipantId = localParticipantId.value;
      if (!currentLocalParticipantId) {
        return;
      }

      const localProvider = sharedProviderParticipants.value.find(
        (participant) =>
          participant.id === participantId &&
          participant.ownerParticipantId === currentLocalParticipantId
      );
      if (!localProvider) {
        return;
      }

      session.document.transact(() => {
        const currentSelectedParticipantIds = parseStringArray(
          chatSelectedParticipantsMap.get(currentLocalParticipantId)
        );
        const nextSelectedParticipantIds = currentSelectedParticipantIds.filter(
          (id) => id !== participantId
        );

        if (nextSelectedParticipantIds.length === 0) {
          chatSelectedParticipantsMap.delete(currentLocalParticipantId);
        } else if (
          !stringArraysEqual(
            currentSelectedParticipantIds,
            nextSelectedParticipantIds
          )
        ) {
          chatSelectedParticipantsMap.set(
            currentLocalParticipantId,
            nextSelectedParticipantIds
          );
        }

        chatTypingMap.delete(createParticipantTypingMapKey(participantId));
      });

      const provider = chatProviders.value.find(
        (entry) => entry.id === localProvider.providerId
      );
      if (provider && provider.onLeaveChat) {
        provider.onLeaveChat({
          chatId,
          messages: messages.value,
          participants: participants.value,
        });
      }
    },
    getMessageAuthors: (message: ChatMessage) =>
      resolveMessageAuthors(
        participants.value,
        message,
        participantIdAliases.value
      ),
  };
}

function getWasMentionedSignal(
  participants: ReadonlySignal<(UserChatParticipant | AIChatParticipant)[]>,
  unreadMessages: ReadonlySignal<
    {
      id: string;
      authors: string[];
      timeMs: number;
      targets: string[];
      type: "text";
      text: string;
    }[]
  >
) {
  return computed(() => {
    const selfParticipantIds = new Set(
      participants.value
        .filter((participant) => participant.isSelf)
        .map((participant) => participant.id)
    );
    if (selfParticipantIds.size === 0) {
      return false;
    }

    const unread = unreadMessages.value;
    if (
      unread.some((message) =>
        message.targets.some((targetId) => selfParticipantIds.has(targetId))
      )
    ) {
      return true;
    }
    return false;
  });
}

function createLocalChatSession(
  loginManager: LoginManager,
  chatProviders: Signal<ChatProvider[]>
): ChatSession {
  const localParticipant = computed<UserChatParticipant>(() => ({
    id: loginManager.userId.value ?? DEFAULT_LOCAL_PARTICIPANT_ID,
    userId: loginManager.userId.value ?? null,
    connectionId: null,
    profile: loginManager.profile.value,
    name: getParticipantName(loginManager.profile.value),
    isSelf: true,
    isAI: false,
    isRemote: false,
    isActive: true,
  }));
  const allProviderParticipants = computed<AIChatParticipant[]>(() =>
    chatProviders.value.map((provider) => ({
      id: provider.id,
      providerId: provider.id,
      ownerParticipantId: localParticipant.value.id,
      userId: loginManager.userId.value ?? null,
      connectionId: null,
      name: provider.name,
      isSelf: false,
      isAI: true,
      isRemote: false,
      isActive: localParticipant.value.isActive,
    }))
  );
  const selectedProviderParticipantIds = signal<string[]>([]);
  const providerTypingParticipantIds = signal<string[]>([]);

  effect(() => {
    const validIds = new Set(
      allProviderParticipants.value.map((participant) => participant.id)
    );
    const nextSelectedProviderParticipantIds =
      selectedProviderParticipantIds.value.filter((participantId) =>
        validIds.has(participantId)
      );
    if (
      !stringArraysEqual(
        selectedProviderParticipantIds.value,
        nextSelectedProviderParticipantIds
      )
    ) {
      selectedProviderParticipantIds.value = nextSelectedProviderParticipantIds;
    }

    const nextTypingParticipantIds = providerTypingParticipantIds.value.filter(
      (participantId) =>
        validIds.has(participantId) &&
        nextSelectedProviderParticipantIds.includes(participantId)
    );
    if (
      !stringArraysEqual(
        providerTypingParticipantIds.value,
        nextTypingParticipantIds
      )
    ) {
      providerTypingParticipantIds.value = nextTypingParticipantIds;
    }
  });

  const participants = computed<ChatParticipant[]>(() => {
    const selectedIds = new Set(selectedProviderParticipantIds.value);
    return [
      localParticipant.value,
      ...allProviderParticipants.value.filter((participant) =>
        selectedIds.has(participant.id)
      ),
    ];
  });
  const availableParticipants = computed<ChatParticipant[]>(() => {
    const selectedIds = new Set(selectedProviderParticipantIds.value);
    return allProviderParticipants.value.filter(
      (participant) => !selectedIds.has(participant.id)
    );
  });
  const messages = signal<ChatMessage[]>([]);
  const lastMessageRead = signal<string | null>(null);
  const localIsTyping = signal(false);
  const participantIdAliases = signal<Record<string, string>>({});

  let previousLocalParticipantId: string | null = null;
  effect(() => {
    const currentLocalParticipantId = localParticipant.value.id;
    if (
      previousLocalParticipantId &&
      previousLocalParticipantId !== currentLocalParticipantId &&
      participantIdAliases.value[previousLocalParticipantId] !==
        currentLocalParticipantId
    ) {
      participantIdAliases.value = {
        ...participantIdAliases.value,
        [previousLocalParticipantId]: currentLocalParticipantId,
      };
    }
    previousLocalParticipantId = currentLocalParticipantId;
  });

  const typingParticipants = computed<ChatParticipant[]>(() => {
    const typing = new Map<string, ChatParticipant>();
    if (localIsTyping.value) {
      typing.set(localParticipant.value.id, localParticipant.value);
    }

    const providerIds = new Set(providerTypingParticipantIds.value);
    for (const participant of participants.value) {
      if (participant.isAI && providerIds.has(participant.id)) {
        typing.set(participant.id, participant);
      }
    }

    return Array.from(typing.values());
  });

  const sendMessage = async (message: ChatMessageOptions) => {
    const participant = localParticipant.value;
    const resolvedTargetParticipants =
      message.type === "text"
        ? resolveMessageTargets(participants.value, message.text)
        : [];
    const defaultProviderParticipant = getMostRecentProviderParticipant(
      participants.value,
      messages.value
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

        providerTypingParticipantIds.value = Array.from(
          new Set([...providerTypingParticipantIds.value, target.id])
        );

        try {
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
        } finally {
          providerTypingParticipantIds.value =
            providerTypingParticipantIds.value.filter((id) => id !== target.id);
        }
      })
    );
  };

  const getMessageAuthors = (message: ChatMessage) =>
    resolveMessageAuthors(
      participants.value,
      message,
      participantIdAliases.value
    );

  const markAsRead = () => {
    const latestMessageId = messages.value.at(-1)?.id ?? null;
    lastMessageRead.value = latestMessageId;
  };

  const unreadMessages = computed(() =>
    getUnreadMessagesSinceLastRead(messages.value, lastMessageRead.value)
  );

  const wasMentioned = getWasMentionedSignal(participants, unreadMessages);
  const chatId = uuid();

  return {
    id: chatId,
    messages,
    unreadMessages,
    lastMessageRead,
    wasMentioned,
    markAsRead,
    sendMessage,
    setTypingStatus: (isTyping: boolean) => {
      localIsTyping.value = isTyping;
    },
    participants,
    availableParticipants,
    typingParticipants,
    addParticipant: (participantId: string) => {
      const isKnownProvider = allProviderParticipants.value.some(
        (participant) => participant.id === participantId
      );
      if (!isKnownProvider) {
        return;
      }

      if (selectedProviderParticipantIds.value.includes(participantId)) {
        return;
      }

      selectedProviderParticipantIds.value = [
        ...selectedProviderParticipantIds.value,
        participantId,
      ];

      const provider = chatProviders.value.find(
        (entry) => entry.id === participantId
      );
      if (provider && provider.onJoinChat) {
        provider.onJoinChat({
          chatId,
          messages: messages.value,
          participants: participants.value,
        });
      }
    },
    removeParticipant: (participantId: string) => {
      const nextSelectedProviderParticipantIds =
        selectedProviderParticipantIds.value.filter(
          (id) => id !== participantId
        );
      if (
        stringArraysEqual(
          selectedProviderParticipantIds.value,
          nextSelectedProviderParticipantIds
        )
      ) {
        return;
      }

      selectedProviderParticipantIds.value = nextSelectedProviderParticipantIds;
      providerTypingParticipantIds.value =
        providerTypingParticipantIds.value.filter((id) => id !== participantId);

      const provider = chatProviders.value.find(
        (entry) => entry.id === participantId
      );
      if (provider && provider.onLeaveChat) {
        provider.onLeaveChat({
          chatId,
          messages: messages.value,
          participants: participants.value,
        });
      }
    },
    getMessageAuthors,
  };
}

export function createChatsManager(loginManager: LoginManager): ChatsManager {
  const chats = signal<ChatSession[]>([]);
  const isOpen = signal<boolean>(false);
  const chatProviders = signal<ChatProvider[]>([]);
  const selectedChatId = signal<string | null>(null);
  const selectedChat = computed(
    () => chats.value.find((chat) => chat.id === selectedChatId.value) ?? null
  );
  const numberOfUnreadMessages = computed(() => {
    return chats.value.reduce(
      (acc, chat) => acc + chat.unreadMessages.value.length,
      0
    );
  });

  const wasMentioned = computed(() =>
    chats.value.some((chat) => chat.wasMentioned.value)
  );

  effect(() => {
    const currentSelectedChat = selectedChat.value;
    if (!currentSelectedChat) {
      return;
    }

    const latestMessageId =
      currentSelectedChat.messages.value.at(-1)?.id ?? null;
    if (currentSelectedChat.lastMessageRead.value === latestMessageId) {
      return;
    }

    currentSelectedChat.markAsRead();
  });

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

      for (const chat of chats.value) {
        const participant = chat.participants.value.find(
          (p) => p.isAI && !p.isRemote && p.providerId === provider.id
        );
        if (participant) {
          chat.removeParticipant(participant.id);
        }
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
    isOpen,
    chats,
    numberOfUnreadMessages,
    wasMentioned,
    createSharedSession,
    createLocalSession,
    registerProvider,
    selectedChat,
    selectChat: (chatId: string | null) => {
      selectedChatId.value = chatId;
    },
  };
}
