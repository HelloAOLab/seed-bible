let exportTargets = [
    {
        abName: "ext_calendar",
        targets: [
            "ext_calendar.calendar",
            "ext_manager.calendar"
        ]
    }
]

for (let exportTarget of exportTargets) {
    let exportTargetBots = exportTarget.targets.map(item => {
        return getBot("system", item)
    })

    let myAB = await shout("aoPublishAB", {
        ab: exportTarget.abName,
        target: exportTargetBots
    });

    console.log(exportTarget.abName, " exported")
}