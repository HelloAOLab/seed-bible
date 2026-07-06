import { TestamentToggle } from "./TestamentToggle";
import { TestamentContent } from "./TestamentContent";
import { TestamentProvider } from "../../contexts/Testament/TestamentContext";
import { useTestamentContainer } from "../../hooks/useTestamentContainer";
import type { TestamentContextType } from "../../contexts/Testament/TestamentContext";

import { memo } from "preact/compat";

export const TestamentContainer = memo(
  ({ testament, testamentIndex }: TestamentContextType) => {
    const { showTestamentLabels, toggleshowContent, showContent } =
      useTestamentContainer();

    return (
      <TestamentProvider value={{ testament, testamentIndex }}>
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
      </TestamentProvider>
    );
  }
);
