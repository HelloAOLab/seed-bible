masks?.availablePackages?.map(async (pkg: any) => {
  if (configBot.tags[pkg.address]) {
    if (!masks[`${pkg - address}-data`])
      await thisBot.installPackage({ name: pkg.address });
  }
});
// if(configBot.tags)
