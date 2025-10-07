import { TestamentToggle } from "bibleLayout2D.main.TestamentToggle";
import { TestamentContent } from "bibleLayout2D.main.TestamentContent";
import { TestamentContext } from "bibleLayout2D.main.TestamentContext";
import { useBibleLayout2DContext } from "bibleLayout2D.main.BibleLayout2DContext";

const { useState, useCallback } = os.appHooks;

export const TestamentContainer = ({ testament, testamentIndex }) => {
  const { showLabels } = useBibleLayout2DContext();
  const [showContent, setShowContent] = useState(true);

  const toggleshowContent = useCallback(() => {
    setShowContent((prev) => !prev);
  }, []);

  return (
    <TestamentContext.Provider value={{ testament, testamentIndex }}>
      <div className="testamentContainer">
        {showLabels && (
          <TestamentToggle
            toggleshowContent={toggleshowContent}
            showingContent={showContent}
          />
        )}
        <TestamentContent hidden={!showContent} />
      </div>
    </TestamentContext.Provider>
  );
};
