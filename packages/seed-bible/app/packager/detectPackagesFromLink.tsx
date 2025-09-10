
masks?.availablePackages?.map(async pkg => {

    if (configBot.tags[pkg.address]) {
        await thisBot.installPackage({ name: pkg.address })
    }
})
// if(configBot.tags)