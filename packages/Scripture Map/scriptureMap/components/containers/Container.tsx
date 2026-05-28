import { TestamentContainer } from "scriptureMap.components.containers.TestamentContainer";
import { TestamentContent } from "scriptureMap.components.containers.TestamentContent";
import { BooksContainer } from "scriptureMap.components.ui.BooksContainer";
import { useContainer } from "scriptureMap.hooks.useContainer";
import { useScriptureMapContext } from "scriptureMap.contexts.ScriptureMap.ScriptureMapContext";
import { TestamentProvider } from "scriptureMap.contexts.Testament.TestamentContext";
import type { TestamentContextType } from "scriptureMap.contexts.Testament.TestamentContext";

const { memo } = os.appCompat;

export interface TestamentContainerData extends TestamentContextType {
  key: string;
}

export const Container = memo(() => {
  const testamentContainersData = useContainer();
  const { showTestamentLabels, showSectionLabels } = useScriptureMapContext();

  if (!showTestamentLabels && !showSectionLabels) {
    return (
      <div className="scripture-map-container">
        <div className="testament-container">
          <div className="testament-content">
            <BooksContainer>
              {testamentContainersData.map((data) => (
                <TestamentProvider
                  key={data.key}
                  value={{
                    testament: data.testament,
                    testamentIndex: data.testamentIndex,
                  }}
                >
                  <TestamentContent hidden={false} flat />
                </TestamentProvider>
              ))}
            </BooksContainer>
          </div>
        </div>
      </div>
    );
  }

  if (!showTestamentLabels) {
    return (
      <div className="scripture-map-container" style={{ gap: 0 }}>
        {testamentContainersData.map((data) => (
          <TestamentContainer
            key={data.key}
            testament={data.testament}
            testamentIndex={data.testamentIndex}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="scripture-map-container">
      {testamentContainersData.map((data) => (
        <TestamentContainer
          key={data.key}
          testament={data.testament}
          testamentIndex={data.testamentIndex}
        />
      ))}
    </div>
  );
});
