const {useCallback, useState, useRef} = os.appHooks

const useReorderableList = (list, onUpdate) => {
    const [draggingId, setDraggingId] = useState(null);
    const [draggingIndex, setDraggingIndex] = useState(null);
    const [dragOverInfo, setDragOverInfo] = useState(null);
    const tempList = useRef(null);

    const handleDragStart = useCallback((id) => {
        const index = list.findIndex(item => item.id === id);
        tempList.current = [...list];
        setDraggingId(id);
        setDraggingIndex(index);
    }, [list]);

    const handleDragEnter = useCallback((id) => {
        if(draggingId)
        {
            if(draggingId === id)
            {
                setDragOverInfo({
                    id: null,
                    position: null,
                });
            }
            else
            {
                const dragOverIndex = list.findIndex(item => item.id === id);
                const newList = list.filter(item => item.id !== draggingId);
                newList.splice(dragOverIndex, 0, list[draggingIndex]);
                tempList.current = newList;

                setDragOverInfo({
                    id,
                    position: draggingIndex > dragOverIndex ? "top" : "bottom",
                });
            }
        }
        
        // if (draggingId === id) 
        // {
        //     setDragOverInfo({
        //         id: null,
        //         position: null,
        //     });
        // }
        // else
        // {
        //     let currentList;
        //     if(selectedSection) currentList = selectedSection.books;
        //     else if(selectedTestament) currentList = selectedTestament.sections;
        //     else currentList = template.testaments;

        //     let dragOverIndex = currentList.findIndex((item) => {return item.id === id});

        //     let newList = currentList.filter(item => item.id !== draggingId);

        //     newList.splice(dragOverIndex, 0, currentList[draggingIndex]);

        //     tempList.current = newList;

        //     setDragOverInfo({
        //         id: id,
        //         position: draggingIndex > dragOverIndex ? "top" : "bottom",
        //     });
        // }

    }, [list, draggingId, draggingIndex]);

    const handleDragEnd = useCallback(() => {
        if (dragOverInfo?.id && tempList.current) {
            onUpdate(tempList.current);
        }

        setDraggingId(null);
        setDraggingIndex(null);
        setDragOverInfo(null);
        tempList.current = null;
    }, [dragOverInfo, onUpdate]);

    return {
        draggingId,
        dragOverInfo,
        handleDragStart,
        handleDragEnter,
        handleDragEnd,
    };
};
