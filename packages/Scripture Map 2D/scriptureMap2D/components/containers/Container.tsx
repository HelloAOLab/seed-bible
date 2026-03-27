import { TestamentContainer } from "scriptureMap2D.main.TestamentContainer";
import { useContainer } from "scriptureMap2D.hooks.useContainer";

const { memo } = os.appCompat;

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
