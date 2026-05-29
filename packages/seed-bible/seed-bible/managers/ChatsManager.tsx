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
  textChatMessageSchema.omit({ timeMs: true, id: true, authors: true }),
]);

export type ChatMessageOptions = z.infer<typeof chatMessageOptionsSchema>;

export interface ChatContext {
  messages: ChatMessage[];
  participant: ChatParticipant;
}

export interface ChatProvider {
  /** The name of the chat provider. */
  name: string;
  /** The ID of the chat provider. */
  id: string;
  /** Generates a response for the given chat context. */
  generateResponse: (
    context: ChatContext
  ) => ChatMessageOptions | Promise<ChatMessageOptions>;
}

export interface ChatParticipant {
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

export type RemoteChatParticipant = Omit<
  ChatParticipant,
  "isSelf" | "isRemote"
>;

const chatParticipantSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  isAI: z.boolean(),
});

const chatParticipantArraySchema = z.array(chatParticipantSchema);

export interface ChatSession {
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
  createSharedSession: (session: BibleReadingSession) => ChatSession;
  createLocalSession: () => ChatSession;
  registerProvider: (provider: ChatProvider) => () => void;
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

function createChatMessage(
  options: ChatMessageOptions,
  authorId: string | null
): ChatMessage {
  const validMessage = chatMessageOptionsSchema.parse(options);
  return {
    id: uuid(),
    timeMs: Date.now(),
    authors: authorId ? [authorId] : [],
    ...validMessage,
  };
}

function createSharedChatSession(
  session: BibleReadingSession,
  chatProviders: Signal<ChatProvider[]>
): ChatSession {
  const chats = session.document.getArray<unknown>("chats");
  const chatProvidersMap = session.document.getMap<unknown>("chat_providers");
  const chatProvidersMapVersion = signal(0);
  chatProvidersMap.changes.subscribe(() => {
    // Avoid updating reactive graph synchronously during shared-doc
    // transactions to prevent dependency cycles.
    queueMicrotask(() => {
      chatProvidersMapVersion.value += 1;
    });
  });

  const participantsMatch = (
    left: RemoteChatParticipant[],
    right: RemoteChatParticipant[]
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

  const participants = computed(() => {
    const localParticipantId =
      session.currentUser.value?.userId ??
      session.currentUser.value?.connectionId ??
      null;

    const connectedParticipants = session.connectedUsers.value.map((user) => ({
      id: user.userId ?? user.connectionId,
      name:
        (user.profile?.name && user.profile.name.trim().length > 0
          ? user.profile.name
          : null) ?? null,
      isSelf: user.isSelf,
      isAI: false,
      isRemote: !user.isSelf,
    }));

    void chatProvidersMapVersion.value;
    const sharedProviderParticipants: ChatParticipant[] = [];
    chatProvidersMap.forEach((value, ownerParticipantId) => {
      const parsed = chatParticipantArraySchema.safeParse(value);
      if (!parsed.success) {
        return;
      }
      sharedProviderParticipants.push(
        ...parsed.data.map((p) => ({
          ...p,
          isSelf: false,
          isRemote: ownerParticipantId !== localParticipantId,
        }))
      );
    });

    return [...connectedParticipants, ...sharedProviderParticipants];
  });

  let previousLocalParticipantId: string | null = null;
  effect(() => {
    const localParticipantId =
      session.currentUser.value?.userId ??
      session.currentUser.value?.connectionId ??
      null;

    const localProviderParticipants = localParticipantId
      ? chatProviders.value.map((provider) => ({
          id: `${localParticipantId}_${provider.id}`,
          name: provider.name,
          isAI: true,
        }))
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

      const existingParticipants = chatParticipantArraySchema.safeParse(
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
    chats.push(
      createChatMessage(
        message,
        session.currentUser.value?.userId ??
          session.currentUser.value?.connectionId ??
          null
      )
    );
  };

  return {
    messages,
    sendMessage,
    participants,
    getMessageAuthors: (message: ChatMessage) => {
      if (message.authors.length === 0) {
        return [];
      }
      return message.authors
        .map((id) => participants.value.find((p) => p.id === id))
        .filter((p) => p) as ChatParticipant[];
    },
  };
}

function createLocalChatSession(
  loginManager: LoginManager,
  chatProviders: Signal<ChatProvider[]>
): ChatSession {
  const localParticipant = computed<ChatParticipant>(() => ({
    id: loginManager.userId.value ?? DEFAULT_LOCAL_PARTICIPANT_ID,
    name: getParticipantName(loginManager.profile.value),
    isSelf: true,
    isAI: false,
    isRemote: false,
  }));
  const chatProviderParticipants = computed<ChatParticipant[]>(() =>
    chatProviders.value.map((provider) => ({
      id: provider.id,
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
    messages.value = [
      ...messages.value,
      createChatMessage(message, participant.id),
    ];
  };

  const getMessageAuthors = (message: ChatMessage) => {
    if (message.authors.length === 0) {
      return [];
    }
    return message.authors
      .map((id) => participants.value.find((p) => p.id === id))
      .filter((p) => p) as ChatParticipant[];
  };

  return {
    messages,
    sendMessage,
    participants,
    getMessageAuthors,
  };
}

export function createChatsManager(loginManager: LoginManager): ChatsManager {
  const chatProviders = signal<ChatProvider[]>([]);

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

  return {
    createSharedSession: (session) =>
      createSharedChatSession(session, chatProviders),
    createLocalSession: () =>
      createLocalChatSession(loginManager, chatProviders),
    registerProvider,
  };
}
