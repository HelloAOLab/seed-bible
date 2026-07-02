import { getStorageBot } from "ext_discover.storage.getStorageBot";

export function registerVisitedExperiences() {
  const G = globalThis as Record<string, any>;
  const storageBot = getStorageBot();

  const addExp = (exp_id: string | null = null) => {
    if (!exp_id) return;
    const oldExp = storageBot.tags.experincesArray || [];
    const index = oldExp.findIndex((ele: any) => ele === exp_id);
    if (index < 0) {
      oldExp.push(exp_id);
      setTag(storageBot, "experincesArray", oldExp);
    }
  };

  G.addExperienceVisited = addExp;
  G.getVisitedExperince = () => storageBot.tags.experincesArray;
}
