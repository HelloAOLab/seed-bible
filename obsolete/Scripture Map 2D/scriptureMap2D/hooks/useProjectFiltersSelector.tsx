import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { ProjectChapterState } from "scriptureMap2D.models.project";
import { type ProjectChapterStateType } from "scriptureMap2D.models.project";
import { useSideBarContext } from "app.hooks.sideBar";
import {
  SelectorOptionClasses,
  type SelectorOptionProps,
} from "scriptureMap2D.components.ui.SelectorOption";
const { useMemo, useCallback } = os.appHooks;

interface UseProjectFiltersSelectorType {
  allSelectorOptionContent: SelectorOptionProps["content"];
  allSelectorOptionClick: () => void;
  allSelected: boolean;
  selectorOptionsData: SelectorOptionProps[];
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
    (key: ProjectChapterStateType) => SelectorOptionProps["content"]
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
    SelectorOptionProps["content"]
  >(() => {
    return { title: t("all") };
  }, [t]);

  const allSelectorOptionClick = useCallback(() => {
    handleProjectFilterOptionClick("all");
  }, [handleProjectFilterOptionClick]);

  const selectorOptionsData = useMemo<SelectorOptionProps[]>(() => {
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
