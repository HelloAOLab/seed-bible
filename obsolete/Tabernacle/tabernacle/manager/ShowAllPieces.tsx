const keysFirstAppearance = [
  "ark-of-covenant",
  "incense-altar",
  "menorah",
  "table-of-showbread",
  "inner-curtain",
  "front-curtain",
  "front-pillars",
  "inner-pillars",
  "walls",
  "bars",
  "rings",
  "altar-of-sacrifice",
  "bronze-laver",
  "purple-curtain",
  "brown-curtain",
  "red-curtain",
  "grey-curtain",
  "ground",
  "fence",
];

return thisBot.SetBotsVisibility({
  data: keysFirstAppearance.map((key, index) => {
    return {
      key,
      value: MeshState.Shown,
      index,
    };
  }),
});
