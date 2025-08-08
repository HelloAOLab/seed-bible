const { useCallback, useRef, useState, useEffect, createRef } = os.appHooks;
import { useSideBarContext } from 'app.hooks.sideBar'
import { MenuIcon } from 'app.components.icons'

const DragOverBar = await thisBot.DragOverBar();

const TemplateItem = ({
    item,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handleItemDelete,
    handleItemColorChange,
    handleNameChange,
    handleInspect,
    dragOverInfo,
    draggingId,
    index,
    showArrowRight = false
}) => {
    const { openPopupSettings } = useSideBarContext();
    const [nameInputRefState, setNameInputRefState] = useState(null)

    const focusOnNameInput = () => {
        console.log(nameInputRefState)
        nameInputRefState?.current?.focus();
        closePopupSettings();
    }

    const handleMoreClick = useCallback(() => {
        const items = [
            // handleNameChange ? { icon: <MenuIcon name="edit" />, title: 'Rename', onClick: focusOnNameInput } : null,
            showArrowRight ? { icon: <MenuIcon name="search" />, title: 'Inspect', onClick: () => { 
                    handleInspect(item);
                    closePopupSettings();
                } 
            } : null,
            /*{ icon: <MenuIcon name="palette" />, title: 'Edit color', onClick: () => {
                    closePopupSettings(); 
                } 
            },*/
            { icon: <MenuIcon name="close" />, title: 'Delete', onClick: () => { 
                    handleItemDelete(index);
                    closePopupSettings(); 
                }
            }
        ].filter((element) => {return element})
        
        openPopupSettings({
            type: 'normal', 
            items
        })
    }, [item, index])
    

    useEffect(() => {
        setNameInputRefState(createRef())
    }, [])
    
    return (
        <>
            {dragOverInfo?.id === item.id && dragOverInfo.position === "top" && <DragOverBar />}

            <li
                key={item.id}
                draggable="true"
                onDragStart={() => handleDragStart(item.id)}
                onDragEnter={() => handleDragEnter(item.id)}
                onDragEnd={handleDragEnd}
                onClick={handleMoreClick}
                className={`listItem ${draggingId === item.id ? "dragging" : ""}`}
                style={{
                    backgroundColor: item.color,
                    color: GetTextColorBasedOnBackground(item.color),
                }}
            >
                {nameInputRefState && <input ref={nameInputRefState} type="text" value={item.name} onBlur={(e) => handleNameChange(e, item)} />}
            </li>

            {dragOverInfo?.id === item.id && dragOverInfo.position === "bottom" && <DragOverBar />}
        </>
    );
};

return TemplateItem;













// <div className="actionButtonsContainer">
//     <span className="material-symbols-outlined" onClick={() => handleItemDelete(index)}>
//         close
//     </span>
//     <div>
//         <span className="material-symbols-outlined">palette</span>
//         <input
//             type="color"
//             value={item.color}
//             onChange={(e) => handleItemColorChange(e, item.id)}
//         />
//     </div>
//     {showArrowRight && <span className="material-symbols-outlined" onClick={() => handleInspect(item)}>
//             chevron_right
//     </span>}
// </div>