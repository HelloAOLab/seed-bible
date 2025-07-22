


const alreadyUsed = thisBot.tags.used
if (alreadyUsed) {
    thisBot.tags.onEggHatch = null
    await os.sleep(1000)
    console.log('deleted')
    return
}
const input = await os.showInput('', {
    title: 'Publish',
    confirmText: 'Yes',
});
// os.toast(name);
thisBot.tags.used = true
if (!input)
    return
configBot.tags.manualPublish = true;
const link = await shout("aoPublishAB", { ab: input, manualPublish: true })[0]

