import { useBibleLayout2DContext } from "bibleLayout2D.main.BibleLayout2DContext";
import { TestamentContainer } from "bibleLayout2D.main.TestamentContainer";

export const BibleLayout2DContainer = () => {
  const { scaleFactor, arrangement } = useBibleLayout2DContext();

  return (
    <div className="mapContainer">
      {arrangement.testaments.toReversed().map((testament, testamentIndex) => {
        return (
          <TestamentContainer
            testament={testament}
            testamentIndex={testamentIndex}
          />
        );
      })}
    </div>
  );
};
