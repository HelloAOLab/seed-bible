import { useScriptureMapContext } from "../contexts/ScriptureMap/ScriptureMapContext";

interface UseSelectionOptionsType {
  clearSelectionContent: string;
  acceptSelectionContent: string;
}

type UseSelectionOptions = () => UseSelectionOptionsType;

export const useSelectionOptions: UseSelectionOptions = () => {
  const { translate } = useScriptureMapContext();

  return {
    clearSelectionContent: `${translate("clear")} ${translate("selection")}`,
    acceptSelectionContent: translate("done"),
  };
};
