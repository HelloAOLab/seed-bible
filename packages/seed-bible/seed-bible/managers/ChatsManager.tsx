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
import {
  getSelfVisualKey,
  getUserAnimalVisual,
  type BibleReadingSession,
  type ConnectedSessionUser,
  type ConnectionSessionUserVisual,
} from "seed-bible.managers.SessionsManager";
import type { TranslatableTitle } from "./BibleToolsManager";
import i18n from "https://esm.sh/i18next@23.16.8";
import { translateTitle } from "../components/Utils";

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
   * The IDs of the participants targeted by the message, or true if the message targets everyone.
   */
  targets: z.union([z.array(z.string()), z.literal(true)]),
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

export type ChatProviderTextStream =
  | Iterable<string>
  | AsyncIterable<string>
  | Iterator<string>
  | AsyncIterator<string>;

export interface StreamingTextChatMessageOptions {
  type: "text";
  text: ChatProviderTextStream;
}

export type ChatProviderMessageOptions =
  | ChatMessageOptions
  | StreamingTextChatMessageOptions;

export interface ChatContext {
  chatId: string;
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
  name: TranslatableTitle;
  /** The ID of the chat provider */
  id: string;

  /** An optional URL to an icon image for this provider. */
  iconUrl?: string;

  /** Whether this provider supports being added to shared chats. If false, then the provider can only be used in local (single user) chats. */
  supportsSharedChats: boolean;

  /** Generates a response for the given chat context. */
  generateResponse: (
    context: ChatContext
  ) =>
    | ChatProviderMessageOptions
    | Promise<ChatProviderMessageOptions | null>
    | null;
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
  name: TranslatableTitle | null;

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

  /** The session user associated with this participant, if available. */
  sessionUser?: ConnectedSessionUser | null;

  /**
   * The visual information for this participant.
   */
  visual: ConnectionSessionUserVisual;

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

  /** An optional URL to an icon image for this AI participant's provider. */
  iconUrl?: string | null;

  isSelf: false;
  isAI: true;
}

export type ChatParticipant = UserChatParticipant | AIChatParticipant;

const sharedAIChatParticipantSchema = z.object({
  id: z.string(),
  providerId: z.string(),
  name: z.string().nullable(),
  isAI: z.literal(true),
  iconUrl: z.string().optional(),
});

type SharedAIChatParticipant = z.infer<typeof sharedAIChatParticipantSchema>;

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

  /**
   * Marks messages as read.
   * If `messageId` is provided, advances `lastMessageRead` to that ID only if it is more recent than the current value.
   * If omitted, advances `lastMessageRead` to the most recent message.
   */
  markAsRead: (messageId?: string) => void;
  /** Sends a message and notifies the other participants. */
  sendMessage: (message: ChatMessageOptions) => Promise<void>;
  /** Updates whether the local participant is currently typing. */
  setTypingStatus: (isTyping: boolean) => void;
  /** Active participants only. */
  participants: ReadonlySignal<ChatParticipant[]>;
  /** All participants, including inactive ones. */
  totalParticipants: ReadonlySignal<ChatParticipant[]>;
  /**
   * Only inactive participants.
   */
  inactiveParticipants: ReadonlySignal<ChatParticipant[]>;
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

export interface SharedChatSession extends ChatSession {
  isShared: true;
  session: BibleReadingSession;
}

