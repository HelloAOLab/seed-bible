

await thisBot.getPackages()
tags.mainPackages.forEach(e => {
    os.log('installing main package', e)
    thisBot.installPackage({ name: e })
})
thisBot.detectPackagesFromLink()