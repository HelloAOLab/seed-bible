const { useState, useEffect } = os.appHooks;

setTagMask(thisBot, "isShowingHighlightTool", true);
thisBot.HideHistorySettings();
await os.unregisterApp('highlightTool');
await os.registerApp('highlightTool', thisBot);

const Toggle = ({title, onChange}) => {
    return(
        <div className='toggleContainer'>
            <p>{title}</p>
            <label className="switch">
                <input type="checkbox" onChange={onChange} checked={thisBot.masks.isHighlightToolEnabled}/>
                <span class="slider round"></span>
            </label>
        </div>
    )
}

const ColorPicker = ({highlightColor, setHighlightColor}) => {
    return (
        <div className='colorPeriodContainer'>
            <p>Color</p>
            <input className='colorPicker' type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)}/>
        </div>
    )
}

const Controls = () => {
    return (
        <div className='controlsContainer'>
            <div className='stepsContainer'>
                <button onClick={() => {thisBot.TryUndoHighlight()}}>Undo</button>
                <button onClick={() => {thisBot.TryRedoHighlight()}}>Redo</button>
            </div>
            <button onClick={() => {thisBot.ClearHighlights()}}>Clear All</button>
        </div>
    )
}

const ToolContainer = () => {

    const [highlightColor, setHighlightColor] = useState(thisBot.tags.highlightColor);

    useEffect(() => {
        thisBot.tags.highlightColor = highlightColor
    }, [highlightColor])
    
    const HandleHighlightToolToggle = (e) => {
        thisBot.SetHighlightToolEnabled({enabled: e.target.checked})
    }
    
    return (
        <div className='toolContainer'>
            <div className='toolBackground'>
                <h2 className="toolTitle">Highlight Tool</h2>
                <Toggle title={`Enabled`} onChange={ e => HandleHighlightToolToggle(e)}/>
                <ColorPicker highlightColor={highlightColor} setHighlightColor={setHighlightColor}/>
                <hr/>
                <Controls/>
            </div>
        </div>
    )
} 

const App = () => {

    return (
        <>
            <style>{thisBot.tags["HighlightTool.css"]}</style>
            <ToolContainer/>
        </>
    );
};

os.compileApp('highlightTool',<App />);