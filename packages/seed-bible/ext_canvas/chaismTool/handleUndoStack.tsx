const {action} = that;

switch (action) {
    case "add": {
        const {id, tags, prevValues} = that;
        if(masks.undoStack){
            let undoStack = [...masks.undoStack];
            if(undoStack.length > 20){
                undoStack = undoStack.slice(undoStack.length - 20, undoStack.length);
            }
            setTagMask(thisBot, "undoStack", [
                ...undoStack,
                {
                    id: id,
                    tags: [...tags],
                    prevValues: [...prevValues]
                }
            ], "tempLocal")
        }else{
            setTagMask(thisBot, "undoStack", [
                {
                    id: id,
                    tags: [...tags],
                    prevValues: [...prevValues]
                }
            ], "tempLocal")
        }
        break
    }
    case "undo": {
        if(masks.undoStack === null || masks.undoStack.length === 0){
            os.toast("nothing to redo");
            return
        }
        const lastValue = masks.undoStack[masks.undoStack.length - 1];
        const prevBot = getBot(byID(lastValue.id));
        const prevBotValue = {id: lastValue.id, tags: [], prevValues: []};
        for(let i = 0; i < lastValue.tags.length; i++){
            prevBotValue.tags.push(lastValue.tags[i]);
            prevBotValue.prevValues.push(prevBot.masks[lastValue.tags[i]])
            setTagMask(prevBot, lastValue.tags[i], lastValue.prevValues[i], "tempLocal");
        }
        shout("handleRedoStack", {action: "add", ...prevBotValue});
        setTagMask(thisBot, "undoStack", [...masks.undoStack.slice(0, masks.undoStack.length - 1)], "tempLocal")
        break
    }
    case "clear": {
        masks.undoStack = null;
        break
    }
}