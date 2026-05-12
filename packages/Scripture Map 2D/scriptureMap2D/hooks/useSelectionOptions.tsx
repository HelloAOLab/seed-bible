import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";

interface UseSelectionOptionsType {
  clearSelectionContent: string;
  acceptSelectionContent: string;
}

type UseSelectionOptions = () => UseSelectionOptionsType;

export const useSelectionOptions: UseSelectionOptions = () => {
  const { translate } = useScriptureMap2DContext();

  return {
    clearSelectionContent: `${translate("clear")} ${translate("selection")}`,
    acceptSelectionContent: translate("done"),
  };
};
