const { floatingApps } = that;

if(thisBot.vars.appId)
{
    const tabernacleApp = floatingApps.find((app) => {
        return app.id == thisBot.vars.appId;
    })
    if(!tabernacleApp)
    {
        thisBot.vars.appId = null;
        thisBot.ClearExperience();
    }
}