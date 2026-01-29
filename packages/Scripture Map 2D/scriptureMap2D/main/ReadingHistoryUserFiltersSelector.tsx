import { FiltersSelectorOption } from "scriptureMap2D.main.FiltersSelectorOption";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { readingHistoryColorStore } from "bibleVizUtils.services.ReadingHistoryColorStore";

import { useSideBarContext } from "app.hooks.sideBar";

const { useMemo, useEffect } = os.appHooks;

export const ReadingHistoryUserFiltersSelector = () => {
  const { t } = useSideBarContext();
  const {
    handleReadingHistoryUserSelectorClick,
    readingHistoryUserFilters,
    myAuthBotId,
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
              userId === myAuthBotId ? t("you") : t("guest"),
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
