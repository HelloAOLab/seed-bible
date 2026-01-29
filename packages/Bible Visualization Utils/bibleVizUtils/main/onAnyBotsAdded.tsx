const { bots } = that;

if (
  authBot &&
  bots.some((bot) => {
    return bot.id === authBot.id;
  })
) {
  try {
    const { handleUserLoggedInDebouncer } =
      await import("bibleVizUtils.services.HandleUserLoggedInDebouncer");
    handleUserLoggedInDebouncer.execute({ authBot });
  } catch (error) {
    console.error(error);
  }
}
