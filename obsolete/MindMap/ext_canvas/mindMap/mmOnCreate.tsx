if(tags.originalId && tags.originalId !== tags.id){
    // let newChildList = [];
    // let originalIndexBot = getBot(byTag("textBot", tags.originalId));
    // originalIndexBot.tags.textBot = tags.id;
    // tags.indexBot = originalIndexBot.tags.id;
    // for(let i = 0; i < tags.childIds.length; i++){
    //     let subBot = getBot(byTag("originalId", tags.childIds[i]));
    //     newChildList.push(subBot.tags.id);
    // }
    // tags.childIds = [...newChildList];
    // tags.lineTo = [...newChildList];
    // tags.originalId = tags.id;
    // let newLinkList = [];
    // for(let i = 0; i < tags.linkList.length; i++){
    //     let subBot = getBot(byTag("originalId", tags.childIds[i]));
    //     newLinkList.push(subBot.tags.id);
    // }
    // tags.linkList = [...newLinkList];
    // let newParentBotId = getBot(byTag('originalId', originalIndexBot.tags.parentBotId)).tags.id;
    // originalIndexBot.tags.parentBotId = newParentBotId;
    // setTimeout(() => {
    //     originalIndexBot.tags.originalId = originalIndexBot.tags.id;
    // }, 300)
    // let newChildList = [];
    // let newLinkList = [];
    // for(let childId of tags.childIds){
    //     let newChildBot = getBot(byTag('originalId', childId));
    //     newChildList = [...newChildList, newChildBot.tags.id];
    //     newChildBot.tags.parentBotId = tags.id;
    // }
    // for(let linkId of tags.linkList){
    //     let newLinkBot = getBot(byTag('originalId', linkId));
    //     newLinkList = [...newLinkList, newLinkBot.tags.id];
    // }
    // setTagMask(thisBot, "lineTo", [...newChildList], "shared");
    // setTagMask(thisBot, "childIds", [...newChildList], "shared");
    // tags.linkList = [...newLinkList];
    // let newIndexBot = getBot(byTag('originalId', tags.indexBot));
    // newIndexBot.tags.textBot = tags.id;
    // tags.indexBot = newIndexBot.tags.id;
    // setTimeout(() => {
    //     tags.originalId = tags.id;
    // }, 1000);
}