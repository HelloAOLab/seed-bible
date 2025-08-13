const { useState, useEffect } = os.appHooks;

setTagMask(thisBot, "isShowingCustomArrangementTool", true);
const appName = "customArrangementTool"
await os.unregisterApp(appName);
await os.registerApp(appName, thisBot);

const CustomArrangementTool = await thisBot.GetCustomArrangementTool();

os.compileApp(appName,<CustomArrangementTool />);