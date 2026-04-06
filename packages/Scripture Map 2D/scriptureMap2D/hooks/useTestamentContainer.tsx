import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
const { useState, useCallback } = os.appHooks;

interface UseTestamentContainerType {
  showTestamentLabels: boolean;
  toggleshowContent: () => void;
  showContent: boolean;
}

type UseTestamentContainer = () => UseTestamentContainerType;

export const useTestamentContainer: UseTestamentContainer = () => {
  const { showTestamentLabels } = useScriptureMap2DContext();
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
