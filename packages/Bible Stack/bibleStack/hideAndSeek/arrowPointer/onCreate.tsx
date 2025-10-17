while(true){

    const directions = thisBot.tags.isHotter ? 1: -1;

    await animateTag(thisBot,"homeZ",{
        toValue: thisBot.tags.homeZ - (1 * directions),
        duration: 0.6
    });

    await animateTag(thisBot,"homeZ",{
        toValue: thisBot.tags.homeZ + (1 * directions),
        duration: 0.6
    })
}