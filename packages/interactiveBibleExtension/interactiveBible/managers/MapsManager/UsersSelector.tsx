import { useMapToolContext } from "interactiveBible.managers.MapsManager.MapToolContext"

const UserButton = ({name, color, borderColor}) => {
    
    const { handleUserButtonClick } = useMapToolContext();

    return (
        <button onClick={() => {handleUserButtonClick({user: name})}} className="userButton">
            <span style={{backgroundColor: color, borderColor}}>{name[0]}</span>
            <span>{name}</span>
        </button>
    )
}

export const UsersSelector = () => {
    
    const { usersStatus, content, usersInfo } = useMapToolContext();
    
    return (
        <div className="usersSelector">
            {Array.from(content).map(([user]) => {
                const enabled = usersStatus.get(user);
                return < UserButton name={user} color={usersInfo[user].color} borderColor={enabled ? usersInfo[user].borderColor : usersInfo[user].color} enabled={enabled} iconName={usersInfo[user].iconName} />
            })}
        </div>
    )
}