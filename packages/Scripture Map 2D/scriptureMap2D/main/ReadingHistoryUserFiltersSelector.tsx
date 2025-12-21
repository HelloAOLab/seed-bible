import { FiltersSelectorOption } from "scriptureMap2D.main.FiltersSelectorOption";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";

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
                    userId === myAuthBotId
                      ? BibleVizUtils.Data.tags.myUserColor
                      : (BibleVizUtils.Data.vars.userPresenceData?.[userId]
                          ?.user?.color ??
                        thisBot.vars.FakeReadingHistoryUsersColorMap?.get(
                          userId
                        ) ??
                        "pink"),
                  borderStyle: "solid",
                  borderColor:
                    userId === myAuthBotId
                      ? BibleVizUtils.Data.tags.myUserColor
                      : (BibleVizUtils.Data.vars.userPresenceData?.[userId]
                          ?.user?.color ??
                        thisBot.vars.FakeReadingHistoryUsersColorMap?.get(
                          userId
                        ) ??
                        "pink"),
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
