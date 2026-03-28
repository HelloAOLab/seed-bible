tags?.availablePackages?.map(async (pkg) => {
  if (configBot.tags[pkg.name]) {
    if (!masks[`${pkg.name}-data`])
      await thisBot.installPackage({ name: pkg.name });
  }
});
// if(configBot.tags)
