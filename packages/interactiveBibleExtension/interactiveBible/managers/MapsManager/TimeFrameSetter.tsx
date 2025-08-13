import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"
import { ToggleButton } from "interactiveBible.managers.MapsManager.ToggleButton"

export const TimeFrameSetter = () => {
    
    const { userPresenceTimes, UserPresenceTimeType, toggleTime } = useMapToolContext();

    return (
        <div className="timeFrameSetter">
            <div>
                {userPresenceTimes.Past.time !== UserPresenceTimeType.Forever && <button className="timeSetter"><span className="material-symbols-outlined">arrow_back_ios_new</span></button> }
                <ToggleButton
                    name={userPresenceTimes.Past.time === UserPresenceTimeType.Forever ? UserPresenceTimeType.Forever : `1 ${userPresenceTimes.Past.time}`} 
                    enabled={userPresenceTimes.Past.enabled} 
                    onClick={() => {toggleTime({time: "Past"})}}
                    iconName="history"
                />
                {userPresenceTimes.Past.time !== UserPresenceTimeType.Day && <button className="timeSetter"><span className="material-symbols-outlined">arrow_forward_ios</span></button> }
            </div>
            <ToggleButton 
                name="Today" 
                enabled={userPresenceTimes.Present.enabled} 
                onClick={() => {toggleTime({time: "Present"})}}
                iconName="schedule"
                
            />
            <div>
                {userPresenceTimes.Future.time !== UserPresenceTimeType.Day && <button className="timeSetter"><span className="material-symbols-outlined">arrow_back_ios_new</span></button> }
                <ToggleButton 
                    name={userPresenceTimes.Future.time === UserPresenceTimeType.Forever ? UserPresenceTimeType.Forever : `1 ${userPresenceTimes.Future.time}`} 
                    enabled={userPresenceTimes.Future.enabled} 
                    onClick={() => {toggleTime({time: "Future"})}}
                    iconName="calendar_month"
                />
                {userPresenceTimes.Future.time !== UserPresenceTimeType.Forever && <button className="timeSetter"><span className="material-symbols-outlined">arrow_forward_ios</span></button> }
            </div>
        </div>
    )
}