console.log("onInstJoined ext_twitchPub");
await os.sleep(1000);

if (configBot.tags.pattern === "SeedBible") {
  const Packager = getBot("system", "app.packager");
  Packager.uninstallPackage({ address: "ext_twitchPub" });
}
