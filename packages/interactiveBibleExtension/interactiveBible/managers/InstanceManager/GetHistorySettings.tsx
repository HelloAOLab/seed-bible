import {HistoryTimePeriodInfo} from "interactiveBible.managers.InstanceManager.HistoryTimePeriodInfo"

const { useState, useEffect} = os.appHooks;

const Toggle = ({title, onChange}) => {
    return(
        <div className='toggleContainer'>
            <h3>{title}</h3>
            <label className="switch">
                <input type="checkbox" onChange={onChange} checked={thisBot.masks.isInHistoryMode}/>
                <span class="slider round"></span>
            </label>
        </div>
    )
}

const TimePeriodInfo = ({timePeriodInfo, timePeriodsInfo, OnTimePeriodChanged, RemoveTimePeriodById}) => {

    const availableTimeUnits = Object.keys(TimeUnit)
    const [currentTimeUnitIndex, setCurrentTimeUnitIndex] = useState(availableTimeUnits.indexOf(timePeriodInfo.timeUnit));
    const [currentTimeAmount, setCurrentTimeAmount] = useState(timePeriodInfo.timeAmount);
    const [currentColor, setCurrentColor] = useState(timePeriodInfo.color);
    const CyclePeriodOfTime = () => {
        let index = currentTimeUnitIndex;
        index++;
        if(index >= availableTimeUnits.length) index = 0;
        setCurrentTimeUnitIndex(index);
    }

    useEffect(() => {
        timePeriodInfo.timeUnit = availableTimeUnits[currentTimeUnitIndex];
        timePeriodInfo.timeAmount = currentTimeAmount;
        timePeriodInfo.color = currentColor;
        OnTimePeriodChanged()
    }, [currentTimeUnitIndex, currentTimeAmount, currentColor])
    
    return (
        <div className='timePeriodColorContainer'>
            {timePeriodInfo.isNowTimePeriod ? <p>Now</p> : <div className='timePeriodContainer'>
                <p>Last</p>
                <input type='number' value={currentTimeAmount} min='1' className='timePeriodNumber' onChange={e => setCurrentTimeAmount(Number(e.target.value))}/>
                <button type="button" onClick={() => {CyclePeriodOfTime()}}>{availableTimeUnits[currentTimeUnitIndex]}</button>
            </div>}
            <input className='colorPicker' type="color" value={currentColor} onChange={e => setCurrentColor(e.target.value)}/>
            { timePeriodsInfo.length > 2 && !timePeriodInfo.isNowTimePeriod ? 
                <div className="timePeriodCloseIconContainer" onClick={() => {RemoveTimePeriodById(timePeriodInfo)}} >
                    <svg xmlns="http://www.w3.org/2000/svg" height="100%" viewBox="0 -960 960 960" width="100%" fill="#5f6368"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
                </div>  : null }
        </div>
    )
}

const NewTimePeriodButton = ({onClick}) => {
    return (
        <div className='newTimePeriodButtonContainer' onClick={onClick}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
            <p>Add time period</p>
        </div>
    )
}

const SettingsBackground = () => {

    const [timePeriodsInfo, setTimePeriodsInfo] = useState(thisBot.masks.historyTimePeriodsInfo.toSorted((periodInfoA, periodInfoB) => {
        return periodInfoA.GetTimePeriodInMs() - periodInfoB.GetTimePeriodInMs()
    }));

    useEffect(() => {
        thisBot.masks.historyTimePeriodsInfo = timePeriodsInfo
    }, [timePeriodsInfo])
    
    const HandleHistoryModeSettings = (e) => {
        if(e.target.checked) InstanceManager.EnterHistoryMode();
        else InstanceManager.ExitHistoryMode();
    }

    const HandleNewTimePeriodButtonClick = () => {
        const sortedTimePeriods = timePeriodsInfo.toSorted((periodInfoA, periodInfoB) => {return periodInfoA.GetTimePeriodInMs() - periodInfoB.GetTimePeriodInMs()});
        const lastTimePeriod = sortedTimePeriods[sortedTimePeriods.length - 1];
        const newTimePeriod = new HistoryTimePeriodInfo({color: GetRandomColor(), timeAmount: Number(lastTimePeriod.timeAmount) + 1, timeUnit: lastTimePeriod.timeUnit})
        setTimePeriodsInfo([...timePeriodsInfo, newTimePeriod].toSorted((periodInfoA, periodInfoB) => {return periodInfoA.GetTimePeriodInMs() - periodInfoB.GetTimePeriodInMs()}));
    }

    const OnTimePeriodChanged = () => {
        setTimePeriodsInfo(timePeriodsInfo.toSorted((periodInfoA, periodInfoB) => {return periodInfoA.GetTimePeriodInMs() - periodInfoB.GetTimePeriodInMs()}))
    }

    const RemoveTimePeriodById = (timePeriodInfo) => {
        let index = timePeriodsInfo.indexOf(timePeriodInfo);
        const newTimePeriods = timePeriodsInfo.toSpliced(index, 1);
        setTimePeriodsInfo(newTimePeriods);
    }
    
    return (
        <div className='settingsBackground'>
            <h2 className="historySettingsTitle">History Settings</h2>
            <Toggle title={`History Mode`} onChange={ e => HandleHistoryModeSettings(e)}/>
            <hr/>
            {timePeriodsInfo.map((timePeriodInfo) => {
                return <TimePeriodInfo timePeriodInfo={timePeriodInfo} timePeriodsInfo={timePeriodsInfo} OnTimePeriodChanged={OnTimePeriodChanged} key={timePeriodInfo.id} RemoveTimePeriodById={RemoveTimePeriodById}/>
            })}
            <NewTimePeriodButton onClick={() => {HandleNewTimePeriodButtonClick()}}/>
        </div>
    )
} 

const HistorySettings = () => {

    return (
        <>
            <style>{thisBot.tags["HistorySettings.css"]}</style>
            <SettingsBackground />
        </>
    );
};

return HistorySettings;