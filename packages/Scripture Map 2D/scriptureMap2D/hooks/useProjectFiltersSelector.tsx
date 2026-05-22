import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { ProjectChapterState } from "scriptureMap2D.models.project";
import { type ProjectChapterStateType } from "scriptureMap2D.models.project";
import {
  SelectorOptionClasses,
  type SelectorOptionData,
  type SelectorOptionProps,
} from "scriptureMap2D.components.ui.SelectorOption";
const { useMemo, useCallback } = os.appHooks;

interface UseProjectFiltersSelectorType {
  allSelectorOptionContent: SelectorOptionData["content"];
  allSelectorOptionClick: () => void;
  allSelected: boolean;
  selectorOptionsData: SelectorOptionData[];
}

type UseProjectFiltersSelector = () => UseProjectFiltersSelectorType;

export const useProjectFiltersSelector: UseProjectFiltersSelector = () => {
  const {
    projectFilters,
    handleProjectFilterOptionClick,
    projectStateStyle,
    translate,
  } = useScriptureMap2DContext();

  const allSelected = useMemo(() => {
    return Array.from(projectFilters).every(([, value]) => {
      return value;
    });
  }, [projectFilters]);

  const getOptionContent = useCallback<
    (key: ProjectChapterStateType) => SelectorOptionProps["content"]
  >(
    (key) => {
      let state;

      switch (key) {
        case ProjectChapterState.Assigned:
          state = translate("assigned");
          break;
        case ProjectChapterState.InProgress:
          state = translate("in-progress");
          break;
        case ProjectChapterState.NeedsReview:
          state = translate("needs-review");
          break;
        case ProjectChapterState.Completed:
          state = translate("completed");
          break;
        default:
          throw new Error("Not found key", { cause: { key } });
      }

      const title = translate("project-state", { state });

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
    [translate, projectStateStyle]
  );

  const allSelectorOptionContent = useMemo<
    SelectorOptionProps["content"]
  >(() => {
    return { title: translate("all") };
  }, [translate]);

  const allSelectorOptionClick = useCallback(() => {
    handleProjectFilterOptionClick("all");
  }, [handleProjectFilterOptionClick]);

  const selectorOptionsData = useMemo<SelectorOptionData[]>(() => {
    return Array.from(projectFilters).map(([key, value]) => {
      return {
        content: getOptionContent(key),
        onClick: () => {
          handleProjectFilterOptionClick(key);
        },
        selected: allSelected ? false : value,
        className: SelectorOptionClasses.ProjectState,
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
