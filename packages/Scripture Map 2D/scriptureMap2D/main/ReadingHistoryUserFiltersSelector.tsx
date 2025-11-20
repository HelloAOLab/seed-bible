import { FiltersSelectorOption } from "scriptureMap2D.main.FiltersSelectorOption";
import { useReadingHistoryContext } from "scriptureMap2D.main.ReadingHistoryContext";
const { useMemo, useEffect } = os.appHooks;

export const ReadingHistoryUserFiltersSelector = () => {
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
    <div className="readingHistoryUserSelector">
      <FiltersSelectorOption
        content="All"
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
                className="filterOptionIcon"
              ></div>,
              userId === myAuthBotId ? "You" : "Guest",
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
