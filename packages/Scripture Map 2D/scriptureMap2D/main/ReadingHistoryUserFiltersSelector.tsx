import { FiltersSelectorOption } from "scriptureMap2D.main.FiltersSelectorOption";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";
import { readingHistoryColorStore } from "bibleVizUtils.services.ReadingHistoryColorStore";

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
        content={t("all")}
        onClick={() => {
          handleReadingHistoryUserSelectorClick("all");
        }}
        selected={allSelected}
      />

      {Array.from(readingHistoryUserFilters).map(([userId, selected]) => {
        const { profileName } = usersDataMap.get(userId);
        const fixedName: string =
          userId === myAuthBotId
            ? t("you")
            : profileName?.length > 0
              ? profileName
              : t("Unknown User");
        return (
          <FiltersSelectorOption
            content={[
              <div
                style={{
                  backgroundColor:
                    readingHistoryColorStore.getUserColor(userId),
                  borderStyle: "solid",
                  borderColor: readingHistoryColorStore.getUserColor(userId),
                }}
                className="filter-option-icon"
              ></div>,
              fixedName,
            ]}
            onClick={() => {
              handleReadingHistoryUserSelectorClick(userId);
            }}
            selected={selected}
          />
        );
      })}
    </div>
  );
};
