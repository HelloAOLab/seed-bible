import { MapToolModes, ProjectChapterState } from "interactiveBible.managers.MapsManager.MapTool"
const { useMemo, useState, useCallback, useRef } = os.appHooks;
import { MapViewerContext } from "interactiveBible.managers.MapsManager.MapViewerContext"
import {MapViewerContainer} from "interactiveBible.managers.MapsManager.MapViewerContainer"

const MapViewer = () => {

    const [showingAllChapters, setShowingAllChapters] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const [mode, setMode] = useState(MapToolModes.Viewer)
    const arrangementIndex = 0;
    const arrangement = useMemo(() => {return InstanceManager.vars.fixedArrangementsInfo[arrangementIndex]}, []);
    const getEmptySelection = useCallback(() => {
        return Object.fromEntries(
            arrangement.testaments.map(({name: testamentName, sections}) => {
                return [testamentName, Object.fromEntries(sections.map(({name: sectionName, books}) => {
                    return [sectionName, Object.fromEntries(books.map(({commonName}) => {
                        return [commonName, StacksManager.tags.booksStaticInfo[commonName].chaptersInfo.map(() => {
                            return false
                        })]
                    }))]
                }))]
            })
        )
    }, [])

    const [selection, setSelection] = useState(getEmptySelection())
    const [projects, setProjects] = useState([]);
    const [projectIndex, setProjectIndex] = useState(0)
    const [projectName, setProjectName] = useState("");
    const [isInSelectionMode, setIsInSelectionMode] = useState(false);
    const lastChapterCheckedKey = useRef(null);
    const project = useMemo(() => {return projects?.[projectIndex]}, [projects, projectIndex]);

    const selectedChaptersKeys = useMemo(() => {
        const keys = [];
        Object.keys(selection).forEach((testamentName) => {
            const testament = selection[testamentName];
            return Object.keys(testament).forEach((sectionName) => {
                const section = testament[sectionName];
                return Object.keys(section).forEach((bookName) => {
                    const chapters = section[bookName];
                    return chapters.forEach((chapter, chapterIndex) => {
                        if(chapter) keys.push({ testamentName, sectionName, bookName, chapterIndex });
                    });
                })
            })
        })
        return keys
    }, [selection])

    const clearSelection = useCallback(() => {
        setSelection(getEmptySelection())
        setProjectName("");
    }, [])

    const handleModeSelectorClick = useCallback((mode) => {
        setMode(mode)
        clearSelection();
    }, [])

    const addNewProject = useCallback((newProject) => {
        setProjects(prev => [...prev, newProject])
    }, [])

    const saveSelection = useCallback(() => {
        const projectStructure = GetProjectFromSelection(selection)
        addNewProject({name: projectName.length > 0 ? projectName : `My project ${projects.length + 1}` , structure: projectStructure})
        setMode(MapToolModes.Viewer)
        clearSelection()
    }, [selection, projects, projectName])

    const setChapterState = useCallback((info) => {

        const fixedInfo = Array.isArray(info) ? info : [info]
        const copy = JSON.parse(JSON.stringify(projects[projectIndex]));
        fixedInfo.forEach((currInfo) => {
            const {key, state} = currInfo; 
            const {testamentName, sectionName, bookName, chapterIndex} = key;
            copy.structure[testamentName][sectionName][bookName][chapterIndex] = state;
        })
        setProjects(prev => prev.toSpliced(projectIndex, 1, copy))
    }, [projects, projectIndex])
    
    const handleInputChange = useCallback((e) => {
        setProjectName(e.target.value);
    }, [])

    const handleProjectSelectorClick = useCallback(({index}) => {
        setProjectIndex(index)
    }, [])
    
    const toggleChapterCheckbox = useCallback((info) => {
        if(!Array.isArray(info) && info.value) lastChapterCheckedKey.current = info.key;
        else lastChapterCheckedKey.current = null;

        const fixedInfo = Array.isArray(info) ? info : [info];
        const newSelection = JSON.parse(JSON.stringify(selection));
        fixedInfo.forEach(({key, value}) => {
            const {testamentName, sectionName, bookName, chapterIndex} = key;
            newSelection[testamentName][sectionName][bookName][chapterIndex] = value;
        })
        setSelection(newSelection);

    }, [selection])
    
    const handleChapterShiftClick = useCallback(({key, value}) => {
        if(lastChapterCheckedKey.current && !AreKeysEqual(lastChapterCheckedKey.current, key))
        {
            const keys = GetKeysInRange({selection, keyA: lastChapterCheckedKey.current, keyB: key});
            const info = keys.map((key) => { return { key, value } });
            toggleChapterCheckbox(info);
        }
        else toggleChapterCheckbox({key, value});
    }, [selection])

    const onChapterClickDependencies = [mode, project, isInSelectionMode, selection]

    const handleChapterClick = useCallback((e, key, checked) => {
        const info = {
            key,
            value: !checked
        }
        switch(mode)
        {
            case MapToolModes.Checkbox: {
                if(e.shiftKey && !checked)
                {
                    handleChapterShiftClick(info)
                }
                else
                {
                    toggleChapterCheckbox(info)
                }
            }
            break;
            case MapToolModes.Project: {

                if(project && isInSelectionMode)
                {
                    if(e.shiftKey && !checked)
                    {
                        handleChapterShiftClick(info)
                    }
                    else
                    {
                        toggleChapterCheckbox(info)
                    }
                }
            }
            break;

            default: break;
        }
    }, onChapterClickDependencies)

    const handleChapterClickAndHold = useCallback((e, key) => {
        if(mode === MapToolModes.Project && project && !isInSelectionMode)
        {
            const info = { key, value: true };
            toggleChapterCheckbox(info)
            setIsInSelectionMode(true);
        }
    }, onChapterClickDependencies)

    const onBookNameClickAndHoldDependencies = [mode, selection, isInSelectionMode];

    const handleBookNameClickAndHold = useCallback((showChapters, key, checked) => {
        if(showChapters)
        {
            if(mode === MapToolModes.Checkbox || mode === MapToolModes.Project)
            {
                const {testamentName, sectionName, bookName} = key;
                const info = selection[testamentName][sectionName][bookName].map((_, chapterIndex) => {
                    return {
                        key: {testamentName, sectionName, bookName, chapterIndex},
                        value: !checked
                    }
                })
                toggleChapterCheckbox(info)
                if(mode === MapToolModes.Project && !isInSelectionMode)
                {
                    setIsInSelectionMode(true)
                }
            }
        }
    }, onBookNameClickAndHoldDependencies)

    const handleSelectionModeCheckboxClick = useCallback(() => {
        clearSelection()
        setIsInSelectionMode(prev => !prev);
    }, [])
    
    const handleSelectionModeDoneButtonClick = useCallback(() => {
        clearSelection()
        setIsInSelectionMode(false);
    }, [])
    
    const handleStateSetterOptionClick = useCallback((state) => {
        const info = selectedChaptersKeys.map((key) => {
            return {key, state}
        })
        setChapterState(info);
        clearSelection()
    }, [selectedChaptersKeys])
    
    
    return (
        <>
            <style>{thisBot.tags["MapViewer.css"]}</style>
            
            <MapViewerContext.Provider value={{
                mode,
                arrangementIndex,
                selection,
                handleModeSelectorClick,
                clearSelection,
                saveSelection,
                projects,
                projectIndex,
                setChapterState,
                projectName,
                handleInputChange,
                handleProjectSelectorClick,
                selectedChaptersKeys,
                isInSelectionMode, 
                setIsInSelectionMode,
                onChapterClick: handleChapterClick,
                onChapterClickDependencies,
                onChapterClickAndHold: handleChapterClickAndHold,
                onBookNameClickAndHold: handleBookNameClickAndHold,
                onBookNameClickAndHoldDependencies,
                project,
                onSelectionModeCheckboxClick: handleSelectionModeCheckboxClick,
                onSelectionModeDoneButtonClick: handleSelectionModeDoneButtonClick,
                onSelectionModeClearSelectionButtonClick : clearSelection,
                onStateSetterOptionClick: handleStateSetterOptionClick,
                showingAllChapters,
                setShowingAllChapters,
                showLabels, 
                setShowLabels
            }}>
                <MapViewerContainer />
            </MapViewerContext.Provider>
        </>
    );
};

