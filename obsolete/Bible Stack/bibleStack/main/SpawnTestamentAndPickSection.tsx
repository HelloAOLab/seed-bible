const {testamentName, sectionName} = that;
const {testamentData} = await thisBot.SpawnTestament({name: testamentName});
await thisBot.SelectTestament({testament: testamentData.piece});
await thisBot.PickSection({testamentData, sectionName});