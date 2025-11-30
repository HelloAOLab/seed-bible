// tags.mainPackages.forEach(async e => {
//     os.log('installing main package', e)
//     await thisBot.installPackage({ name: e })
// })
// thisBot.detectPackagesFromLink()

// await os.sleep(1000)
// os.log(masks.installedPackages)
// if (!masks.installedPackages)
//     setTagMask(thisBot, 'installedPackages', [], 'local')

// We have to check the tags instead of the masks
// because injected packages can only be injected via regular tags
if (!masks?.installedPackages) {
  whisper(thisBot, "onEggHatch");
} else {
  masks.installedPackages.forEach((pkg) => {
    console.log("reinstalling ", pkg);
    //  thisBot.uninstallinstallPackage({ name: pkg })
    thisBot.reInitPackage({ name: pkg });
  });
}
