import { useScriptureMap2DContext } from "scriptureMap2D.contexts.ScriptureMap2D.ScriptureMap2DContext";
import type { TestamentContainerData } from "scriptureMap2D.components.containers.Container";

type UseContainer = () => TestamentContainerData[];

const { useMemo } = os.appHooks;

export const useContainer: UseContainer = () => {
  const { arrangement } = useScriptureMap2DContext();

  const testamentContainersData = useMemo(() => {
    if (!arrangement) return [];

    return arrangement.testaments
      .toReversed()
      .map((testament, testamentIndex) => {
        return {
          key: testament.name,
          testament: testament,
          testamentIndex: testamentIndex,
        };
      });
  }, [arrangement]);

  return testamentContainersData;
};
