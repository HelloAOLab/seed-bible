const exportTargets = [
    {
        abName: "ext_calendar",
        targets: [
            "ext_calendar.calendar",
            "ext_manager.calendar"
        ]
    }
]

for (const exportTarget of exportTargets) {
    const exportTargetBots = exportTarget.targets.map(item => {
        return getBot("system", item)
    })

    const myAB = await shout("aoPublishAB", {
        ab: exportTarget.abName,
        target: exportTargetBots
    });

    console.log(exportTarget.abName, " exported")
}