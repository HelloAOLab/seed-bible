// Development purposes
thisBot.SetBotsVisibility({
  data: thisBot.tags.piecesKeys.map((key) => {
    return { key, value: MeshState.Hidden };
  }),
}); // TODO: Properly defined and import a MeshState enum
