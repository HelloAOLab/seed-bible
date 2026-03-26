import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import { TestamentContainer } from "scriptureMap2D.main.TestamentContainer";
const { memo } = os.appCompat;
const { useMemo } = os.appHooks;

export const Container = memo(() => {
  const { arrangement } = useScriptureMap2DContext();

  const containers = useMemo(() => {
    return arrangement.testaments
      .toReversed()
      .map((testament, testamentIndex) => {
        return (
          <TestamentContainer
            key={testament.name}
            testament={testament}
            testamentIndex={testamentIndex}
          />
        );
      });
  }, [arrangement]);

  return <div className="scripture-map-2d-container">{containers}</div>;
});
