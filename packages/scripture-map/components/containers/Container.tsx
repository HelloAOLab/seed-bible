import { TestamentContainer } from "./TestamentContainer";
import { TestamentContent } from "./TestamentContent";
import { BooksContainer } from "../ui/BooksContainer";
import { useContainer } from "../../hooks/useContainer";
import { useScriptureMapContext } from "../../contexts/ScriptureMap/ScriptureMapContext";
import { TestamentProvider } from "../../contexts/Testament/TestamentContext";
import type { TestamentContextType } from "../../contexts/Testament/TestamentContext";

import { memo } from "preact/compat";

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
