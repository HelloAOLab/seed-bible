switch (thisBot.tags.buttonType) {
  case BibleVizUtils.Data.tags.LayoutButtonType.ColorPickerButton:
    {
      ObjectPooler.ReleaseObject({
        obj: thisBot.links.colorContent,
        tag: thisBot.links.colorContent.tags.poolTag,
      });
      ObjectPooler.ReleaseObject({
        obj: thisBot.links.colorBackground,
        tag: thisBot.links.colorBackground.tags.poolTag,
      });
      thisBot.tags.colorContent = null;
      thisBot.tags.colorBackground = null;
    }
    break;
  case BibleVizUtils.Data.tags.LayoutButtonType.DateFormatSelectorButton:
  case BibleVizUtils.Data.tags.LayoutButtonType.OpenAllBooksButton:
  case BibleVizUtils.Data.tags.LayoutButtonType.PlaylistSelectorButton:
    {
      ObjectPooler.ReleaseObject({
        obj: thisBot.links.buttonLabel,
        tag: thisBot.links.buttonLabel.tags.poolTag,
      });
      ObjectPooler.ReleaseObject({
        obj: thisBot.links.buttonIcon,
        tag: thisBot.links.buttonIcon.tags.poolTag,
      });

      thisBot.tags.buttonLabel = null;
      thisBot.tags.buttonIcon = null;
    }
    break;
}

thisBot.tags.layoutId = null;
thisBot.tags.buttonType = null;
thisBot.tags.isSettingsPiece = null;
thisBot.tags.closeIcon = null;
thisBot.tags.openIcon = null;
