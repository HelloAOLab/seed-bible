if (thisBot.vars.authBot) return;

const authBot = await os.requestAuthBotInBackground();

if (authBot) {
  globalThis.ScriptureMapHandleUserLoggedIn?.();
}
