if (configBot.tags.join) {
  if (!masks["remotes"]) masks["remotes"] = [];

  masks["remotes"].push(configBot.tags.join);
  os.log(masks["remotes"]);
}
