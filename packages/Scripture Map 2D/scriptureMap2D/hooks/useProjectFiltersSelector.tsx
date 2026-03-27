import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import {
  ProjectChapterState,
  type ProjectChapterStateType,
} from "scriptureMap2D.main.enums";
import { useSideBarContext } from "app.hooks.sideBar";
import type {
  FiltersSelectorOptionData,
  FiltersSelectorOptionProps,
} from "scriptureMap2D.main.interfaces";
const { useMemo, useCallback } = os.appHooks;

interface UseProjectFiltersSelectorType {
  allSelectorOptionContent: FiltersSelectorOptionProps["content"];
  allSelectorOptionClick: () => void;
  allSelected: boolean;
  selectorOptionsData: FiltersSelectorOptionData[];
}

type UseProjectFiltersSelector = () => UseProjectFiltersSelectorType;

export const useProjectFiltersSelector: UseProjectFiltersSelector = () => {
  const { t } = useSideBarContext();
  const { projectFilters, handleProjectFilterOptionClick, projectStateStyle } =
    useScriptureMap2DContext();

  const allSelected = useMemo(() => {
    return Array.from(projectFilters).every(([, value]) => {
      return value;
    });
  }, [projectFilters]);

  const getOptionContent = useCallback<
    (key: ProjectChapterStateType) => FiltersSelectorOptionProps["content"]
  >(
    (key) => {
      let title;

      switch (key) {
        case ProjectChapterState.Assigned:
          title = t("stateAssigned");
          break;
        case ProjectChapterState.InProgress:
          title = t("stateInProgress");
          break;
        case ProjectChapterState.NeedsReview:
          title = t("stateNeedsReview");
          break;
        case ProjectChapterState.Completed:
          title = t("stateCompleted");
          break;
        default:
          throw new Error("Not found key", { cause: { key } });
      }

      const style = projectStateStyle[key];

      return {
        iconStyle: {
          backgroundColor: style.backgroundColor,
          borderStyle: style.borderStyle,
          borderColor: style.borderColor,
        },
        title,
      };
    },
    [t, projectStateStyle]
  );

  const allSelectorOptionContent = useMemo<
    FiltersSelectorOptionProps["content"]
  >(() => {
    return { title: t("all") };
  }, [t]);

  const allSelectorOptionClick = useCallback(() => {
    handleProjectFilterOptionClick("all");
  }, [handleProjectFilterOptionClick]);

  const selectorOptionsData = useMemo<FiltersSelectorOptionData[]>(() => {
    return Array.from(projectFilters).map(([key, value]) => {
      return {
        content: getOptionContent(key),
        onClick: () => {
          handleProjectFilterOptionClick(key);
        },
        selected: allSelected ? false : value,
        key,
      };
    });
  }, [
    projectFilters,
    allSelected,
    getOptionContent,
    handleProjectFilterOptionClick,
  ]);

  return {
    allSelectorOptionContent,
    allSelectorOptionClick,
    allSelected,
    selectorOptionsData,
  };
};
