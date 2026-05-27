import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";
import type { TestamentContainerData } from "scriptureMap.components.containers.Container";

type UseContainer = () => TestamentContainerData[];

const { useMemo } = os.appHooks;

export const useContainer: UseContainer = () => {
  const { arrangement } = useScriptureMapContext();

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
