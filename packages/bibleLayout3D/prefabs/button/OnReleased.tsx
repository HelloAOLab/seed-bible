switch(thisBot.tags.buttonType)
{
    case MapButtonType.ColorPickerButton: 
    {
        ObjectPooler.ReleaseObject({obj: thisBot.links.colorContent, tag: ObjectPoolTags.MapColorPickerContent});
        ObjectPooler.ReleaseObject({obj: thisBot.links.colorBackground, tag: ObjectPoolTags.MapColorPickerBackground});
        thisBot.tags.colorContent = null;
        thisBot.tags.colorBackground = null;
    }
    break;
    case MapButtonType.DateFormatSelectorButton:
    case MapButtonType.OpenAllBooksButton:
    case MapButtonType.PlaylistSelectorButton: 
    {
        ObjectPooler.ReleaseObject({obj: thisBot.links.buttonLabel, tag: ObjectPoolTags.MapButtonLabel});
        ObjectPooler.ReleaseObject({obj: thisBot.links.buttonIcon, tag: ObjectPoolTags.MapButtonIcon});
        thisBot.tags.buttonLabel = null;
        thisBot.tags.buttonIcon = null;
    }
    break;
}

thisBot.tags.mapId = null;
thisBot.tags.buttonType = null;
thisBot.tags.isSettingsElement = null;
thisBot.tags.closeIcon = null;
thisBot.tags.openIcon = null;