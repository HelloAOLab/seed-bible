const App = thisBot.App();
globalThis.AddFloatingApp({
    App: <App />,
    title: "Canvas",
    position: {x: 200, y: 150},
    size: {width: 300, height: 150}
})
await os.sleep(500);
setTagMask(thisBot, "isBibleAnimating", true);
thisBot.CreateNewBible({position: {x: 0, y: 0}});