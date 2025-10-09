switch(thisBot.tags.buttonType)
{
    case BibleVizUtils.Data.tags.LayoutButtonType.ColorPickerButton: 
    {
        ObjectPooler.ReleaseObject({obj: thisBot.links.colorContent, tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutColorPickerContent});
        ObjectPooler.ReleaseObject({obj: thisBot.links.colorBackground, tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutColorPickerBackground});
        thisBot.tags.colorContent = null;
        thisBot.tags.colorBackground = null;
    }
    break;
    case BibleVizUtils.Data.tags.LayoutButtonType.DateFormatSelectorButton:
    case BibleVizUtils.Data.tags.LayoutButtonType.OpenAllBooksButton:
    case BibleVizUtils.Data.tags.LayoutButtonType.PlaylistSelectorButton: 
    {
        ObjectPooler.ReleaseObject({obj: thisBot.links.buttonLabel, tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButtonLabel});
        ObjectPooler.ReleaseObject({obj: thisBot.links.buttonIcon, tag: BibleVizUtils.Data.tags.ObjectPoolTags.LayoutButtonIcon});
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