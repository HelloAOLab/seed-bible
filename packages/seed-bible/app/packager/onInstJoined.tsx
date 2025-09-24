tags.mainPackages.forEach(async e => {
    os.log('installing main package', e)
    await thisBot.installPackage({ name: e })
})
thisBot.detectPackagesFromLink()

// await os.sleep(1000)
// os.log(masks.installedPackages)
// if (!masks.installedPackages)
//     setTagMask(thisBot, 'installedPackages', [], 'local')

// masks.installedPackages.forEach(pkg => {
//     console.log('reinstalling ', pkg)
//     //  thisBot.uninstallinstallPackage({ name: pkg })
//     thisBot.installPackage({ name: pkg })
// })