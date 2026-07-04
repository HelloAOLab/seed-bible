import { useScriptureMapContext } from "../contexts/ScriptureMap/ScriptureMapContext";
import { ProjectChapterState } from "../models/project";
import { type ProjectChapterStateType } from "../models/project";
import {
  SelectorOptionClasses,
  type SelectorOptionData,
} from "../components/ui/SelectorOption";
import { useCallback, useMemo } from "preact/hooks";

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
  const {
    isInSelectionMode,
    projectStateStyle,
    onSelectionModeCheckboxClick,
    onSelectionModeDoneButtonClick,
    onStateSetterOptionClick,
    onSelectionModeClearSelectionButtonClick,
    translate,
  } = useScriptureMapContext();

  const getOptionContent = useCallback<
    (key: ProjectChapterStateType) => SelectorOptionData["content"]
  >(
    (key) => {
      let state;

      switch (key) {
        case ProjectChapterState.None:
          state = translate("none");
          break;
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
        iconStyle: style,
        title,
      };
    },
    [translate, projectStateStyle]
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
    return `${translate("selection")} ${translate("Mode")}`;
  }, [translate]);

  const selectionLabel = useMemo<
    UseProjectStateSetterType["selectionLabel"]
  >(() => {
    return `${translate("status")}:`;
  }, [translate]);

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
