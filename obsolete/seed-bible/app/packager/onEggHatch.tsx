await thisBot.getPackages();
for (const e of tags.mainPackages) {
  os.log("installing main package", e);
  await thisBot.installPackage({ name: e });
}

thisBot.detectPackagesFromLink();
