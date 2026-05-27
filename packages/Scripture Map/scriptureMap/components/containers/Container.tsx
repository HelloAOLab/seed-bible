import { TestamentContainer } from "scriptureMap.components.containers.TestamentContainer";
import { useContainer } from "scriptureMap.hooks.useContainer";
import type { TestamentContextType } from "scriptureMap.contexts.Testament.TestamentContext";

const { memo } = os.appCompat;

export interface TestamentContainerData extends TestamentContextType {
  key: string;
}

export const Container = memo(() => {
  const testamentContainersData = useContainer();

  return (
    <div className="scripture-map-container">
      {testamentContainersData.map((data) => (
        <TestamentContainer {...data} />
      ))}
    </div>
  );
});
