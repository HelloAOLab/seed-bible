if (configBot.tags.systemPortal) return;
os.hideLoadingScreen();
thisBot.canvasController();
thisBot.main();
configBot.tags.gridPortal = null;
configBot.tags.noGridPoral = true;
setTimeout(() => {
  configBot.tags.gridPortal = null;
}, 1000);
// thisBot.global_functions()
//
// destroy()
const localStorage = getBot("system", "app.localStorage");
if (!localStorage)
  create({
    system: "app.localStorage",
    space: "local",
  });

await os.sleep(500);
shout("runAutoPackages");
