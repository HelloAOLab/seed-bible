import { useCustomArrangementContext } from "interactiveBible.managers.InstanceManager.CustomArrangementContext"
const { useState, useCallback, useEffect } = os.appHooks;

const EditionToggle = () => {

    const { isEditor, setIsEditor } = useCustomArrangementContext();
    const handleToggleClick = useCallback(() => {
        setIsEditor(prevState => !prevState);
    }, [isEditor]);
    
    return (
        <div className={`editionToggleContainer ${isEditor ? "checked" : ""}`} onClick={handleToggleClick}>
            <div></div>
            <div>
                <span>Create</span>
                <span>Edit</span>
            </div>
        </div>
    )
}

return EditionToggle;