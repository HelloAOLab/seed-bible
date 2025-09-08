masks['run'] = true
let dim = os.getCurrentDimension()
shout('pauseTrays')
let distance
if(masks?.tm){
    clearTimeout(masks.tm);
    masks.tm = null;
}
while(masks['run']){
    await os.sleep(50)
    let toEraseBots = getBots(byMod({toErase:true,[dim]:true}))
    for(let key in toEraseBots){
        distance = Vector3.distanceBetween(
            new Vector3( toEraseBots[key].tags[dim+"X"], toEraseBots[key].tags[dim+"Y"], toEraseBots[key].tags[dim+"Z"]),
            new Vector3(thisBot.tags[dim+"X"],thisBot.tags[dim+"Y"],thisBot.tags[dim+"Z"])
        )
        
        if(distance <= thisBot.tags.scaleX){
            if(toEraseBots[key].tags.isBibleElement || toEraseBots[key].tags.isBibleTransformer || toEraseBots[key].tags.isSectionShadow)
            {
                StacksManager.DeleteElement({element: toEraseBots[key]});
            }
            else
            {
                destroy(toEraseBots[key])
            }
        }
    }

}
