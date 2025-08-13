import { useCustomArrangementContext } from "interactiveBible.managers.InstanceManager.CustomArrangementContext"
const { useState, useCallback, useEffect, useRef } = os.appHooks;

const EditionToggle = await thisBot.EditionToggle();
const TemplateSelector = await thisBot.TemplateSelector();
const NavigationButtons = await thisBot.NavigationButtons();

const CustomArrangementOptionSelector = ({reset, navigationButtonsInfo, setNavigationButtonsInfo, setSelectedOption, singleOptions, groupOptions}) => {
    
    const { isEditor} = useCustomArrangementContext();
    
    const [checkedOption, setCheckedOption] = useState(null);
    const [hasListBeenModified, setHasListBeenModified] = useState(false);
    const [reorderedList, setReorderedList] = useState(null)
    const initialList = useRef([...singleOptions])
    // Task: Finish and integrate useReorderableList

    useEffect(() => {
        initialList.current = [...singleOptions]
    }, [singleOptions])

    const handleContinueButtonClick = useCallback(() => {
        if(checkedOption) setSelectedOption(checkedOption)
    }, [checkedOption]);

    const handleDeleteButtonClick = useCallback(() => {
        if(isEditor)
        {
            const index = singleOptions.findIndex((currOption) => {
                return currOption.id === checkedOption.id
            })
            if(index >= 0 && index !== null)
            {
                shout("OnCustomArrangementDeleted", {deletionIndex: index});
                reset()
            }
        }
    }, [checkedOption, isEditor]);

    const handleRevertButtonClick = useCallback(() => {
        setReorderedList(null);
        setHasListBeenModified(false);
    }, [])

    const handleSaveButtonClick = useCallback(() => {
        shout("OnCustomArrangementsReordered", {list: reorderedList});
        initialList.current = [...reorderedList]
        setReorderedList(null);
        setHasListBeenModified(false);
        reset()
    }, [reorderedList])

    const updateNavigationButtonsInfo = useCallback(() => {
        let buttonsInfo;
        if(isEditor)
        {
            buttonsInfo = [
                {
                    content: "Revert",
                    iconName: "restart_alt",
                    action: handleRevertButtonClick,
                    backgroundColor: "#2F4F4F",
                    enabled: hasListBeenModified ? true : false
                },
                {
                    content: "Delete",
                    iconName: "delete",
                    action: handleDeleteButtonClick,
                    backgroundColor: "#FF0000",
                    enabled: (checkedOption && !hasListBeenModified) ? true : false
                },
                {
                    content: "Edit",
                    iconName: "edit",
                    action: handleContinueButtonClick,
                    backgroundColor: "#008080",
                    enabled: (checkedOption && !hasListBeenModified) ? true : false
                },
                {
                    content: "Save",
                    iconName: "check",
                    action: handleSaveButtonClick,
                    backgroundColor: "#008000",
                    enabled: hasListBeenModified ? true : false
                }
            ]
        }
        else
        {
            buttonsInfo = [
                {
                    content: "Continue",
                    iconName: "check",
                    action: handleContinueButtonClick,
                    backgroundColor: "#056100",
                    enabled: checkedOption ? true : false
                }
            ]
        }
        setNavigationButtonsInfo(buttonsInfo)
    }, [isEditor, checkedOption, hasListBeenModified])

    const handleOptionClick = useCallback((option) => {
        if(!hasListBeenModified) setCheckedOption((currValue) => {return currValue?.id === option.id ? null : option})
    }, [checkedOption])

    useEffect(() => {
        setCheckedOption(null);
    }, [isEditor])

    useEffect(() => {
        updateNavigationButtonsInfo();
    }, [isEditor, checkedOption, hasListBeenModified])

    useEffect(() => {
        if(hasListBeenModified) setCheckedOption(null);
    }, [hasListBeenModified])
    
    return (
        <>
            <div className="templateWrapper">
                <EditionToggle/>
                {isEditor && singleOptions?.length == 0 ? <p>
                    No editable arrangements available. Head to the <b>Create</b> tab to create one!
                </p> : <TemplateSelector
                    initialList={initialList}
                    setReorderedList={setReorderedList}
                    setHasListBeenModified={setHasListBeenModified}
                    checkedOption={checkedOption}
                    handleOptionClick={handleOptionClick}
                    singleOptions={hasListBeenModified ? reorderedList : singleOptions}
                    groupOptions={groupOptions}
                    key={isEditor ? "edition" : "creation"}
                />}
            </div>
            { isEditor && singleOptions?.length == 0 ? null : <NavigationButtons navigationButtonsInfo={navigationButtonsInfo} /> }
        </>
    )
}

return CustomArrangementOptionSelector