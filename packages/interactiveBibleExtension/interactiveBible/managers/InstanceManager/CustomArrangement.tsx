import { useCustomArrangementContext } from "interactiveBible.managers.InstanceManager.CustomArrangementContext"
const { useState, useEffect, useCallback, useRef } = os.appHooks;

const CustomArrangementOptionSelector = await thisBot.CustomArrangementOptionSelector();
const CustomArrangementOptionEditor = await thisBot.CustomArrangementOptionEditor();

const getSingleOptions = (isEditor) => {
    return isEditor ? [
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
}

const getGroupOptions = (isEditor) => {
    return isEditor ? [] : [
        {
            title: "Start from a template",
            options: [...InstanceManager.vars.fixedArrangementsInfo.map((arrangementInfo) => {return GetTemplateFromArrangement(arrangementInfo)})]
        }
    ]
}

const CustomArrangement = () => {

    const { isEditor } = useCustomArrangementContext();


    const [selectedOption, setSelectedOption] = useState(null);
    const [singleOptions, setSingleOptions] = useState(getSingleOptions(isEditor));
    const [groupOptions, setGroupOptions] = useState(getGroupOptions(isEditor));
    const [navigationButtonsInfo, setNavigationButtonsInfo] = useState([])
    const templateRef = useRef(null);

    globalThis.updateCustomArrangementOptions = useCallback(() => {
        setSingleOptions(getSingleOptions(isEditor))
        setGroupOptions(getGroupOptions(isEditor))
    }, [isEditor])

    useEffect(() => {
        updateCustomArrangementOptions();
    }, [isEditor])

    const reset = useCallback(() => {
        setSelectedOption(null);
        updateCustomArrangementOptions()
    }, [isEditor])

    useEffect(() => {
        templateRef.current = selectedOption;
    }, [selectedOption])
    
    return (
        <div id="customArrangement" className="toolContainer">
            { selectedOption ? <CustomArrangementOptionEditor
                templateRef={templateRef}
                template={selectedOption}
                setTemplate={setSelectedOption}
                singleOptions={singleOptions}
                reset={reset}
                navigationButtonsInfo={navigationButtonsInfo}
                setNavigationButtonsInfo={setNavigationButtonsInfo}
            /> : <CustomArrangementOptionSelector
                reset={reset}
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