if(thisBot.vars.appId)
{
    await thisBot.ClearStacks()
    globalThis.RemoveApplication(thisBot.vars.appId)
    thisBot.vars.appId = null
}
else
{
    gridPortalBot.tags.portalCameraType = "orthographic";
    const App = await thisBot.App();
    const id = globalThis.AddFloatingApp({
        App: <App />,
        title: "Stack",
        position: {x: 200, y: 150},
        size: {width: 300, height: 150}
    })
    thisBot.vars.appId = id;

    await os.sleep(500);

    if(thisBot.vars.appId && thisBot.vars.appId === id)
    {
        setTagMask(thisBot, "isBibleAnimating", true);
        thisBot.CreateNewBible({position: {x: 0, y: 0}}).then(() => {
            thisBot.UpdateStackTabsVisualization({source: "DisplayApp"});
        });
    }
}


