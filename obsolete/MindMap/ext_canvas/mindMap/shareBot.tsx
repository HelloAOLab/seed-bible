if (that.space === "remoteTempShared") {
  create(that.bot, { space: "remoteTempShared" });
} else if (that.space === "tempLocal") {
  create(that.bot, { space: "tempShared" });
}
