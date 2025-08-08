function generateQuery(params) {
    const queryArray = [];
    for (const key in params) {
        if (params.hasOwnProperty(key)) {
            queryArray.push(encodeURIComponent(key) + '=' + encodeURIComponent(params[key]));
        }
    }
    return queryArray.join('&');
}

// Function to attach query string to URL
function attachQueryToURL(url, params) {
    const queryString = generateQuery(params);
    return url + (url.includes('?') ? '&' : '?') + queryString;
}

const getAllChildIds = (id: string, customMask: string = null) => {
    const botById = getBot(byID(id));
    let childrenIds = [];
    if(customMask){
        if(botById.masks[customMask] && botById.masks[customMask].length > 0){
            for(let i = 0; i < botById.masks[customMask].length; i++){
                childrenIds = [...childrenIds, botById.masks[customMask][i], ...getAllChildIds(botById.masks[customMask][i], customMask)]
            }
        }else{
            return []
        } 
    }else{
       if(botById.tags.lineTo && botById.tags.lineTo.length > 0){
            for(let i = 0; i < botById.tags.lineTo.length; i++){
                childrenIds = [...childrenIds, botById.tags.lineTo[i], ...getAllChildIds(botById.tags.lineTo[i])]
            }
        }else{
            return []
        } 
    }
    return childrenIds;
}

const parentCheck = (childId, parentId) => {
    const childBot = getBot(byTag("id", childId));
    let isParent = false;
    if(!childBot.tags.parentBotId){
        return false;
    }else if(childBot.tags.parentBotId !== parentId){
        isParent = parentCheck(childBot.tags.parentBotId, parentId);
    }else{
        isParent = true;
    }
    return isParent;
}

globalThis.eventUtils = {
    attachQueryToURL,
    getAllChildIds,
    parentCheck
}