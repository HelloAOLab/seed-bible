export interface ChatMessage {
  text: string;
}

export interface ChatParticipant {
  id: string;
  onMessage?: (message: ChatMessage) => void | Promise<void>;
}

export interface ChatSession {
  /** Chat messages ordered from oldest to most recent. */
  messages: ChatMessage[];
  /** Sends a message and notifies the other participants. */
  sendMessage: (message: ChatMessage) => Promise<void>;
  participants: ChatParticipant[];
}

export interface ChatsManager {
  createSession: (participants: ChatParticipant[]) => ChatSession;
}

function createChatSession(participants: ChatParticipant[]): ChatSession {
  const messages: ChatMessage[] = [];

  const sendMessage = async (message: ChatMessage) => {
    messages.push(message);

    const notifyTasks = participants.map(async (participant) => {
      if (!participant.onMessage) {
        return;
      }
      await participant.onMessage(message);
    });

    await Promise.all(notifyTasks);
  };

  return {
    messages,
    sendMessage,
    participants,
  };
}

export function createChatsManager(): ChatsManager {
  return {
    createSession: createChatSession,
  };
}
