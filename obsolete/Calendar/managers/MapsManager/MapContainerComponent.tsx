import { useMapPanelContext } from "managers.MapsManager.MapPanelContext";
import { TestamentContainer } from "managers.MapsManager.TestamentContainerComponent";

export const MapContainer = () => {
  const { scaleFactor, arrangementRef } = useMapPanelContext();

  return (
    <div
      className="mapContainer"
      style={{ gap: `${Math.round(0.667 * scaleFactor)}px` }}
    >
      {arrangementRef.current.testaments
        .toReversed()
        .map((testament, testamentIndex) => {
          return (
            <TestamentContainer
              testament={testament}
              testamentIndex={testamentIndex}
            />
          );
        })}
    </div>
  );
};
