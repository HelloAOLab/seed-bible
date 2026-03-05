// Development purposes
thisBot.SetBotsVisibility({
  data: thisBot.tags.piecesKeys.map((key: any) => {
    return { key, value: MeshState.Hidden };
  }),
});
