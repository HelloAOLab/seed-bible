import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import {
  ProjectChapterState,
  type ProjectChapterStateType,
} from "scriptureMap2D.main.enums";
import { useSideBarContext } from "app.hooks.sideBar";
import type { ProjectStateSetterOptionData } from "scriptureMap2D.main.interfaces";
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
  stateSetterOptionsData: ProjectStateSetterOptionData[];
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
    (key: ProjectChapterStateType) => ProjectStateSetterOptionData["content"]
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

  const stateSetterOptionsData = useMemo<ProjectStateSetterOptionData[]>(() => {
    return Object.values(ProjectChapterState).map((state) => {
      return {
        content: getOptionContent(state),
        onClick: () => {
          onStateSetterOptionClick?.(state);
        },
        key: state,
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
