const G = globalThis as any;
const addExp = (exp_id = null) => {
  if (!exp_id) return;
  const oldExp = thisBot.tags.experincesArray;
  const index = oldExp.findIndex((ele: any) => ele === exp_id);
  if (index < 0) {
    oldExp.push(exp_id);
    setTag(thisBot, "experincesArray", oldExp);
  }
};

G.addExperienceVisited = addExp;
G.getVisitedExperince = () => thisBot.tags.experincesArray;