return {MapViewer}

function GetProjectFromSelection(selection)
{
    const project = JSON.parse(JSON.stringify(selection));
    for (const testamentName of Object.keys(project)) 
    {
        const testament = project[testamentName];
        for (const sectionName of Object.keys(testament)) 
        {
            const section = testament[sectionName];
            for (const bookName of Object.keys(section)) 
            {
                const chapters = section[bookName];

                section[bookName] = chapters.map((value) => {
                    return value ? ProjectChapterState.NotStarted : ProjectChapterState.Unset
                })
            }
        }
    }
    return project;
};

function AreKeysEqual(keyA, keyB)
{
    return keyA.testamentName === keyB.testamentName && keyA.sectionName === keyB.sectionName && keyA.bookName === keyB.bookName && keyA.chapterIndex === keyB.chapterIndex
}

function GetKeysInRange({selection, keyA, keyB})
{
    const allKeys = [];

    for (const testamentName of Object.keys(selection).toReversed()) 
    {
        const testament = selection[testamentName];
        for (const sectionName of Object.keys(testament).toReversed()) 
        {
            const section = testament[sectionName];
            for (const bookName of Object.keys(section).toReversed()) 
            {
                const chapters = section[bookName];
                for (let chapterIndex = 0; chapterIndex < chapters.length; chapterIndex++) 
                {
                    allKeys.push({ testamentName, sectionName, bookName, chapterIndex });
                }
            }
        }
    }

    const indexA = allKeys.findIndex((currentKey) => { return AreKeysEqual(currentKey, keyA) });
    const indexB = allKeys.findIndex((currentKey) => { return AreKeysEqual(currentKey, keyB) });

    const start = Math.min(indexA, indexB);
    const end = Math.max(indexA, indexB);

    const keys = allKeys.slice(start, end + 1);
    
    return keys
};