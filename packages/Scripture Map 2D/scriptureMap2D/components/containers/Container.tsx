import { TestamentContainer } from "scriptureMap2D.components.containers.TestamentContainer";
import { useContainer } from "scriptureMap2D.hooks.useContainer";
import type { TestamentContextType } from "scriptureMap2D.contexts.Testament.TestamentContext";

const { memo } = os.appCompat;

export interface TestamentContainerData extends TestamentContextType {
  key: string;
}

export const Container = memo(() => {
  const testamentContainersData = useContainer();

  return (
    <div className="scripture-map-2d-container">
      {testamentContainersData.map((data) => (
        <TestamentContainer {...data} />
      ))}
    </div>
  );
});
