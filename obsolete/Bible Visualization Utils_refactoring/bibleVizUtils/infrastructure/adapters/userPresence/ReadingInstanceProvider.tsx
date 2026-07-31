import type { UserReadingInstance } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/models/seedBible";
import type { SessionProviderPort } from "@packages/Bible Visualization Utils/bibleVizUtils/domain/ports/session";
import type { SeedBibleState } from "@packages/seed-bible/seed-bible/managers/SeedBibleStateManager";
import type { ReaderTab } from "@packages/seed-bible/seed-bible/managers/TabsManager";
import type { ReadingInstanceProviderPort } from "bibleVizUtils.domain.ports.pieceActivity";

interface ProviderParams {
  state: SeedBibleState;
  sessionProviderPort: SessionProviderPort;
}

export class RadingInstanceProvider implements ReadingInstanceProviderPort {
  #state: ProviderParams["state"];
  #sessionProviderPort: ProviderParams["sessionProviderPort"];

  constructor({ state, sessionProviderPort }: ProviderParams) {
    this.#state = state;
    this.#sessionProviderPort = sessionProviderPort;
  }

  getOwnReadingInstances(): UserReadingInstance[] {
    const tabs: [string, ReaderTab][] = this.#state.tabs.tabs.value.map(
      (tab) => {
        return [tab.id, tab];
      }
    );
    const instances: UserReadingInstance[] = tabs.map(([id, tab]) => {
      return {
        id,
        bookId: tab.readingState.bookId.value!,
        chapter: tab.readingState.chapterNumber.value,
        translation: tab.readingState.translationId.value!,
      };
    });
    return instances;
  }

  getRemotesReadingInstances(): UserReadingInstance[] {
    const instanceMap: Map<string, UserReadingInstance[]> = new Map();
    const tabs: [string, ReaderTab][] = this.#state.tabs.tabs.value.map(
      (tab) => {
        return [tab.id, tab];
      }
    );
    for (const [id, tab] of tabs) {
      const sharedSession = tab.sharedSession;
      if (!sharedSession) continue;

      for (const connectedUser of sharedSession.connectedUsers.value) {
        if (
          connectedUser.connectionId ===
          this.#sessionProviderPort.getOwnUserConnectionId()
        )
          continue;
        if (!instanceMap.has(connectedUser.connectionId)) {
          instanceMap.set(connectedUser.connectionId, []);
        }
        instanceMap.get(connectedUser.connectionId)?.push({
          id,
          bookId: tab.readingState.bookId.value!,
          chapter: tab.readingState.chapterNumber.value,
          translation: tab.readingState.translationId.value!,
        });
      }
    }
    return [...instanceMap.values()].flat();
  }
}
