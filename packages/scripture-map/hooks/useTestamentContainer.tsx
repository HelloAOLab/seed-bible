import { useScriptureMapContext } from "../contexts/ScriptureMap/ScriptureMapContext";
import { useState, useCallback } from "preact/hooks";

interface UseTestamentContainerType {
  showTestamentLabels: boolean;
  toggleshowContent: () => void;
  showContent: boolean;
}

type UseTestamentContainer = () => UseTestamentContainerType;

export const useTestamentContainer: UseTestamentContainer = () => {
  const { showTestamentLabels } = useScriptureMapContext();
  const [showContent, setShowContent] = useState<boolean>(true);

  const toggleshowContent = useCallback<() => void>(() => {
    setShowContent((prev) => !prev);
  }, []);

  return {
    showTestamentLabels,
    toggleshowContent,
    showContent,
  };
};
