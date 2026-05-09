let textBot = getBot(byTag("id", that.id));

let label = "";

for (let i = 0; i < textBot.tags.label.length; i++) {
  label += "-";
}

if (textBot.masks.currentWriter !== tags.id) {
  setTagMask(textBot, "label", label, "tempLocal");
}
