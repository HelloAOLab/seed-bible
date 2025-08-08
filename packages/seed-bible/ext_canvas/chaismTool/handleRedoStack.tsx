const {action} = that;

switch (action) {
    case "add": {
        const {id, tags, prevValues} = that;
        if(masks.redoStack){
            let redoStack = [...masks.redoStack];
            if(redoStack.length > 20){
                redoStack = redoStack.slice(redoStack.length - 20, redoStack.length);
            }
            setTagMask(thisBot, "redoStack", [
                ...redoStack,
                {
                    id: id,
                    tags: [...tags],
                    prevValues: [...prevValues]
                }
            ], "tempLocal")
        }else{
            setTagMask(thisBot, "redoStack", [
                {
                    id: id,
                    tags: [...tags],
                    prevValues: [...prevValues]
                }
            ], "tempLocal")
        }
        break
    }
    case "redo": {
        if(masks.redoStack === null || masks.redoStack.length === 0){
            os.toast("nothing to redo");
            return
        }
        const lastValue = masks.redoStack[masks.redoStack.length - 1];
        for(let i = 0; i < lastValue.tags.length; i++){
            setTagMask(getBot(byID(lastValue.id)), lastValue.tags[i], lastValue.prevValues[i], "tempLocal");
        }
        shout("handleUndoStack", {action: "add", ...lastValue});
        setTagMask(thisBot, "redoStack", [...masks.redoStack.slice(0, masks.redoStack.length - 1)], "tempLocal")
        break
    }
    case "clean": {
        masks.redoStack = null;
        break
    }
}