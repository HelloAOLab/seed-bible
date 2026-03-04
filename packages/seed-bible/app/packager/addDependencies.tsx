console.log(that);
const { bots, createdAt, description, id, name, status } = that;
os.log(that);
const realbots = bots.map((bot: any) => getBot("system", bot.botTag));
const uploadedBots = await os.recordFile(tags.recordName, [...realbots]);
let url: string;
if (!uploadedBots.success) {
  if (uploadedBots.errorCode !== "file_already_exists") {
    return;
  }
  if (uploadedBots.errorCode === "file_already_exists") {
    url = (uploadedBots as any).existingFileUrl;
  }
} else if (uploadedBots.success) {
  url = uploadedBots.url;
}
const data = {
  ...that,
  recordFile: uploadedBots,
  type: "dependency",
  userAuth: authBot.id,
  source: url,
};
const result = await os.recordData(tags.recordName, name, data, {
  marker: "publicRead",
});
console.log(result, "dependency uploaded");