export interface ChatsManager {
  isOpen: Signal<boolean>;
  chats: ReadonlySignal<ChatSession[]>;
  providers: ReadonlySignal<ChatProvider[]>;
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

type GroupedConnectedUser = {
  id: string;
  userId: string | null;
  connectionId: string | null;
  profile: UserProfile | null;
  sessionUser: ConnectedSessionUser | null;
  name: string | null;
  isSelf: boolean;
  isActive: boolean;
};

function groupConnectedUsers(
  users: ConnectedSessionUser[]
): GroupedConnectedUser[] {
  const groups = new Map<string, ConnectedSessionUser[]>();

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
      sessionUser: representative,
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
  targets: string[] | true,
  metadata?: {
    id?: string;
    timeMs?: number;
  }
): ChatMessage {
  const validMessage = chatMessageOptionsSchema.parse(options);
  return {
    id: metadata?.id ?? uuid(),
    timeMs: metadata?.timeMs ?? Date.now(),
    authors,
    targets,
    ...validMessage,
  };
}

function createProviderParticipantId(
  ownerConnectionId: string,
  providerId: string
): string {
  return `${ownerConnectionId}_${providerId}`;
}

function toAsyncTextIterator(
  stream: ChatProviderTextStream
): AsyncIterator<string> {
  if (
    typeof (stream as AsyncIterable<string>)[Symbol.asyncIterator] ===
    "function"
  ) {
    return (stream as AsyncIterable<string>)[Symbol.asyncIterator]();
  }
  if (typeof (stream as Iterable<string>)[Symbol.iterator] === "function") {
    const iterator = (stream as Iterable<string>)[Symbol.iterator]();
    return {
      next: async () => {
        const next = iterator.next();
        return {
          done: next.done ?? false,
          value: (next.value ?? "") as string,
        };
      },
    };
  }
  if (typeof (stream as AsyncIterator<string>).next === "function") {
    return stream as AsyncIterator<string>;
  }

  return {
    next: async () => ({
      done: true,
      value: undefined as unknown as string,
    }),
  };
}

async function consumeProviderTextStream(options: {
  stream: ChatProviderTextStream;
  onChunk: (currentText: string) => void;
}): Promise<string> {
  const iterator = toAsyncTextIterator(options.stream);
  let text = "";

  while (true) {
    const next = await iterator.next();
    if (next.done) {
      break;
    }
    if (typeof next.value !== "string") {
      continue;
    }

    text += next.value;
    options.onChunk(text);
  }

  return text;
}

function upsertMessageInList(
  messages: ChatMessage[],
  nextMessage: ChatMessage
) {
  const existingIndex = messages.findIndex(
    (message) => message.id === nextMessage.id
  );
  if (existingIndex < 0) {
    return [...messages, nextMessage];
  }
  return messages.map((message, index) =>
    index === existingIndex ? nextMessage : message
  );
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

function textMentionsEveryone(text: string): boolean {
  return textIncludesMention(text, "everyone");
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
    if (
      textIncludesMention(text, participant.id) ||
      textIncludesMention(text, participant.id.slice(0, 6))
    ) {
      matches.set(participant.id, participant);
    }
  }

  for (const participant of participants) {
    if (!participant.isActive) {
      continue;
    }
    if (!participant.name) {
      continue;
    }

    const name = participant.name;
    if (typeof name === "string" && !textIncludesMention(text, name)) {
      continue;
    } else if (typeof name === "object") {
      const { t } = i18n;
      const translatedName = translateTitle(t, name);
      if (!textIncludesMention(text, translatedName)) {
        continue;
      }
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

function stringArraysEqual(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
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
): SharedChatSession {
  const chats = session.document.getArray<unknown>("chats");
  const chatProvidersMap = session.document.getMap<unknown>("chat_providers");
  const participantAliasesMap = session.document.getMap<unknown>(
    "chat_participant_aliases"
  );
  const chatTypingMap = session.document.getMap<boolean>("chat_typing");
  const chatProvidersMapVersion = signal(0);
  const participantAliasesMapVersion = signal(0);
  const chatTypingMapVersion = signal(0);
  const participantIdAliases = signal<Record<string, string>>({});
  const localIsTyping = signal(false);
  const selectedProviderParticipantIds = signal<string[]>([]);
  chatProvidersMap.changes.subscribe(() => {
    // Avoid updating reactive graph synchronously during shared-doc
    // transactions to prevent dependency cycles.
    window.queueMicrotask(() => {
      chatProvidersMapVersion.value += 1;
    });
  });
  participantAliasesMap.changes.subscribe(() => {
    window.queueMicrotask(() => {
      participantAliasesMapVersion.value += 1;
    });
  });
  chatTypingMap.changes.subscribe(() => {
    window.queueMicrotask(() => {
      chatTypingMapVersion.value += 1;
    });
  });

  const readValidChats = (): ChatMessage[] => {
    const validMessages = chats
      .toArray()
      .map((rawMessage) => {
        const parsed = chatMessageSchema.safeParse(rawMessage);
        return parsed.success ? parsed.data : null;
      })
      .filter((message): message is ChatMessage => message !== null);

    // Keep only the latest version of each message ID to support streaming
    // updates when a shared array backend cannot replace items in place.
    const deduped = new Map<string, ChatMessage>();
    for (const message of validMessages) {
      deduped.set(message.id, message);
    }
    return Array.from(deduped.values()).sort((a, b) => a.timeMs - b.timeMs);
  };

  const messages = signal<ChatMessage[]>(readValidChats());
  const lastMessageRead = signal<string | null>(null);
  chats.changes.subscribe(() => {
    messages.value = readValidChats();
  });

  const upsertSharedMessage = (nextMessage: ChatMessage) => {
    session.document.transact(() => {
      const existingMessages = chats.toArray();
      const existingIndex = existingMessages.findIndex(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          (entry as { id?: unknown }).id === nextMessage.id
      );

      if (existingIndex >= 0 && typeof chats.delete === "function") {
        chats.delete(existingIndex, 1);
        if (typeof chats.insert === "function") {
          chats.insert(existingIndex, [nextMessage]);
          return;
        }
      }

      chats.push(nextMessage);
    });
  };

  const unreadMessages = computed(() =>
    getUnreadMessagesSinceLastRead(messages.value, lastMessageRead.value)
  );

  const markAsRead = (messageId?: string) => {
    const msgs = messages.value;
    if (messageId !== undefined) {
      const newIndex = msgs.findIndex((m) => m.id === messageId);
      if (newIndex < 0) return;
      const currentIndex = lastMessageRead.value
        ? msgs.findIndex((m) => m.id === lastMessageRead.value)
        : -1;
      if (newIndex > currentIndex) {
        lastMessageRead.value = messageId;
      }
    } else {
      lastMessageRead.value = msgs.at(-1)?.id ?? null;
    }
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
    groupConnectedUsers(session.allUsers.value).map(
      (group): UserChatParticipant => ({
        id: group.id,
        userId: group.userId,
        connectionId: group.connectionId,
        profile: group.profile,
        sessionUser: group.sessionUser,
        visual: group.sessionUser?.visual ?? getUserAnimalVisual(group.id),
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

  const localParticipant = computed(
    () => allUserParticipants.value.find((p) => p.isSelf) ?? null
  );

  const sharedProviderParticipants = computed<AIChatParticipant[]>(() => {
    const currentLocalParticipantId = localParticipantId.value;
    const users = allUserParticipants.value;
    void chatProvidersMapVersion.value;

    const providerParticipants: AIChatParticipant[] = [];
    chatProvidersMap.forEach((value, ownerParticipantId) => {
      const parsed = sharedAIChatParticipantArraySchema.safeParse(value);
      if (!parsed.success) {
        console.error(
          "Invalid chat provider data for participant ID",
          ownerParticipantId,
          parsed.error
        );
        return;
      }
      const owner = users.find((p) => p.id === ownerParticipantId);
      if (!owner) {
        console.error("Owner not found for shared participant", value);
        return;
      }
      const isRemote = ownerParticipantId !== currentLocalParticipantId;

      for (const p of parsed.data) {
        if (!isRemote) {
          const localParticipants = localProviderParticipants.peek();
          const localParticipant = localParticipants.find((l) => l.id === p.id);

          if (localParticipant) {
            providerParticipants.push(localParticipant);
            continue;
          }
        }

        providerParticipants.push({
          ...p,
          ownerParticipantId,
          userId: owner.userId,
          connectionId: owner.connectionId,
          isSelf: false,
          isRemote,
          isActive: owner.isActive,
        });
      }
    });

    return providerParticipants;
  });

  const totalParticipants = computed(() => {
    return [...allUserParticipants.value, ...sharedProviderParticipants.value];
  });

  const participants = computed(() =>
    totalParticipants.value.filter((p) => p.isActive)
  );

  const inactiveParticipants = computed(() =>
    totalParticipants.value.filter((p) => !p.isActive)
  );

  const typingParticipants = computed(() => {
    void chatTypingMapVersion.value;
    const typingParticipantIds = new Set<string>();

    chatTypingMap.forEach((value, participantId) => {
      if (value) {
        typingParticipantIds.add(participantId);
      }
    });

    return participants.value.filter(
      (participant) =>
        participant.isActive && typingParticipantIds.has(participant.id)
    );
  });

  const localProviderParticipants = computed<AIChatParticipant[]>(() => {
    const p = localParticipant.value;
    if (!p) {
      return [];
    }
    return chatProviders.value
      .filter((p) => p.supportsSharedChats)
      .map((provider) => ({
        id: createProviderParticipantId(p.connectionId ?? p.id, provider.id),
        providerId: provider.id,
        ownerParticipantId: p.id,
        userId: p.userId ?? null,
        connectionId: p.connectionId ?? null,
        name: provider.name,
        iconUrl: provider.iconUrl ?? null,
        isSelf: false,
        isAI: true,
        isRemote: false,
        isActive: p.isActive,
      }));
  });

  const selectedProviderParticipants = computed(() => {
    const selectedIds = new Set(selectedProviderParticipantIds.value);
    return localProviderParticipants.value.filter((participant) =>
      selectedIds.has(participant.id)
    );
  });

  const availableParticipants = computed<ChatParticipant[]>(() => {
    const currentLocalParticipantId = localParticipantId.value;
    if (!currentLocalParticipantId) {
      return [];
    }

    const selectedIds = new Set(selectedProviderParticipantIds.value);
    return localProviderParticipants.value.filter(
      (p) => !selectedIds.has(p.id)
    );
  });

  effect(() => {
    if (!localParticipantId.value) {
      return;
    }
    const isTyping = localIsTyping.value;
    chatTypingMap.set(localParticipantId.value, isTyping);
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
      }

      if (!currentLocalParticipantId) {
        if (previousLocalParticipantId) {
          chatProvidersMap.delete(previousLocalParticipantId);
        }
        previousLocalParticipantId = null;
        return;
      }

      // const existingParticipants = sharedAIChatParticipantArraySchema.safeParse(
      //   chatProvidersMap.get(currentLocalParticipantId)
      // );
      // const currentValue = existingParticipants.success
      //   ? existingParticipants.data
      //   : [];
      // if (!participantsMatch(currentValue, localProviderParticipants.value)) {
      // }
      chatProvidersMap.set(
        currentLocalParticipantId,
        selectedProviderParticipants.value.map(
          (p): SharedAIChatParticipant => ({
            id: p.id,
            providerId: p.providerId,
            name: p.name ? translateTitle(i18n.t, p.name) : null,
            isAI: p.isAI,
          })
        )
      );

      previousLocalParticipantId = currentLocalParticipantId;
    });
  });

  const addSharedProviderParticipant = (participantId: string) => {
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

    if (selectedProviderParticipantIds.value.includes(participantId)) {
      return;
    }

    selectedProviderParticipantIds.value = [
      ...selectedProviderParticipantIds.value,
      participantId,
    ];

    const provider = chatProviders.value.find(
      (entry) => entry.id === localProvider.providerId
    );
    if (provider?.onJoinChat) {
      provider.onJoinChat({
        chatId,
        messages: messages.value,
        participants: participants.value,
      });
    }
  };

  const setParticipantTyping = (participantId: string, isTyping: boolean) => {
    session.document.transact(() => {
      if (isTyping) {
        chatTypingMap.set(participantId, true);
      } else {
        chatTypingMap.delete(participantId);
      }
    });
  };

  const sendMessage = async (message: ChatMessageOptions) => {
    const authorId =
      session.currentUser.value?.userId ??
      session.currentUser.value?.connectionId ??
      null;

    const isEveryoneMentioned =
      message.type === "text" && textMentionsEveryone(message.text);

    // Auto-add available participants that are mentioned before resolving targets
    const mentionedAvailable =
      !isEveryoneMentioned && message.type === "text"
        ? resolveMessageTargetsWithAliases(
            availableParticipants.value,
            message.text,
            participantIdAliases.value
          )
        : [];
    for (const newParticipant of mentionedAvailable) {
      addSharedProviderParticipant(newParticipant.id);
    }

    const targetParticipants: ChatParticipant[] = isEveryoneMentioned
      ? participants.value.filter((p) => p.isActive && p.isAI && !p.isRemote)
      : message.type === "text"
        ? resolveMessageTargetsWithAliases(
            [...participants.value, ...mentionedAvailable],
            message.text,
            participantIdAliases.value
          )
        : [];
    const messageTargets: string[] | true = isEveryoneMentioned
      ? true
      : targetParticipants.map((participant) => participant.id);
    const nextMessage = createChatMessage(
      message,
      authorId ? [authorId] : [],
      messageTargets
    );

    chats.push(nextMessage);

    for (const participant of targetParticipants) {
      void (async () => {
        if (!participant.isAI || participant.isRemote || !authorId) {
          return;
        }

        const provider = chatProviders.value.find(
          (entry) => entry.id === participant.providerId
        );
        if (!provider) {
          return;
        }

        setParticipantTyping(participant.id, true);

        try {
          const response = await provider.generateResponse({
            chatId,
            messages: [...messages.value, nextMessage],
            participant,
            participants: participants.value,
          });
          if (!response) {
            return;
          }

          const streamingText =
            response.type === "text" && typeof response.text !== "string"
              ? response.text
              : null;

          if (streamingText) {
            const messageId = uuid();
            const messageTimeMs = Date.now();

            const upsertStreamingResponse = (text: string) => {
              const responseTargets = resolveMessageTargets(
                participants.value,
                text
              );
              const nextResponseMessage = createChatMessage(
                {
                  type: "text",
                  text,
                },
                [participant.id],
                responseTargets.map((target) => target.id),
                {
                  id: messageId,
                  timeMs: messageTimeMs,
                }
              );
              upsertSharedMessage(nextResponseMessage);
            };

            const finalText = await consumeProviderTextStream({
              stream: streamingText,
              onChunk: upsertStreamingResponse,
            });
            upsertStreamingResponse(finalText);
            return;
          }

          if (response.type !== "text" || typeof response.text !== "string") {
            return;
          }

          const responseTargets = resolveMessageTargets(
            participants.value,
            response.text
          );
          chats.push(
            createChatMessage(
              {
                type: "text",
                text: response.text,
              },
              [participant.id],
              responseTargets.map((target) => target.id)
            )
          );
        } finally {
          setParticipantTyping(participant.id, false);
        }
      })();
    }
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
    totalParticipants,
    inactiveParticipants,
    availableParticipants,
    typingParticipants,
    addParticipant: addSharedProviderParticipant,
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

      selectedProviderParticipantIds.value =
        selectedProviderParticipantIds.value.filter(
          (id) => id !== participantId
        );

      setParticipantTyping(participantId, false);

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
        totalParticipants.value,
        message,
        participantIdAliases.value
      ),
    isShared: true,
    session,
  };
}

function getWasMentionedSignal(
  participants: ReadonlySignal<(UserChatParticipant | AIChatParticipant)[]>,
  unreadMessages: ReadonlySignal<
    {
      id: string;
      authors: string[];
      timeMs: number;
      targets: string[] | true;
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
      unread.some(
        (message) =>
          message.targets === true ||
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
    visual: getUserAnimalVisual(getSelfVisualKey(loginManager.userId.value)),
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
      iconUrl: provider.iconUrl ?? null,
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

  const totalParticipants = computed<ChatParticipant[]>(() => {
    const selectedIds = new Set(selectedProviderParticipantIds.value);
    return [
      localParticipant.value,
      ...allProviderParticipants.value.filter((participant) =>
        selectedIds.has(participant.id)
      ),
    ];
  });

  const participants = computed<ChatParticipant[]>(() =>
    totalParticipants.value.filter((p) => p.isActive)
  );

  const inactiveParticipants = computed(() =>
    totalParticipants.value.filter((p) => !p.isActive)
  );

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

  const addLocalProviderParticipant = (participantId: string) => {
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
    if (provider?.onJoinChat) {
      provider.onJoinChat({
        chatId,
        messages: messages.value,
        participants: participants.value,
      });
    }
  };

  const sendMessage = async (message: ChatMessageOptions) => {
    const participant = localParticipant.value;

    const isEveryoneMentioned =
      message.type === "text" && textMentionsEveryone(message.text);

    // Auto-add available participants that are mentioned
    if (message.type === "text") {
      const toAdd = isEveryoneMentioned
        ? availableParticipants.value
        : resolveMessageTargets(availableParticipants.value, message.text);
      for (const newParticipant of toAdd) {
        addLocalProviderParticipant(newParticipant.id);
      }
    }

    let messageTargets: string[] | true;
    let providerTargets: AIChatParticipant[];
    if (isEveryoneMentioned) {
      messageTargets = true;
      providerTargets = participants.value.filter(
        (p): p is AIChatParticipant => p.isAI && !p.isRemote && p.isActive
      );
    } else {
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
      messageTargets = targetParticipants.map((target) => target.id);
      providerTargets = targetParticipants.filter(
        (target): target is AIChatParticipant => target.isAI && !target.isRemote
      );
    }
    const nextMessage = createChatMessage(
      message,
      participant.id ? [participant.id] : [],
      messageTargets
    );

    messages.value = [...messages.value, nextMessage];

    for (const target of providerTargets) {
      void (async () => {
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
            chatId,
            messages: [...messages.value],
            participant: target,
            participants: participants.value,
          });
          if (!response) {
            return;
          }

          const streamingText =
            response.type === "text" && typeof response.text !== "string"
              ? response.text
              : null;

          if (streamingText) {
            const messageId = uuid();
            const messageTimeMs = Date.now();

            const upsertStreamingResponse = (text: string) => {
              const responseTargets = resolveMessageTargets(
                participants.value,
                text
              );
              const nextResponseMessage = createChatMessage(
                {
                  type: "text",
                  text,
                },
                [target.id],
                responseTargets.map((entry) => entry.id),
                {
                  id: messageId,
                  timeMs: messageTimeMs,
                }
              );
              messages.value = upsertMessageInList(
                messages.value,
                nextResponseMessage
              );
            };

            const finalText = await consumeProviderTextStream({
              stream: streamingText,
              onChunk: upsertStreamingResponse,
            });
            upsertStreamingResponse(finalText);
            return;
          }

          if (response.type !== "text" || typeof response.text !== "string") {
            return;
          }

          const responseTargets = resolveMessageTargets(
            participants.value,
            response.text
          );
          messages.value = [
            ...messages.value,
            createChatMessage(
              {
                type: "text",
                text: response.text,
              },
              [target.id],
              responseTargets.map((entry) => entry.id)
            ),
          ];
        } finally {
          providerTypingParticipantIds.value =
            providerTypingParticipantIds.value.filter((id) => id !== target.id);
        }
      })();
    }
  };

  const getMessageAuthors = (message: ChatMessage) =>
    resolveMessageAuthors(
      totalParticipants.value,
      message,
      participantIdAliases.value
    );

  const markAsRead = (messageId?: string) => {
    const msgs = messages.value;
    if (messageId !== undefined) {
      const newIndex = msgs.findIndex((m) => m.id === messageId);
      if (newIndex < 0) return;
      const currentIndex = lastMessageRead.value
        ? msgs.findIndex((m) => m.id === lastMessageRead.value)
        : -1;
      if (newIndex > currentIndex) {
        lastMessageRead.value = messageId;
      }
    } else {
      lastMessageRead.value = msgs.at(-1)?.id ?? null;
    }
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
    totalParticipants,
    inactiveParticipants,
    availableParticipants,
    typingParticipants,
    addParticipant: addLocalProviderParticipant,
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
    providers: chatProviders,
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
