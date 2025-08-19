if(thisBot.masks.isAnimatingMap) return;

const {button} = that;
const layoutData = thisBot.GetLayoutDataById({layoutId: button.tags.layoutId})

switch(button.tags.buttonType)
{
    case BibleVizUtils.Data.LayoutButtonType.ColorPickerButton: 
        thisBot.TrySetChapterSelectColorOnMap({layoutData})
    break;
        
    case BibleVizUtils.Data.LayoutButtonType.OpenAllBooksButton: {
        if(layoutData.hasSelectAllBooksBeenCalled)
        {
            thisBot.RespawnAllBooksOnMap({layoutData});
        }
        else
        {
            thisBot.SelectAllBooksOnMap({layoutData});
        }
    }
    break;

    case BibleVizUtils.Data.LayoutButtonType.DateFormatSelectorButton: {
        
        const currentDateFormatIndex = Object.keys(DateFormats).findIndex((key) => {return DateFormats[key] === layoutData.currentDateFormat})
        
        const selectedDateformat = await os.showInput(currentDateFormatIndex, {
            title: 'Select a new Date format',
            type: 'list',
            items: Object.keys(DateFormats).map((dateFormatKey) => {
                return {
                    label: DateFormats[dateFormatKey],
                    value: dateFormatKey
                }
            })
        });
        
        if(selectedDateformat && selectedDateformat.label !== layoutData.currentDateFormat)
        {
            thisBot.SetMapDateFormat({ layoutData, newDateFormat: selectedDateformat.label })
        }
    }
    break;

    case BibleVizUtils.Data.LayoutButtonType.PlaylistSelectorButton: {
        
        const selectedPlaylist = await os.showInput(0, {
            title: 'Select a playlist to show',
            type: 'list',
            items: [
                {
                    label: "None",
                    value: "None"
                },
                {
                    label: InstanceManager.tags.playlistTest.name,
                    value: InstanceManager.tags.playlistTest
                }
            ]
        });
        
        if(selectedPlaylist)
        {
            if(selectedPlaylist.value === "None")
            {
                if(layoutData.currentPlaylistShownId) thisBot.HidePlaylistOnMap({layoutData})
            }
            else if(selectedPlaylist.value.id !== layoutData.currentPlaylistShownId)
            {
                thisBot.ShowPlaylistOnMap({layoutData, playlistInfo: selectedPlaylist.value})
            }
        }
    }
    break;

    case BibleVizUtils.Data.LayoutButtonType.CameraAnimationToggle: {
        layoutData.isCameraAnimationEnabled = !layoutData.isCameraAnimationEnabled;
        HandleToggle(layoutData.isCameraAnimationEnabled);
    }
    break;

    case BibleVizUtils.Data.LayoutButtonType.ShowDatesToggle: {
        layoutData.areDatesEnabled = !layoutData.areDatesEnabled
        HandleToggle(
            layoutData.areDatesEnabled,
            () => {thisBot.ShowDatesOnMap({layoutData})},
            () => {thisBot.HideDatesOnMap({layoutData})}
        );
    }
    break;

    case BibleVizUtils.Data.LayoutButtonType.ShowLabelsToggle: {
        layoutData.isLabelsEnabled = !layoutData.isLabelsEnabled;
        HandleToggle(
            layoutData.isLabelsEnabled,
            () => thisBot.ShowLabelsOnMap({ layoutData }),
            () => thisBot.HideLabelsOnMap({ layoutData })
        );
    }
    break;

    case BibleVizUtils.Data.LayoutButtonType.PathToggle: {
        layoutData.isPathEnabled = !layoutData.isPathEnabled;
        HandleToggle(layoutData.isPathEnabled);
    }
    break;

    case BibleVizUtils.Data.LayoutButtonType.ChapterExpandToggle: {
        layoutData.isChapterExpandEnabled = !layoutData.isChapterExpandEnabled;
        HandleToggle(layoutData.isChapterExpandEnabled);
    }
    break;

    case BibleVizUtils.Data.LayoutButtonType.PlaylistPathToggle: {
        layoutData.isPlaylistPathEnabled = !layoutData.isPlaylistPathEnabled;
        HandleToggle(
            layoutData.isPlaylistPathEnabled,
            () => thisBot.TryShowPlaylistPathOnMap({ layoutData }),
            () => thisBot.TryHidePlaylistPathOnMap({ layoutData })
        );
    }
    break;
    
    default: break;
}


function HandleToggle(isEnabled, enableCallback = () => { }, disableCallback = () => { }) {
    if (isEnabled) {
        enableCallback();
        button.Activate();
    }
    else {
        disableCallback();
        button.Deactivate();
    }
};