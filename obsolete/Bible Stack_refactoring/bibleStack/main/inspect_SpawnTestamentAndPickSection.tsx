const { testamentName, sectionName } = that;
const { testamentData } = await thisBot.SpawnTestament({ name: testamentName });
await thisBot.SelectTestament({
  testament: testamentData.piece,
  source: "SpawnTestamentAndPickSection",
});
await thisBot.PickSection({ testamentData, sectionName });
