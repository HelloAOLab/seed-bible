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
    thisBot.reInitPackage({ name: pkg });
  });

  // Install any new packages from mainPackages that aren't already installed
  const mainPkgs = tags.mainPackages || [];
  const newPkgs = mainPkgs.filter(
    (pkg) => !masks.installedPackages.includes(pkg)
  );
  if (newPkgs.length > 0) {
    await thisBot.getPackages();
    for (const pkg of newPkgs) {
      console.log("installing new main package ", pkg);
      await thisBot.installPackage({ name: pkg });
    }
  }

  // Uninstall packages that were removed from mainPackages
  const removedPkgs = masks.installedPackages.filter(
    (pkg) => !mainPkgs.includes(pkg)
  );
  for (const pkg of removedPkgs) {
    console.log("uninstalling removed package ", pkg);
    thisBot.uninstallPackage({ name: pkg });
  }
}
