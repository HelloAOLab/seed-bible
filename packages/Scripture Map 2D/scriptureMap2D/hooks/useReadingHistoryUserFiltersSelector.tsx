import { useReadingHistoryContext } from "scriptureMap2D.contexts.ReadingHistory.ReadingHistoryContext";
import {
  SelectorOptionClasses,
  type SelectorOptionProps,
  type SelectorOptionData,
} from "scriptureMap2D.components.ui.SelectorOption";
import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";

const { useMemo, useCallback } = os.appHooks;

interface UseReadingHistoryUserFiltersSelectorType {
  allSelectorOptionContent: SelectorOptionProps["content"];
  allSelectorOptionClick: () => void;
  allSelected: boolean;
  selectorOptionsData: SelectorOptionData[];
}

type UseReadingHistoryUserFiltersSelector =
  () => UseReadingHistoryUserFiltersSelectorType;

export const useReadingHistoryUserFiltersSelector: UseReadingHistoryUserFiltersSelector =
  () => {
    const { userColorStore, translate } = useScriptureMap2DContext();
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

    const allSelectorOptionContent = useMemo<
      UseReadingHistoryUserFiltersSelectorType["allSelectorOptionContent"]
    >(() => {
      return { title: translate("all") };
    }, [translate]);

    const allSelectorOptionClick = useCallback<
      UseReadingHistoryUserFiltersSelectorType["allSelectorOptionClick"]
    >(() => {
      handleReadingHistoryUserSelectorClick("all");
    }, [handleReadingHistoryUserSelectorClick]);

    const selectorOptionsData = useMemo<
      UseReadingHistoryUserFiltersSelectorType["selectorOptionsData"]
    >(() => {
      const optionsData: UseReadingHistoryUserFiltersSelectorType["selectorOptionsData"] =
        [];

      for (const [userId, selected] of Array.from(readingHistoryUserFilters)) {
        const userData = usersDataMap.get(userId);
        if (userData) {
          const { profileName } = userData;
          const fixedName: string =
            userId === myAuthBotId
              ? translate("you")
              : (profileName?.length ?? 0) > 0
                ? profileName!
                : translate("Unknown User");
          optionsData.push({
            key: userId,
            content: {
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
            },
            onClick: () => {
              handleReadingHistoryUserSelectorClick(userId);
            },
            selected: selected,
            className: SelectorOptionClasses.UserFilter,
          });
        }
      }
      return optionsData;
    }, [readingHistoryUserFilters, usersDataMap, myAuthBotId]);

    return {
      allSelectorOptionContent,
      allSelectorOptionClick,
      allSelected,
      selectorOptionsData,
    };
  };
