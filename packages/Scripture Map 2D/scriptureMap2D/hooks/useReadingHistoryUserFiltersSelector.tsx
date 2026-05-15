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
    const { userColorStore, translate, CapitalizeFirstLetter } =
      useScriptureMap2DContext();
    // effect(() => {
    //   const selectedTab = seedBibleState.app.selectedTab.value?.sharedSession;
    //   const tabs = seedBibleState.tabs.tabs.value;
    //   const selectedTabId = seedBibleState.tabs.selectedTabId.value;
    //   console.log(`[Debug] useReadingHistoryUserFiltersSelector: selectedTab useEffect`, {
    //     selectedTab,
    //     tabs,
    //     selectedTabId,
    //     seedBibleState
    //   })
    // })
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
          const profileName = userData.profile?.name;
          const fixedName: string =
            userId === myAuthBotId
              ? CapitalizeFirstLetter(translate("you"))
              : (profileName?.length ?? 0) > 0
                ? profileName!
                : CapitalizeFirstLetter(translate("guest"));
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
