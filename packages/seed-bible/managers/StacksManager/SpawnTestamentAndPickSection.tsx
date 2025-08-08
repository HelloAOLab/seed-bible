const {testamentName, sectionName} = that;
const {testamentData} = await StacksManager.SpawnTestament({name: testamentName});
await thisBot.SelectTestament({testament: testamentData.element});
await thisBot.PickSection({testamentData, sectionName});