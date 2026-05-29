import { computed, signal, type ReadonlySignal } from "@preact/signals";
import { z } from "zod";
import type { BibleReadingSession } from "seed-bible.managers.SessionsManager";

export const chatMessageBaseSchema = z.object({
  /**
   * The ID of the message, which should be unique within the chat session.
   */
  id: z.string(),

  /**
   * The ID of the user who sent the message.
   * Null if the user is anonymous.
   */
  authorId: z.string().nullable(),

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
  textChatMessageSchema.omit({ timeMs: true, id: true, authorId: true }),
]);

export type ChatMessageOptions = z.infer<typeof chatMessageOptionsSchema>;

export interface ChatParticipant {
  id: string;
  name: string;
}

export interface ChatSession {
  /** Chat messages ordered from oldest to most recent. */
  messages: ReadonlySignal<ChatMessage[]>;
  /** Sends a message and notifies the other participants. */
  sendMessage: (message: ChatMessage) => Promise<void>;
  participants: ReadonlySignal<ChatParticipant[]>;

  /**
   * Gets the author of a given message. Returns null if the author is anonymous or has left the session.
   * @param message The message to get the author of.
   * @returns The author of the message, or null if the author is anonymous or has left the session.
   */
  getMessageAuthor: (message: ChatMessage) => ChatParticipant | null;
}

export interface ChatsManager {
  createSharedSession: (session: BibleReadingSession) => ChatSession;
}

function createSharedChatSession(session: BibleReadingSession): ChatSession {
  const chats = session.document.getArray<unknown>("chats");

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

  const participants = computed(() =>
    session.connectedUsers.value.map((user) => ({
      id: user.userId ?? user.connectionId,
      name:
        (user.profile?.name && user.profile.name.trim().length > 0
          ? user.profile.name
          : null) ??
        user.userId ??
        user.connectionId,
    }))
  );

  const sendMessage = async (message: ChatMessageOptions) => {
    const validMessage = chatMessageOptionsSchema.parse(message);

    chats.push({
      id: uuid(),
      timeMs: Date.now(),
      authorId:
        session.currentUser.value?.userId ??
        session.currentUser.value?.connectionId ??
        null,
      ...validMessage,
    });
  };

  return {
    messages,
    sendMessage,
    participants,
    getMessageAuthor: (message: ChatMessage) => {
      if (!message.authorId) {
        return null;
      }
      return (
        participants.value.find(
          (participant) => participant.id === message.authorId
        ) ?? null
      );
    },
  };
}

export function createChatsManager(): ChatsManager {
  return {
    createSharedSession: createSharedChatSession,
  };
}
