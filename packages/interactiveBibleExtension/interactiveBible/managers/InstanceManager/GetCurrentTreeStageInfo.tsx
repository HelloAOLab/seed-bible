return thisBot.tags.treeStagesInfo.find((stageInfo) => {
    return stageInfo.stage == thisBot.masks.currentTreeStage;
})