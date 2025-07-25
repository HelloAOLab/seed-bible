const addExp = (exp_id = null) => {
    if(!exp_id) return;
    const oldExp = thisBot.tags.experincesArray;
    const index = oldExp.findIndex(ele=>ele===exp_id);
    if(index < 0) {
        oldExp.push(exp_id);
        setTag(thisBot,"experincesArray",oldExp)
    }
}

globalThis.addExperienceVisited = addExp;
globalThis.getVisitedExperince = () => thisBot.tags.experincesArray;