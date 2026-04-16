const { infoLabel, infoLabelTail, infoLabelDate, infoLabelUsersColor } =
  thisBot.GetLabelElements();
animateTag(
  [infoLabel, infoLabelTail, infoLabelDate, ...infoLabelUsersColor],
  "formOpacity",
  null
);
animateTag(
  [infoLabel, infoLabelTail, infoLabelDate, ...infoLabelUsersColor],
  "labelOpacity",
  null
);
