import { signal, type Signal } from "@preact/signals";
import type {
  ChatProvider,
  ChatSession,
  ChatsManager,
} from "@packages/seed-bible/seed-bible/managers/ChatsManager";

export interface MockChatsResult {
  chats: ChatsManager;
  createLocalSession: ReturnType<typeof vi.fn>;
  selectChat: ReturnType<typeof vi.fn>;
  addParticipant: ReturnType<typeof vi.fn>;
  providers: Signal<ChatProvider[]>;
}

export function createMockProvider(
  id: string,
  name = id,
  supportsToolCalling = true
): ChatProvider {
  return {
    id,
    name,
    supportsSharedChats: false,
    supportsToolCalling,
  } as unknown as ChatProvider;
}

/**
 * A fake `ChatsManager` exposing just the surface the playlist editor's AI
 * button uses: the providers, and starting/selecting a local chat.
 */
export function createMockChats(
  providers: ChatProvider[] = [],
  existingChats: ChatSession[] = []
): MockChatsResult {
  const selectChat = vi.fn();
  const addParticipant = vi.fn();
  const createLocalSession = vi.fn(() => ({ id: "chat-1", addParticipant }));
  const providersSignal = signal(providers);
  const chats = {
    chats: signal(existingChats),
    createLocalSession,
    selectChat,
    providers: providersSignal,
    composerDraft: signal(""),
  } as unknown as ChatsManager;
  return {
    chats,
    createLocalSession,
    selectChat,
    addParticipant,
    providers: providersSignal,
  };
}
