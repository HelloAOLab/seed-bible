const { useCallback,useState } = os.appHooks;

os.unregisterApp('hints')
os.registerApp('hints',thisBot)

const HintsUI = () => {
    const [hints,setHints] = useState(Array(7).fill(""));

    const onHintsChangeHandler = useCallback((newVal,index)=>{
        setHints(prev=>{
            const old = [...prev];
            old[index] = newVal.replace("  "," ");
            return old;
        });
    },[]);

    const onSubmit = useCallback((e)=>{
        if(!hints[0].trim()) return os.toast("First Hints is mandatory to start the game.");
        whisper(thisBot,"createGame",{hints});
        os.unregisterApp("hints");
    },[hints]);

    const onCancel = useCallback(()=>{
        os.unregisterApp('hints');
    },[]);

    return <>
        <style>
            {thisBot.tags["index.css"]}
        </style>
        <div className="hints-container">
            <h2 className="hints-heading">Please Enter Hints for user <sup>(* is Mandatory)</sup></h2>
            <p className="hints-para">Seven hints for Seven tries</p>
            <div className="hints-form">
                {hints.map((hint,index)=><div key={index} className="hints-item">
                <label for={`hint${index+1}`}>Hint {index+1}{index===0 && "*"}</label>
                <input 
                    id="hint" 
                    type="text" 
                    placeholder="Write Your Hint Here" 
                    name={`hint${index+1}`} 
                    value={hint} 
                    onChange={(e)=>onHintsChangeHandler(e.target.value,index)}
                >
                </input>
                </div>)}
                <div className="hints-buttons">
                    <button type="button" onClick={()=>{onCancel}}>Cancel</button>
                    <button type="button" onClick={()=>onSubmit()}>Save & Continue</button>
                </div>
            </div>
        </div>
    </>;
};

os.compileApp('hints',<HintsUI/>)