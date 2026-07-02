import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers";
import type { UserReadingInstance } from "@packages/seed-bible-utils/domain/models/seedBible";
import type { UserPresence } from "@packages/seed-bible-utils/domain/models/userPresence";
import type { UserPresenceProviderPort } from "@packages/seed-bible-utils/domain/ports/userPresence";

interface ProviderParams {
  state: SeedBibleState;
}

export class SeedBiblePresenceProvider implements UserPresenceProviderPort {
  #state: ProviderParams["state"];

  constructor({ state }: ProviderParams) {
    this.#state = state;
  }

  getCurrUserId(): string {
    return this.#state.os.connectionId;
  }

  getSelectedReadingInstanceId(): UserReadingInstance["id"] | undefined {
    return this.#state.app.selectedTab.value?.id;
  }

  getSelectedReadingInstance(): UserReadingInstance | undefined {
    const id = this.getSelectedReadingInstanceId();

    if (!id) {
      return undefined;
    }

    const tab: UserReadingInstance = {
      bookId:
        this.#state.app.selectedTab.value?.readingState.bookId.value ?? "",
      chapter:
        this.#state.app.selectedTab.value?.readingState.chapterNumber.value ??
        0,
      translation: this.#state.app.selectedTab.value?.readingState.translation
        .value?.shortName as string,
      id,
    };
    return tab;
  }

  getRemotesPresence(): UserPresence {
    const sharedSessions = this.#state.tabs.tabs.value.map((tab) => {
      return {
        session: tab.sharedSession,
        tabId: tab.id,
      };
    });
    const userPresence: UserPresence = new Map();
    for (const { session, tabId } of sharedSessions) {
      if (session) {
        const connectedUsers = session.connectedUsers.value;
        for (const user of connectedUsers) {
          userPresence.set(user.connectionId, {
            bookId: session.readingState.bookId.value!,
            chapter: session.readingState.chapterNumber.value!,
            readingInstanceId: tabId,
          });
        }
      }
    }
    return userPresence;
  }
}
