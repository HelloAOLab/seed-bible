import { useScriptureMapContext } from "../contexts/ScriptureMap/ScriptureMapContext";
import type { TestamentContainerData } from "../components/containers/Container";

type UseContainer = () => TestamentContainerData[];

import { useMemo } from "preact/hooks";

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
