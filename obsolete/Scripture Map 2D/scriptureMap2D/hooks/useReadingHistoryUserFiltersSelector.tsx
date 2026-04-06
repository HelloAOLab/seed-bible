import { useReadingHistoryContext } from "scriptureMap2D.contexts.ReadingHistory.ReadingHistoryContext";
import { useSideBarContext } from "app.hooks.sideBar";
import {
  SelectorOptionClasses,
  type SelectorOptionProps,
  type SelectorOptionData,
} from "scriptureMap2D.components.ui.SelectorOption";
import { userColorStore } from "bibleVizUtils.services.index";

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

    const allSelectorOptionContent = useMemo<
      UseReadingHistoryUserFiltersSelectorType["allSelectorOptionContent"]
    >(() => {
      return { title: t("all") };
    }, [t]);

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
              ? t("you")
              : (profileName?.length ?? 0) > 0
                ? profileName
                : t("Unknown User");
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
