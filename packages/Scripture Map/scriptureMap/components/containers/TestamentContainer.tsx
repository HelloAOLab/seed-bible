import { TestamentToggle } from "scriptureMap.components.containers.TestamentToggle";
import { TestamentContent } from "scriptureMap.components.containers.TestamentContent";
import { TestamentProvider } from "scriptureMap.contexts.Testament.TestamentContext";
import { useTestamentContainer } from "scriptureMap.hooks.useTestamentContainer";
import type { TestamentContextType } from "scriptureMap.contexts.Testament.TestamentContext";

const { memo } = os.appCompat;

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
