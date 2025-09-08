const css = thisBot.tags["layers.css"];
const { useState, useEffect, useMemo, useCallback, useContext } = os.appHooks;
// const LayersP = getBot('system', 'context.layers').Provider();

const Layers = ({ layers, setLayers, selectingLayerWord, setSelectingLayerWord }) => {
    const layersContext = useContext(LayersContext)
    const [openLayers, setOpenLayers] = useState(false);

    const activateLayer = ({ layer }) => {
        let tempSelectedLayers = layersContext.state.layers;
        tempSelectedLayers[layer.layerName].selected = true;
        layersContext.dispatch({ type: "updateLayers", payload: { ...tempSelectedLayers } })
    }

    const deActivateLayer = ({ layer }) => {
        let tempSelectedLayers = layersContext.state.layers;
        tempSelectedLayers[layer.layerName].selected = false;
        if (layersContext.state.selectingLayerWord === layer.layerName) {
            layersContext.dispatch({ type: "updateSelectingLayerWord", payload: null })
        }
        layersContext.dispatch({ type: "updateLayers", payload: { ...tempSelectedLayers } })
    }

    const addLayer = async () => {
        let layerName = await os.showInput(null, {
            placeholder: "Enter New Layer Name"
        });
        if (layerName !== null && layerName !== "" && !layersContext.state.layers[layerName]) {
            let tempSelectedLayers = layersContext.state.layers;
            tempSelectedLayers[layerName] = {
                layerName: layerName,
                layerType: "customLayer",
                color: "#84FFFF",
                selected: true,
                data: {}
            };
            layersContext.dispatch({ type: "updateLayers", payload: { ...tempSelectedLayers } })
        }
    }

    const handleLayerSelect = ({ layer }) => {
        if (layer.layerName === layersContext.state.selectingLayerWord) {
            layersContext.dispatch({ type: "updateSelectingLayerWord", payload: null })
        } else {
            layersContext.dispatch({ type: "updateSelectingLayerWord", payload: layer.layerName })
        }
    }

    const changeLayerColor = ({ layer, color }) => {
        let tempSelectedLayers = layersContext.state.layers;
        tempSelectedLayers[layer.layerName].color = color;
        layersContext.dispatch({ type: "updateLayers", payload: { ...tempSelectedLayers } })
    }

    useEffect(() => {
        globalThis.setOpenLayers = setOpenLayers;
        globalThis.openLayers = openLayers;
        return () => {
            globalThis.setOpenLayers = null;
            globalThis.openLayers = null;
        }
    }, [openLayers]);

    return <>
        <style>{css}</style>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
        <h2>Layers</h2>

        {
            Object.values(layersContext.state.layers).map((item, index) => {
                return <div onCLick={event => {
                    if (event.target !== event.currentTarget) {
                        return
                    }
                    activateLayer({ layer: item })
                }} id={`${index}-layer`} class="layer-container" style={{ background: item.selected ? "#CFD8DC" : "white" }}>
                    <span onCLick={event => {
                        if (event.target !== event.currentTarget) {
                            return
                        }
                        activateLayer({ layer: item })
                    }} >{item.layerName}</span>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "5px" }}>
                        {item.layerType === "customLayer" && <button onClick={() => { handleLayerSelect({ layer: item }) }} style={{ color: layersContext.state.selectingLayerWord === item.layerName ? "blue" : "black", background: "none", border: "none", cursor: "pointer" }} class="material-symbols-outlined">arrow_selector_tool</button>}
                        <input value={item.color} onChange={e => { changeLayerColor({ layer: item, color: e.target.value }) }} class="select-color" type="color" />
                        {item.selected && <button onClick={event => {
                            if (event.target !== event.currentTarget) {
                                return
                            }
                            deActivateLayer({ layer: item })
                        }} style={{ background: "none", border: "none", cursor: "pointer" }} class="material-symbols-outlined">Remove</button>}
                    </div>

                </div>
            })
        }

        <button style={{width: "80%", borderRadius: "5px"}} class="material-symbols-outlined" onClick={() => addLayer()}>Add</button>
    </>
}

return Layers