const { useState, useRef, useMemo } = os.appHooks;

const DragDrop = ({ list, setList }) => {
    const toBeSetItems = useRef([]);
    const [dragOverSet, setDragoverSetMutate] = useState({
        position: "top",
        itemId: "null",
    });

    const setDragoverSet = newState => {
        if (newState.itemId !== dragOverSet.itemId) {
            setDragoverSetMutate(newState);
        }
    };

    const [draggedItemID, setDraggedItemID] = useState(null);

    const handleDragStart = (index) => {
        toBeSetItems.current = list;
        const id = list[index].id;
        setDraggedItemID(id);
    };

    const handleDragOver = (index) => {
        if (!draggedItemID) return;

        let originalRespectiveIndex = index;

        let draggedItemIndex = list.findIndex(hist => hist.id === draggedItemID);

        let draggedOverItem = list[index];

        let dragItem = [list[draggedItemIndex]];
        let newIndex =
            draggedItemIndex > originalRespectiveIndex
                ? originalRespectiveIndex
                : originalRespectiveIndex - 1;

        let newItems = [];

        let filterAbleItems = {
            [draggedItemID]: true,
        };


        // Ignore if the item is dragged over itself
        if (dragItem.id === draggedOverItem.id) {
            toBeSetItems.current = list;
            setDragoverSet({
                itemId: "null",
                position:
                    originalRespectiveIndex > draggedItemIndex ? "Bottom" : "Top",
            });
            return;
        }

        setDragoverSet({
            itemId: draggedOverItem.id,
            position: originalRespectiveIndex > draggedItemIndex ? "Bottom" : "Top",
        });

        // Filter out the currently dragged item
        newItems = list.filter(hist => !filterAbleItems[hist.id]);
        // Add the dragged item after the dragged over item

        newItems.splice(newIndex, 0, ...dragItem);

        toBeSetItems.current = newItems;
    };

    const handleDragEnd = () => {
        setDragoverSet({
            itemId: "null",
            position: "false",
        });
        toBeSetItems.current && setList(toBeSetItems.current);
        setDraggedItemID(null);
    };

    return (
        <>
            <style>
                {`
                    .dropabble-Top {
                        border-top: 2px solid #007bff;
                    }

                    .dropabble-Bottom {
                        border-bottom: 2px solid #007bff;
                    }
                `}
            </style>
            {list.map(({ id, Element, render }, index) => {
                if(!render){
                    return <></>
                }
                return (
                    <div
                        key={id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={() => handleDragOver(index)}
                        onDragEnd={handleDragEnd}
                        className={`${dragOverSet.itemId === id && `dropabble-${dragOverSet.position}`}`}
                    >
                        {Element}
                    </div>
                )
            })}
        </>
    );
};

return DragDrop;
