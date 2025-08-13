import { useCustomArrangementContext } from "interactiveBible.managers.InstanceManager.CustomArrangementContext"
const { useCallback, useState, useRef, useEffect } = os.appHooks;

const TemplateEditor = await thisBot.TemplateEditor();
const NavigationButtons = await thisBot.NavigationButtons();

const CustomArrangementOptionEditor = ({templateRef, navigationButtonsInfo, setNavigationButtonsInfo, template, setTemplate, singleOptions, reset}) => {

    const { isEditor } = useCustomArrangementContext();
    const [selectedTestament, setSelectedTestament] = useState(null)
    const [selectedSection, setSelectedSection]     = useState(null)
    const [errors, setErrors]                       = useState(null);
    const [showBookSelector, setShowBookSelector]   = useState(false);
    const initialTemplateName = useRef(template?.name)
    const selectedTestamentRef = useRef(null);
    const selectedSectionRef = useRef(null);

    const handleBackButtonClick = useCallback(() => {
        if(selectedSectionRef.current)
        {
            handlePathTestamentClick()
        }
        else
        {
            if(selectedTestamentRef.current)
            {
                handlePathTemplateClick()
            }
            else
            {
                setTemplate(null);
            }
        }
    }, [template, selectedTestament, selectedSection])

    useEffect(() => {
        selectedTestamentRef.current = selectedTestament;
        selectedSectionRef.current = selectedSection;
    }, [selectedTestament, selectedSection])

    const handleForwardButtonClick = useCallback(() => {
        const {isValid, errors} = IsValidArrangement({template: templateRef?.current, isEditor, initialTemplateName})
        if(isValid)
        {
            if(isEditor)
            {
                const index = singleOptions.findIndex((currOption) => {
                    return currOption.id === templateRef.current.id
                })
                if(index >= 0 && index !== null)
                {
                    shout("OnCustomArrangementEdited", {arrangement: template, editionIndex: index});
                    reset()
                }
            }
            else 
            {
                shout("OnCustomArrangementCreated", {arrangement: templateRef.current});
                reset()
            }
        }
        else
        {
            setErrors(errors);
        }
    }, [template, isEditor, initialTemplateName]);

    const updateNavigationButtonsInfo = useCallback(() => {
        let buttonsInfo = [
            {
                content: "Back",
                iconName: "arrow_back_ios_new",
                action: handleBackButtonClick,
                backgroundColor: "grey",
                enabled: true
            },
            {
                content: isEditor ? "Save" : "Create",
                iconName: "check",
                action: handleForwardButtonClick,
                backgroundColor: "green",
                enabled: true
            }
        ];
        setNavigationButtonsInfo(buttonsInfo)
    }, [isEditor])

    const handlePathTemplateClick = useCallback(() => {
        setSelectedTestament(null);
        setSelectedSection(null);
        setShowBookSelector(false);
    }, [ selectedTestament, selectedSection, showBookSelector ]);

    const handlePathTestamentClick = useCallback(() => {
        setSelectedSection(null);
        setShowBookSelector(false);

    }, []);

    useEffect(() => {
        updateNavigationButtonsInfo();
    }, [isEditor])

    return (
        <>
            <TemplateEditor 
                template={template}
                setTemplate={setTemplate}
                selectedTestament={selectedTestament}
                setSelectedTestament={setSelectedTestament}
                selectedSection={selectedSection}
                setSelectedSection={setSelectedSection}
                initialTemplateName={initialTemplateName}
                handlePathTemplateClick={handlePathTemplateClick}
                handlePathTestamentClick={handlePathTestamentClick}
                showBookSelector={showBookSelector}
                setShowBookSelector={setShowBookSelector}
                errors={errors}
                setErrors={setErrors}
            />   
            <NavigationButtons navigationButtonsInfo={navigationButtonsInfo} />
        </>
    )
}

return CustomArrangementOptionEditor;

function IsValidArrangement({template, isEditor, initialTemplateName})
{
    let errors = [];

    const isValidByName = !thisBot.vars.fixedArrangementsInfo.some((arrangementInfo) => {
        return arrangementInfo.name === template.name
    }) || (isEditor && template.name === initialTemplateName.current)

    console.log({isValidByName, name: template.name, initialTemplateName: initialTemplateName.current})

    const isValidByContent = template.testaments?.length > 0 && template.testaments.every?.((testament) => {
        return testament?.sections?.length > 0 && testament.sections.every?.((section) => {
            return section?.books?.length > 0
        })
    })
    if(!isValidByName) errors.push("Give your arrangement a new name.")
    if(!isValidByContent) errors.push("Each arrangement must include at least one section, one subsection per section, and one book per subsection.")
    return {isValid: isValidByName && isValidByContent, errors}
}