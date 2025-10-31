const { useState, useRef, useCallback, useEffect } = os.appHooks;

const TemplateSelectorOption = await thisBot.TemplateSelectorOption();

const TemplateSelector = ({initialList, setReorderedList, setHasListBeenModified, isEditor, singleOptions, groupOptions, key, handleOptionClick, checkedOption}) => {
    const [draggingIndex, setDraggingIndex] = useState(null);
    const [draggingId, setDraggingId] = useState(null);
    const [dragOverInfo, setDragOverInfo] = useState(null);
    const tempReorderedList = useRef(null);

    const handleDragStart = useCallback((id) => {
        if(isEditor)
        {
            const draggedIndex = singleOptions.findIndex((item) => {return item.id === id});
            tempReorderedList.current = [...singleOptions]
            setDraggingIndex(draggedIndex);
            setDraggingId(id);
        }
    }, [singleOptions]);

    const handleDragEnter = useCallback((id) => {
        if(draggingId)
        {
            if (draggingId === id) 
            {
                setDragOverInfo({
                    id: null,
                    position: null,
                });
                tempReorderedList.current = [...singleOptions]
            }
            else
            {
                const dragOverIndex = singleOptions.findIndex((item) => {return item.id === id});

                const newList = singleOptions.filter(item => item.id !== draggingId);

                newList.splice(dragOverIndex, 0, singleOptions[draggingIndex]);

                tempReorderedList.current = newList;

                setDragOverInfo({
                    id: id,
                    position: draggingIndex > dragOverIndex ? "top" : "bottom",
                });
            }

        }
    }, [singleOptions, draggingIndex, draggingId]);
    
    const handleDragEnd = useCallback(() => {
        setDragOverInfo({
            id: null,
            position: null,
        });
        setDraggingIndex(null);
        setDraggingId(null);

        const isListEqual = tempReorderedList.current.every((option, index) => {
            return option.id === initialList.current[index].id
        })

        if(isListEqual)
        {
            setReorderedList(null);
            setHasListBeenModified(false);
        }
        else
        {
            setReorderedList(tempReorderedList.current);
            setHasListBeenModified(true);
        }
        
    }, [dragOverInfo]);
    
    return (
        <div key={key} className="templateSelector">

            {singleOptions?.map((option) => {
                return <TemplateSelectorOption 
                    draggingId={draggingId}
                    dragOverInfo={dragOverInfo}
                    isEditor={isEditor} 
                    title={option.optionTitle ?? option.name} 
                    option={option} 
                    handleOptionClick={handleOptionClick} 
                    checkedOption={checkedOption} 
                    handleDragStart={handleDragStart}
                    handleDragEnter={handleDragEnter}
                    handleDragEnd={handleDragEnd}
                />
            })}
            {groupOptions?.map((group) => {
                return <TemplateSelectorOption title={group.title} subOptions={group.options}  handleOptionClick={handleOptionClick} checkedOption={checkedOption} />
            })}
        </div>
    )
}

return TemplateSelector