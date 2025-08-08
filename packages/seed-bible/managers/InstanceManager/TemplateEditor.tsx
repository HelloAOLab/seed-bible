const { useState, useCallback, useEffect, useRef } = os.appHooks;

// const CustomArrangementTestament = thisBot.CustomArrangementTestament();
// const CustomArrangementSection = thisBot.CustomArrangementSection();
// const CustomArrangementBook = thisBot.CustomArrangementBook();


const TemplateItem = await thisBot.TemplateItem();


const Tooltip = thisBot.Tooltip();
const allBooks = InstanceManager.vars.fixedArrangementsInfo[0].testaments.flatMap((currTestament) => {
    return Object.keys(currTestament.sections).map((key) => {return currTestament.sections[key]}).flatMap((currSection) => {
        return currSection.books.flatMap((currBook) => {
            return currBook.commonName
        })
    })
}).reverse()

const TemplateEditor = ({
    template, 
    setTemplate,
    selectedTestament,
    setSelectedTestament,
    selectedSection,
    setSelectedSection,
    handlePathTemplateClick,
    handlePathTestamentClick,
    showBookSelector,
    setShowBookSelector,
    errors
}) => {
    const [draggingIndex, setDraggingIndex] = useState(null);
    const [propagateColor, setPropagateColor] = useState(false)
    const [draggingId, setDraggingId] = useState(null);
    const [dragOverInfo, setDragOverInfo] = useState(null);
    const [preventNameChange, setPreventNameChange] = useState(false);
    // Task: Finish and integrate useReorderableList

    const tempList = useRef(null);
    const preventNameChangeRef = useRef(preventNameChange);
    
    const handlePropagateColorToggleClick = useCallback(() => {
        setPropagateColor(prevState => !prevState);
    }, [])

    useEffect(() => {
        console.log(`[Debug] template.name: ${template.name}`)
    }, [template])

    const handleTemplateNameChange = useCallback(({_targetvalue: name}) => {
        const copy = {...template};
        copy.name = name
        setTemplate(copy);
    }, [template])

    const handleTestamentNameChange = useCallback((e, testament) => {
        if(preventNameChangeRef.current)
        {
            setPreventNameChange(false);
            return;
        }
        const copy = {...template};
        copy.testaments.find((currTestament) => {return testament.id == currTestament.id}).name = e.target.value
        setTemplate(copy);
    }, [template, preventNameChangeRef]);

    const handleSectionNameChange = useCallback((e, section) => {
        if(preventNameChangeRef.current)
        {
            setPreventNameChange(false);
            return;
        }
        const copy = {...template};
        copy.testaments.find((currTestament) => {return currTestament.id == selectedTestament.id}).sections.find((currSection) => {return currSection.id == section.id}).name = e.target.value
        setTemplate(copy);
    }, [template, preventNameChangeRef, selectedTestament])

    const handleBlur = useCallback((e) => {
        handleTemplateNameChange(e)
    }, []);

    const handleTestamentClick = useCallback((testament) => {
        setSelectedTestament(testament)
    }, []);

    const handleSectionClick = useCallback((section) => {
        setSelectedSection(section)
    }, []);

    const handleDragStart = useCallback((id) => {

        let currentList;
        if(selectedSection) currentList = selectedSection.books;
        else if(selectedTestament) currentList = selectedTestament.sections;
        else currentList = template.testaments;

        const draggedIndex = currentList.findIndex((item) => {return item.id === id});
        tempList.current = [...currentList]
        setDraggingIndex(draggedIndex);
        setDraggingId(id);
        setPreventNameChange(true);
    }, [selectedSection, selectedTestament, tempList, template]);

    const handleDragEnter = useCallback((id) => {
        if(draggingId)
        {
            if (draggingId === id) 
            {
                setDragOverInfo({
                    id: null,
                    position: null,
                });
            }
            else
            {
                let currentList;
                if(selectedSection) currentList = selectedSection.books;
                else if(selectedTestament) currentList = selectedTestament.sections;
                else currentList = template.testaments;

                const dragOverIndex = currentList.findIndex((item) => {return item.id === id});

                const newList = currentList.filter(item => item.id !== draggingId);

                newList.splice(dragOverIndex, 0, currentList[draggingIndex]);

                tempList.current = newList;

                setDragOverInfo({
                    id: id,
                    position: draggingIndex > dragOverIndex ? "top" : "bottom",
                });
            }

        }
    }, [template, draggingIndex, draggingId, selectedSection, selectedTestament, tempList]);
    
    const handleDragEnd = useCallback(() => {

        if(dragOverInfo?.id)
        {
            if(tempList.current)
            {
                if(selectedSection) selectedSection.books = tempList.current;
                else if(selectedTestament) selectedTestament.sections = tempList.current;
                else template.testaments = tempList.current;
            }
            setTemplate({...template});
        }
        
        setDragOverInfo({
            id: null,
            position: null,
        });
        setDraggingIndex(null);
        setDraggingId(null);
        tempList.current = null;
        setTimeout(() => {
            if(preventNameChangeRef.current === true) setPreventNameChange(false);
        }, 100);
    }, [tempList, selectedSection, selectedTestament, template, preventNameChangeRef, dragOverInfo]);

    const handleNewItemButtonClick = useCallback(() => {
        const copy = {...template};
        if(!selectedTestament)
        {
            const namePrefix = "Custom Section";
            let name = namePrefix;
            if(copy.testaments.some((testament) => {return testament.name === name}))
            {
                let i = 2
                do
                {
                    name = `${namePrefix} ${i}`;
                    i++
                }
                while(copy.testaments.some((testament) => {return testament.name === name}))
            }
            copy.testaments.push({
                name,
                id: uuid(),
                color: "#FFFFFF",
                sections: []
            })
        }
        else
        {
            const selectedTestamentIndex = copy.testaments.indexOf(selectedTestament)
            if(!selectedSection)
            {
                const namePrefix = "Custom Sub-section";
                let name = namePrefix;
                if(copy.testaments[selectedTestamentIndex].sections.some((section) => {return section.name === name}))
                {
                    let i = 2
                    do
                    {
                        name = `${namePrefix} ${i}`
                        i++
                    }
                    while(copy.testaments[selectedTestamentIndex].sections.some((section) => {return section.name === name}))
                }
                copy.testaments[selectedTestamentIndex].sections.push({
                    name,
                    id: uuid(),
                    color: "#FFFFFF",
                    books: []
                })
            }
            else
            {
                setShowBookSelector(true)
            }
        }
        setTemplate(copy)
    }, [selectedTestament, selectedSection, showBookSelector])

    const handleNewBookClick = useCallback((book) => {
        const copy = {...template};
        const selectedTestamentIndex = copy.testaments.indexOf(selectedTestament)
        const selectedSectionIndex = copy.testaments[selectedTestamentIndex].sections.indexOf(selectedSection);
        if(!copy.testaments[selectedTestamentIndex].sections[selectedSectionIndex].books.some((currBook) => {return currBook.name === book}))
        {
            copy.testaments[selectedTestamentIndex].sections[selectedSectionIndex].books.push({
                name: book,
                id: uuid(),
                color: "#FFFFFF"
            })
            setTemplate(copy)
        }
    }, [template, selectedTestament, selectedSection])

    const handleItemDelete = useCallback((index) => {
        const copy = {...template};

        if(!selectedTestament)
        {
            copy.testaments.splice(index, 1)
        }
        else
        {
            const selectedTestamentIndex = copy.testaments.indexOf(selectedTestament)
            if(!selectedSection)
            {
                copy.testaments[selectedTestamentIndex].sections.splice(index, 1)
            }
            else
            {
                const selectedSectionIndex = copy.testaments[selectedTestamentIndex].sections.indexOf(selectedSection)
                copy.testaments[selectedTestamentIndex].sections[selectedSectionIndex].books.splice(index, 1);
            }
        }


        setTemplate(copy)
    }, [template, selectedTestament, selectedSection])

    const handleItemColorChange = useCallback((e, id) => {
        const copy = {...template};
        if(!selectedTestament)
        {
            const testament = copy.testaments.find((testament) => {return testament.id === id})
            testament.color = e.target.value;

            if(propagateColor && testament.sections?.length > 0)
            {
                const sectionLevelColors = GetChildrenLevelColors({
                    sectionColorRGB: HexToRgb(e.target.value), 
                    colorRange: 70, 
                    levelsLength: testament.sections.length
                })
                testament.sections?.forEach((section, index) => {
                    section.color = sectionLevelColors[index];
                    if(section.books?.length > 0)
                    {
                        const bookLevelColors = GetChildrenLevelColors({
                            sectionColorRGB: HexToRgb(sectionLevelColors[index]), 
                            colorRange: 70, 
                            levelsLength: section.books.length
                        })
                        
                        section.books.forEach((book, index) => {
                            book.color = bookLevelColors[index]
                        })
                    }
                })
            }
        }
        else
        {
            if(!selectedSection)
            {
                const section = copy.testaments.find((testament) => {return testament.id === selectedTestament.id})
                .sections
                .find((section) => {return section.id === id})
                section.color = e.target.value;

                if(propagateColor && section.books?.length > 0)
                {
                    const bookLevelColors = GetChildrenLevelColors({
                        sectionColorRGB: HexToRgb(e.target.value), 
                        colorRange: 70, 
                        levelsLength: section.books.length
                    })
                    section.books.forEach((book, index) => {
                        book.color = bookLevelColors[index]
                    })
                }
            }
            else
            {
                copy.testaments.find((testament) => {return testament.id === selectedTestament.id})
                .sections
                .find((section) => {return section.id === selectedSection.id})
                .books
                .find((book) => {return book.id === id})
                .color = e.target.value
            }
        }
        setTemplate(copy)
    }, [selectedTestament, selectedSection, template, propagateColor])

    const handleBookSelectorDoneClick = useCallback(() => {
        setShowBookSelector(false)
    }, []);

    const handleInspect = useCallback((item) => {
        if(!selectedSection)
        {
            if(selectedTestament)
            {
                handleSectionClick(item)
            }
            else
            {
                handleTestamentClick(item);
            }
        }
    }, [selectedSection, selectedTestament])
    
    useEffect(() => {
        preventNameChangeRef.current = preventNameChange
    }, [preventNameChange])

    return (
        <div className="templateWrapper">
            {selectedTestament ? <div className="pathContainer">
                <span className={`text selectable`} onClick={handlePathTemplateClick}>{template.name}</span>
                <span className="material-symbols-outlined arrow">chevron_right</span>
                <span className={`text ${selectedSection ? "selectable" : "selected"}`} onClick={handlePathTestamentClick}>{selectedTestament.name}</span>
                {selectedSection ? <>
                    <span className="material-symbols-outlined arrow">chevron_right</span>
                    <span className={`text selected`} >{selectedSection.name}</span>
                </> : null}
            </div> : <input
                type="text"
                value={template.name}
                onChange={handleTemplateNameChange}
                onBlur={handleBlur}
            />}

            {!selectedSection && <div className="propagateColorContainer" onClick={handlePropagateColorToggleClick}>
                <div>
                    <span>Propagate color?</span>
                    <span className="material-symbols-outlined arrow">
                        info
                        <Tooltip content="Childrens will take a color palette based on the color you pick"/>
                    </span>

                </div>
                <div className={`${propagateColor ? "checked" : ""}`}>
                    <div></div>
                </div>

            </div>}
            
            <div className="itemsList">
                <ul>
                    {(selectedSection ? selectedSection.books : (selectedTestament ? selectedTestament.sections : template.testaments)).map((item, index) => {
                        return <TemplateItem 
                            item={item} 
                            handleDragStart={handleDragStart}
                            handleDragEnter={handleDragEnter}
                            handleDragEnd={handleDragEnd}
                            handleItemDelete={handleItemDelete}
                            handleItemColorChange={handleItemColorChange}
                            dragOverInfo={dragOverInfo}
                            index={index}
                            draggingId={draggingId}

                            showArrowRight={!selectedSection}
                            handleInspect={handleInspect}
                            handleNameChange={selectedSection ? null : (selectedTestament ? handleSectionNameChange : handleTestamentNameChange)}
                        />
                    })}
                </ul>

                {showBookSelector ? <div className="bookSelector">
                    <div>
                        {allBooks.filter((book) => {
                            return !selectedSection.books.some((currBook) => {return currBook.name === book})
                        }).map((book) => {
                            return <button onClick={() => {handleNewBookClick(book)}}>{book}</button>
                        })}
                    </div>
                    <button className="navigationButton forwardButton" onClick={handleBookSelectorDoneClick}>
                        <span className="material-symbols-outlined arrow">check</span>
                        Done
                    </button>
                </div> : <button className="newItem" onClick={handleNewItemButtonClick}>
                    <span className="material-symbols-outlined arrow">add</span>
                    <span>{selectedSection ? "Add new book" : (selectedTestament ? "Add new sub-section" : "Add new section")}</span>
                </button>}
            </div>

            {errors?.length > 0 && errors.map((errorMessage) => {
                return <p className="errorMessage">{errorMessage}</p>
            })}
        </div>
    )
}

return TemplateEditor;