import { TestamentToggle } from "scriptureMap2D.main.TestamentToggle";
import { TestamentContent } from "scriptureMap2D.main.TestamentContent";
import { TestamentContext } from "scriptureMap2D.main.TestamentContext";
import { useScriptureMap2DContext } from "scriptureMap2D.main.ScriptureMap2DContext";
import type { TestamentContainerType } from "scriptureMap2D.main.types";

const { useState, useCallback } = os.appHooks;
const { memo } = os.appCompat;

export const TestamentContainer = memo<TestamentContainerType>(
  ({ testament, testamentIndex }) => {
    const { showTestamentLabels } = useScriptureMap2DContext();
    const [showContent, setShowContent] = useState<boolean>(true);

    const toggleshowContent = useCallback<() => void>(() => {
      setShowContent((prev) => !prev);
    }, []);

    return (
      <TestamentContext.Provider value={{ testament, testamentIndex }}>
        <div className="testament-container">
          {showTestamentLabels && (
            <TestamentToggle
              key={`toggle-${testament.name}`}
              toggleshowContent={toggleshowContent}
              showingContent={showContent}
            />
          )}
          <TestamentContent
            key={`content-${testament.name}`}
            hidden={!showContent}
          />
        </div>
      </TestamentContext.Provider>
    );
  }
);
