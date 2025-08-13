import { useCustomArrangementContext } from "interactiveBible.managers.InstanceManager.CustomArrangementContext"
const { useEffect, useState, useCallback } = os.appHooks;

const DragOverBar = await thisBot.DragOverBar();

const TemplateSelectorOption = ({ draggingId, dragOverInfo, title, option, subOptions, handleOptionClick, checkedOption, handleDragStart, handleDragEnter, handleDragEnd }) => {

    const { isEditor } = useCustomArrangementContext();
    const [expanded, setExpanded] = useState(false);
    
    const handleTitleClick = useCallback(() => {
        console.log(`handle title click`)
        if(subOptions?.length > 0)
        {
            setExpanded(prevState => !prevState);
        }
        else
        {
            handleOptionClick(option);
        }
    }, [option, subOptions]);
    
    return (
        <>
            {option && dragOverInfo?.id === option.id && dragOverInfo.position === "top" && <DragOverBar />}

            <div 
                key={option?.id}
                className={`templateSelectorOption ${draggingId && draggingId === option.id ? "dragging" : ""} ${((option && checkedOption?.id === option?.id) || subOptions?.some((subOption) => {return subOption.id === checkedOption?.id})) ? "checked" : ""}`}
                draggable={isEditor}
                onDragStart={() => isEditor && handleDragStart(option.id)}
                onDragEnter={() => isEditor && handleDragEnter(option.id)}
                onDragEnd={() => isEditor && handleDragEnd()}
            >

                <div onClick={handleTitleClick} >
                    <span>{title}</span>
                    { subOptions?.length > 0 ? <span className={`material-symbols-outlined arrow ${expanded ? "up" : ""}`}>
                        keyboard_arrow_down
                    </span> : <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg> }
                </div>
                {(expanded && subOptions?.length > 0) && <div>
                    {subOptions.map((subOption) => {
                        return <div className={`${checkedOption?.id === subOption.id ? "checked" : ""}`} key={subOption.id} onClick={() => {handleOptionClick(subOption)}}>
                            <span>{subOption.name}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#5f6368"><path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg>
                        </div>
                    })}
                </div>}
            </div>

            {option && dragOverInfo?.id === option.id && dragOverInfo.position === "bottom" && <DragOverBar />}
        </>
    )
}

return TemplateSelectorOption;