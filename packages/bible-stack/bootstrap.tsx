import {
  MaterialIcon,
  PortalComponent,
  type PortalComponentHandle,
} from "@packages/seed-bible/seed-bible/components";
import {
  registerExtension,
  type SeedBibleState,
} from "@packages/seed-bible/seed-bible/managers";
import { useI18n } from "@packages/seed-bible/seed-bible/i18n";
import type { UtilsAPI } from "@packages/seed-bible-utils/infrastructure/models/seedBible";
import { v4 as uuid } from "uuid";
import bibleStackPattern from "virtual:@pattern/bible-stack";
import { useComputed, useSignal, useSignalEffect } from "@preact/signals";
import type { ReadingInstance, UserPresence } from "./models/userPresence";
import { useRef } from "preact/hooks";

const Icon = () => {
  return <MaterialIcon>layers</MaterialIcon>;
};

const seedBibleUtilsId = "seed-bible-utils";

interface DependenciesMap {
  [seedBibleUtilsId]: UtilsAPI;
}

const dependencies: (keyof DependenciesMap)[] = [seedBibleUtilsId];

export const bootstrapExtension = () => {
  registerExtension({
    id: "bible-stack",
    dependencies,
    init: function* (context: SeedBibleState, dependenciesMap) {
      const { bookNames } = dependenciesMap[
        seedBibleUtilsId
      ] as DependenciesMap[typeof seedBibleUtilsId];

      yield context.tools.registerBelowReaderTool({
        onSelect: () => {
          const dimension = "stack";
          const inst = uuid();
          context.panes.openPane({
            placement: "floating",
            title: () => {
              const { t } = useI18n();
              return t("below-reader-tool", {
                ns: "bible-stack",
                defaultValue: "Bible Stack",
              });
            },
            icon: Icon,
            component: () => {
              const portalRef = useRef<PortalComponentHandle>(null);

              const userPresence = useComputed(() => {
                const readingInstances: ReadingInstance[] =
                  context.tabs.tabs.value
                    .map((tab) => {
                      const readingState = tab.readingState;
                      const sharedSession = tab.sharedSession;
                      const instances: ReadingInstance[] = [];
                      if (sharedSession) {
                        const connectedUsers =
                          sharedSession.connectedUsers.value;
                        instances.push(
                          ...connectedUsers
                            .filter(
                              (user) =>
                                user.connectionId !== context.login.connectionId
                            )
                            .map((user) => {
                              return {
                                bookId: readingState.bookId.value,
                                chapter: readingState.chapterNumber.value,
                                id: `${user.connectionId}:${tab.id}`,
                                selected: true,
                                translation: readingState.translationId.value,
                                connectionId: user.connectionId,
                              } satisfies ReadingInstance;
                            })
                        );
                      }
                      instances.push({
                        bookId: readingState.bookId.value,
                        chapter: readingState.chapterNumber.value,
                        id: `${context.login.connectionId}:${tab.id}`,
                        selected: context.tabs.selectedTabId.value === tab.id,
                        translation: readingState.translationId.value,
                        connectionId: context.login.connectionId,
                      });
                      return instances;
                    })
                    .flat();
                const presence: UserPresence = new Map();
                for (const instance of readingInstances) {
                  if (!presence.has(instance.connectionId)) {
                    presence.set(instance.connectionId, []);
                  }
                  presence.get(instance.connectionId)?.push(instance);
                }
                return presence;
              });
              const isReady = useSignal(false);
              useSignalEffect(() => {
                if (!isReady.value) return;
                portalRef.current?.sendMessage({
                  type: "OnUserPresenceChanged",
                  presence: userPresence.value,
                });
              });
              return (
                <PortalComponent
                  ref={portalRef}
                  onMessage={(message: {
                    id: string;
                    data: { bookId: string; chapter?: number };
                  }) => {
                    switch (message.id) {
                      case "reader-navigation":
                        {
                          const tab = context.app.selectedTab.value;
                          if (tab) {
                            tab.readingState.selectChapter(
                              message.data.bookId,
                              message.data.chapter ?? 1
                            );
                          } else {
                            const newTab = context.tabs.addTab(undefined, {
                              initialBookId: message.data.bookId,
                              initialChapterNumber: message.data.chapter ?? 1,
                            });
                            context.app.selectTab(newTab.id);
                          }
                        }
                        break;
                      case "ready":
                        {
                          isReady.value = true;
                        }
                        break;
                    }
                  }}
                  portal={dimension}
                  portalType="grid"
                  inst={inst}
                  pattern={bibleStackPattern}
                  query={{
                    dimension,
                    bookNames: JSON.stringify(
                      Object.fromEntries(bookNames.value)
                    ),
                    language: context.i18n.language.value,
                    userId: context.login.connectionId,
                  }}
                />
              );
            },
          });
        },
        id: "bible-stack",
        title: {
          key: "below-reader-tool",
          defaultValue: "Bible Stack",
          ns: "bible-stack",
        },
        icon: Icon,
        priority: 0,
      });
    },
  });
};
