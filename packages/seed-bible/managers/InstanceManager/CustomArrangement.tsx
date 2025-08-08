const { useState, useEffect, useCallback, useRef } = os.appHooks;

const CustomArrangementOptionSelector = await thisBot.CustomArrangementOptionSelector();
const CustomArrangementOptionEditor = await thisBot.CustomArrangementOptionEditor();

const CustomArrangement = () => {
    const [isEditor, setIsEditor] = useState(false);
    const isEditorRef = useRef(null);

    const getSingleOptions = useCallback(() => {
        return isEditorRef.current ? [
            ...thisBot.vars.customArrangements.map((arrangementInfo) => {return GetTemplateFromArrangement(arrangementInfo)})
        ] : [
            {
                name: "Custom Arrangement",
                optionTitle: "Start from scratch",
                id: uuid(),
                testaments: [
                    {
                        name: "Custom Section",
                        id: uuid(),
                        color: "#FFFFFF",
                        sections: [
                            {
                                name: "Custom Sub-section",
                                id: uuid(),
                                color: "#FFFFFF",
                                books: []
                            }
                        ]
                    }
                ]
            }
        ]
    }, []);

    const getGroupOptions = useCallback(() => {
        return isEditorRef.current ? [] : [
            {
                title: "Start from a template",
                options: [...InstanceManager.vars.fixedArrangementsInfo.map((arrangementInfo) => {return GetTemplateFromArrangement(arrangementInfo)})]
            }
        ]
    }, []);

    const [selectedOption, setSelectedOption] = useState(null);
    const [singleOptions, setSingleOptions] = useState(getSingleOptions());
    const [groupOptions, setGroupOptions] = useState(getGroupOptions());
    const [navigationButtonsInfo, setNavigationButtonsInfo] = useState([])
    const templateRef = useRef(null);

    const updateCustomArrangementOptions = useCallback(() => {
        setSingleOptions(getSingleOptions())
        setGroupOptions(getGroupOptions())
    }, [])
    globalThis.updateCustomArrangementOptions = updateCustomArrangementOptions;

    useEffect(() => {
        isEditorRef.current = isEditor
        updateCustomArrangementOptions();
    }, [isEditor])

    const reset = useCallback(() => {
        setSelectedOption(null);
        updateCustomArrangementOptions()
    }, [])

    useEffect(() => {
        templateRef.current = selectedOption;
    }, [selectedOption])
    
    return (
        <div id="customArrangement" className="toolContainer">
            { selectedOption ? <CustomArrangementOptionEditor
                templateRef={templateRef}
                template={selectedOption}
                setTemplate={setSelectedOption}
                isEditor={isEditor}
                singleOptions={singleOptions}
                reset={reset}
                navigationButtonsInfo={navigationButtonsInfo}
                setNavigationButtonsInfo={setNavigationButtonsInfo}
            /> : <CustomArrangementOptionSelector
                reset={reset}
                isEditor={isEditor}
                setIsEditor={setIsEditor}
                setSelectedOption={setSelectedOption}
                singleOptions={singleOptions}
                groupOptions={groupOptions}
                navigationButtonsInfo={navigationButtonsInfo}
                setNavigationButtonsInfo={setNavigationButtonsInfo}
            /> }
        </div>
    )
}

return CustomArrangement;