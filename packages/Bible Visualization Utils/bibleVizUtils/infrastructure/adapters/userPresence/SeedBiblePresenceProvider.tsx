import type { SeedBibleState } from "seed-bible.managers.SeedBibleStateManager";
import type { Tab } from "bibleVizUtils.domain.models.seedBible";
import type { UserPresence } from "bibleVizUtils.domain.models.userPresence";
import type { UserPresenceProviderPort } from "bibleVizUtils.domain.ports.userPresence";

interface ProviderParams {
  state: SeedBibleState;
}

export class SeedBiblePresenceProvider implements UserPresenceProviderPort {
  #state: ProviderParams["state"];

  constructor({ state }: ProviderParams) {
    this.#state = state;
  }

  getCurrUserId(): string {
    return configBot.id;
  }

  getActiveTabData(): Tab["data"] | undefined {
    return {
      use: "", // TODO: Is this still needed?
      first: false, // TODO: Is this still needed?
      type: "", // TODO: Is this still needed?
      book: this.#state.app.selectedTab.value?.readingState.bookId.value ?? "", // TODO: Get actual book name
      bookId:
        this.#state.app.selectedTab.value?.readingState.bookId.value ?? "",
      chapter:
        this.#state.app.selectedTab.value?.readingState.chapterNumber.value ??
        0,
      translation: this.#state.app.selectedTab.value?.readingState.translation
        .value?.shortName as string,
      shortName: this.#state.app.selectedTab.value?.id ?? "",
    };
  }

  getActiveTabId(): Tab["id"] | undefined {
    return this.#state.app.selectedTab.value?.id;
  }

  getActiveTab(): Tab | undefined {
    const data = this.getActiveTabData();
    const id = this.getActiveTabId();

    if (!data || !id) {
      return undefined;
    }

    const tab: Tab = {
      id,
      data,
      taken: false, // TODO: Correctly find this
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
            book: session.readingState.bookId.value!, // TODO: Get the actual Book name here
            bookId: session.readingState.bookId.value!,
            chapter: session.readingState.chapterNumber.value!,
            tabId,
          });
        }
      }
    }
    return userPresence;
  }
}
