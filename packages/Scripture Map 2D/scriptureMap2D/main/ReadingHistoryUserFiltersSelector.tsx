import { FiltersSelectorOption } from "scriptureMap2D.main.FiltersSelectorOption";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
const { useMemo, useEffect } = os.appHooks;

export const ReadingHistoryUserFiltersSelector = () => {
  const { handleReadingHistoryUserSelectorClick, readingHistoryUsersFilters } =
    useScriptureMap2DContext();

  const allSelected = useMemo(() => {
    return Array.from(readingHistoryUsersFilters).every(([, value]) => {
      return value;
    });
  }, [readingHistoryUsersFilters]);

  return (
    <div className="readingHistoryUserSelector">
      <FiltersSelectorOption
        content="All"
        onClick={() => {
          handleReadingHistoryUserSelectorClick("all");
        }}
        selected={allSelected}
      />

      {Array.from(readingHistoryUsersFilters).map(([userId, selected]) => {
        return (
          <FiltersSelectorOption
            content={[
              <div
                style={{
                  backgroundColor:
                    userId === configBot.id
                      ? BibleVizUtils.Data.tags.myUserColor
                      : (BibleVizUtils.Data.vars.userPresenceData?.[userId]
                          ?.user?.color ??
                        thisBot.vars.FakeReadingHistoryUsersColorMap?.get(
                          userId
                        ) ??
                        "pink"),
                  borderStyle: "solid",
                  borderColor:
                    userId === configBot.id
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
              userId === configBot.id ? "You" : "Guest",
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
