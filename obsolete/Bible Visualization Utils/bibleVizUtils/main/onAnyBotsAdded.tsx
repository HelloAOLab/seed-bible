import { sessionService } from "bibleVizUtils.services.index";

const { bots } = that;

if (
  authBot &&
  bots.some((bot: any) => {
    return bot.id === authBot.id;
  })
) {
  try {
    sessionService.tryEmitUserLoggedInEvent(authBot);
  } catch (error) {
    console.error(error);
  }
}
