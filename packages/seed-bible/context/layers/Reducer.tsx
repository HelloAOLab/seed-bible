const initialState = {
    layers: {
        Default: {
            layerName: "Default",
            layerType: "none",
            color: "#000000",
            selected: true,
            data: {}
        },
        Locations: {
            layerName: "Locations",
            layerType: "locations",
            color: "#311B92",
            selected: false,
            data: {}
        },
        Events: {
            layerName: "Events",
            layerType: "events",
            color: "#2E7D32",
            selected: false,
            data: {}
        },
        Custom: {
            layerName: "Custom",
            layerType: "edit",
            color: "#FF6D00",
            selected: false,
            data: {}
        },
    },
    selectingLayerWord: null
};

const reducer = (state, action) => {
    switch (action.type) {
        case "updateLayers":
            return { ...state, layers: action.payload };
        case "updateSelectingLayerWord":
            return { ...state, selectingLayerWord: action.payload };
        default:
            return state;
    }
};

return {reducer, initialState};