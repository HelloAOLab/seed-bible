const App = thisBot.App();
const appId = globalThis.AddFloatingApp({
    App: <App />,
    title: "Canvas",
    position: {x: 200, y: 150},
    size: {width: 300, height: 150}
})

setTagMask(thisBot, "isBibleAnimating", true);
thisBot.CreateNewBible({position: {x: 0, y: 0}});