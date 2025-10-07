await thisBot.getPackages();
tags.mainPackages.forEach(async (e) => {
  os.log("installing main package", e);
  await thisBot.installPackage({ name: e });
});
thisBot.detectPackagesFromLink();
