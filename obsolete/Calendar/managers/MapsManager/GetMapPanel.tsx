import { MapPanelProvider } from "managers.MapsManager.MapPanelContext"
import { MapWrapper } from "managers.MapsManager.MapWrapperComponent"

const MapPanel = () => {
    return (
        <>
            <style>{thisBot.tags["MapPanel.css"]}</style>
            <MapPanelProvider>
                <MapWrapper />
            </ MapPanelProvider>
        </>
    );
};

return MapPanel