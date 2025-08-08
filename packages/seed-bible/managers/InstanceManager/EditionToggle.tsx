const { useState, useCallback } = os.appHooks;

const EditionToggle = ({isEditor, setIsEditor}) => {

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