if (!that.name) return;

// const data = await thisBot.getPackages();
const packageAddress = that.name;
await thisBot.installPackage({ name: that.name });
