const unInstallSelf = async ({ pkg = "ext_twitchPub", reRun = 1 }) => {
  await os.sleep(3000);
  if (reRun > 3) {
    return;
  }
  const Packager = getBot("system", "app.packager");
  if (Packager.masks.installedPackages.includes(pkg)) {
    Packager.uninstallPackage({ address: pkg });
    setTimeout(() => {
      const Packager = getBot("system", "app.packager");
      if (Packager.masks.installedPackages.includes(pkg)) {
        unInstallSelf({ pkg, reRun: reRun + 1 });
      }
    }, 3000);
  } else {
    unInstallSelf({ pkg, reRun: reRun + 1 });
  }
};

if (configBot.tags.pattern === "SeedBible") {
  unInstallSelf({ pkg: "ext_twitchPub" });
}
