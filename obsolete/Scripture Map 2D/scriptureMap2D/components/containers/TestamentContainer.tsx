import { TestamentToggle } from "scriptureMap2D.components.containers.TestamentToggle";
import { TestamentContent } from "scriptureMap2D.components.containers.TestamentContent";
import { TestamentProvider } from "scriptureMap2D.contexts.Testament.TestamentContext";
import { useTestamentContainer } from "scriptureMap2D.hooks.useTestamentContainer";
import type { TestamentContextType } from "scriptureMap2D.contexts.Testament.TestamentContext";

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
