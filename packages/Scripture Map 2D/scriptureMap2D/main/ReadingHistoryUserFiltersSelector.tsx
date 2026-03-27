import { FiltersSelectorOption } from "scriptureMap2D.components.ui.FiltersSelectorOption";
import { useReadingHistoryContext } from "scriptureMap2D.contexts.RadingHistory.ReadingHistoryContext";
import { userColorStore } from "bibleVizUtils.services.index";

import { useSideBarContext } from "app.hooks.sideBar";

const { useMemo } = os.appHooks;

export const ReadingHistoryUserFiltersSelector = () => {
  const { t } = useSideBarContext();
  const {
    handleReadingHistoryUserSelectorClick,
    readingHistoryUserFilters,
    myAuthBotId,
    usersDataMap,
  } = useReadingHistoryContext();

  const allSelected = useMemo(() => {
    return Array.from(readingHistoryUserFilters).every(([, value]) => {
      return value;
    });
  }, [readingHistoryUserFilters]);

  return (
    <div className="reading-history-user-selector">
      <FiltersSelectorOption
        content={{ title: t("all") }}
        onClick={() => {
          handleReadingHistoryUserSelectorClick("all");
        }}
        selected={allSelected}
      />

      {Array.from(readingHistoryUserFilters).map(([userId, selected]) => {
        const userData = usersDataMap.get(userId);
        if (userData) {
          const { profileName } = userData;
          const fixedName: string =
            userId === myAuthBotId
              ? t("you")
              : (profileName?.length ?? 0) > 0
                ? profileName
                : t("Unknown User");
          return (
            <FiltersSelectorOption
              content={{
                iconStyle: {
                  backgroundColor: userColorStore.getUserColor({
                    authId: userId,
                  }),
                  borderStyle: "solid",
                  borderColor: userColorStore.getUserColor({
                    authId: userId,
                  }),
                },
                title: fixedName,
              }}
              onClick={() => {
                handleReadingHistoryUserSelectorClick(userId);
              }}
              selected={selected}
            />
          );
        }
        return null;
      })}
    </div>
  );
};
