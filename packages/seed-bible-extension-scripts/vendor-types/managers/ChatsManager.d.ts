import { Signal, type ReadonlySignal } from "@preact/signals";
import { z } from "zod";
import type { LoginManager, UserProfile } from "./LoginManager";
import {
  type BibleReadingSession,
  type ConnectedSessionUser,
  type ConnectionSessionUserVisual,
} from "./SessionsManager";
import type { TranslatableTitle } from "./BibleToolsManager";
import type { VerseRef } from "./BibleDataManager";
import type { I18nManager } from "../i18n/I18nManager";
import { type i18n } from "i18next";
export declare const chatMessageBaseSchema: z.ZodObject<
  {
    id: z.ZodString;
    authors: z.ZodArray<z.ZodString>;
    timeMs: z.ZodNumber;
    targets: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<true>]>;
  },
  z.core.$strip
>;
export declare const textChatMessageSchema: z.ZodObject<
  {
    id: z.ZodString;
    authors: z.ZodArray<z.ZodString>;
    timeMs: z.ZodNumber;
    targets: z.ZodUnion<readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<true>]>;
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
  },
  z.core.$strip
>;
export declare const chatMessageSchema: z.ZodDiscriminatedUnion<
  [
    z.ZodObject<
      {
        id: z.ZodString;
        authors: z.ZodArray<z.ZodString>;
        timeMs: z.ZodNumber;
        targets: z.ZodUnion<
          readonly [z.ZodArray<z.ZodString>, z.ZodLiteral<true>]
        >;
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
      },
      z.core.$strip
    >,
  ],
  "type"
>;
export type ChatMessageBase = z.infer<typeof chatMessageBaseSchema>;
export type TextChatMessage = z.infer<typeof textChatMessageSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export declare const chatMessageOptionsSchema: z.ZodDiscriminatedUnion<
  [
    z.ZodObject<
      {
        type: z.ZodLiteral<"text">;
        text: z.ZodString;
      },
      z.core.$strip
    >,
  ],
  "type"
>;
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
export interface ParsedChatTextMessage extends ChatMessageBase {
  type: "text";
  /** The original text of the message. */
  text: string;
  /**
   * The parts of the text.
   */
  parts: ParsedTextPart[];
}
export type ParsedTextPart =
  | string
  | ParsedTextMentionPart
  | ParsedVerseReferencePart;
export interface ParsedTextMentionPart {
  type: "mention";
  text: string;
  participant: ChatParticipant | null;
}
export interface ParsedVerseReferencePart {
  type: "verse_reference";
  /**
   * The original text of the verse reference, e.g. "John 3:16-17".
   */
  text: string;
  /** The verse reference. */
  ref: VerseRef;
}
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
  /**
   * The unix time in milliseconds when this participant joined the chat.
   */
  joinTimeMs: number;
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
export interface ChatSession {
  /**
   * The ID of the chat.
   */
  id: string;
  /** Chat messages ordered from oldest to most recent. */
  messages: ReadonlySignal<ChatMessage[]>;
  /** Parsed chat messages ordered from oldest to most recent. */
  parsedMessages: ReadonlySignal<ParsedChatTextMessage[]>;
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
export interface ChatSessionHistory {
  messages: ChatMessage[];
  providerIds: string[];
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
  createLocalSession: (history?: ChatSessionHistory) => ChatSession;
  registerProvider: (provider: ChatProvider) => () => void;
  selectChat: (chatId: string | null) => void;
}
export declare function resolveMessageTargets(
  participants: ChatParticipant[],
  text: string,
  i18n: i18n
): ChatParticipant[];
export declare function createChatsManager(
  loginManager: LoginManager,
  i18nManager: I18nManager
): ChatsManager;
