import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import { ProjectChapterState } from "scriptureMap2D.models.project";
import { type ProjectChapterStateType } from "scriptureMap2D.models.project";
import { useSideBarContext } from "app.hooks.sideBar";
import {
  SelectorOptionClasses,
  type SelectorOptionData,
} from "scriptureMap2D.components.ui.SelectorOption";
const { useCallback, useMemo } = os.appHooks;

interface UseProjectStateSetterType {
  checkboxIconClass: string;
  handleCheckboxIconClick: (() => void) | undefined;
  checkboxIconContent: string;
  checkboxTextContent: string;
  isInSelectionMode: boolean | undefined;
  handleClearSelectionClick: (() => void) | undefined;
  handleDoneClick: (() => void) | undefined;
  selectionLabel: string;
  stateSetterOptionsData: SelectorOptionData[];
}

type UseProjectStateSetter = () => UseProjectStateSetterType;

export const useProjectStateSetter: UseProjectStateSetter = () => {
  const { t } = useSideBarContext();
  const {
    isInSelectionMode,
    projectStateStyle,
    onSelectionModeCheckboxClick,
    onSelectionModeDoneButtonClick,
    onStateSetterOptionClick,
    onSelectionModeClearSelectionButtonClick,
  } = useScriptureMap2DContext();

  const getOptionContent = useCallback<
    (key: ProjectChapterStateType) => SelectorOptionData["content"]
  >(
    (key) => {
      let title: string;

      switch (key) {
        case ProjectChapterState.None:
          title = t("stateNone");
          break;
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
        iconStyle: style,
        title,
      };
    },
    [t, projectStateStyle]
  );

  const { checkboxIconClass, checkboxIconContent } = useMemo<{
    checkboxIconClass: UseProjectStateSetterType["checkboxIconClass"];
    checkboxIconContent: UseProjectStateSetterType["checkboxIconContent"];
  }>(() => {
    return {
      checkboxIconClass: `material-symbols-outlined${isInSelectionMode ? " checked" : ""}`,
      checkboxIconContent: isInSelectionMode ? "check" : "",
    };
  }, [isInSelectionMode]);

  const checkboxTextContent = useMemo<
    UseProjectStateSetterType["checkboxTextContent"]
  >(() => {
    return t("selectionMode");
  }, [t]);

  const selectionLabel = useMemo<
    UseProjectStateSetterType["selectionLabel"]
  >(() => {
    return `${t("status")}:`;
  }, [t]);

  const stateSetterOptionsData = useMemo<SelectorOptionData[]>(() => {
    return Object.values(ProjectChapterState).map((state) => {
      return {
        content: getOptionContent(state),
        onClick: () => {
          onStateSetterOptionClick?.(state);
        },
        key: state,
        className: SelectorOptionClasses.ProjectState,
      };
    });
  }, [getOptionContent, onStateSetterOptionClick]);

  return {
    checkboxIconClass,
    handleCheckboxIconClick: onSelectionModeCheckboxClick,
    checkboxIconContent,
    checkboxTextContent,
    isInSelectionMode,
    handleClearSelectionClick: onSelectionModeClearSelectionButtonClick,
    handleDoneClick: onSelectionModeDoneButtonClick,
    selectionLabel,
    stateSetterOptionsData,
  };
};
