import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import type { TestamentContainerData } from "scriptureMap2D.main.interfaces";

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
