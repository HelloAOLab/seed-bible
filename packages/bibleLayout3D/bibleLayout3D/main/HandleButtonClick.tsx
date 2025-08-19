if(thisBot.masks.isAnimatingMap) return;

const {button} = that;
const layoutData = thisBot.GetLayoutDataById({layoutId: button.tags.layoutId})

switch(button.tags.buttonType)
{
    case BibleVizUtils.Data.LayoutButtonType.ColorPickerButton: 
        thisBot.TrySetChapterSelectColor({layoutData})
    break;
        
    case BibleVizUtils.Data.LayoutButtonType.OpenAllBooksButton: {
        if(layoutData.hasSelectAllBooksBeenCalled)
        {
            thisBot.RespawnAllBooks({layoutData});
        }
        else
        {
            thisBot.SelectAllBooks({layoutData});
        }
    }
    break;

    case BibleVizUtils.Data.LayoutButtonType.BibleVizUtils.Data.tags.DateFormatselectorButton: {
        
        const currentDateFormatIndex = Object.keys(BibleVizUtils.Data.tags.DateFormats).findIndex((key) => {return BibleVizUtils.Data.tags.DateFormats[key] === layoutData.currentDateFormat})
        
        const selectedDateformat = await os.showInput(currentDateFormatIndex, {
            title: 'Select a new Date format',
            type: 'list',
            items: Object.keys(BibleVizUtils.Data.tags.DateFormats).map((dateFormatKey) => {
                return {
                    label: BibleVizUtils.Data.tags.DateFormats[dateFormatKey],
                    value: dateFormatKey
                }
            })
        });
        
        if(selectedDateformat && selectedDateformat.label !== layoutData.currentDateFormat)
        {
            thisBot.SetDateFormat({ layoutData, newDateFormat: selectedDateformat.label })
        }
    }
    break;

    // case BibleVizUtils.Data.LayoutButtonType.PlaylistSelectorButton: {
        
    //     const selectedPlaylist = await os.showInput(0, {
    //         title: 'Select a playlist to show',
    //         type: 'list',
    //         items: [
    //             {
    //                 label: "None",
    //                 value: "None"
    //             },
    //             {
    //                 label: InstanceManager.tags.playlistTest.name,
    //                 value: InstanceManager.tags.playlistTest
    //             }
    //         ]
    //     });
        
    //     if(selectedPlaylist)
    //     {
    //         if(selectedPlaylist.value === "None")
    //         {
    //             if(layoutData.currentPlaylistShownId) thisBot.HidePlaylist({layoutData})
    //         }
    //         else if(selectedPlaylist.value.id !== layoutData.currentPlaylistShownId)
    //         {
    //             thisBot.ShowPlaylist({layoutData, playlistInfo: selectedPlaylist.value})
    //         }
    //     }
    // }
    // break;

    case BibleVizUtils.Data.LayoutButtonType.CameraAnimationToggle: {
        layoutData.isCameraAnimationEnabled = !layoutData.isCameraAnimationEnabled;
        HandleToggle(layoutData.isCameraAnimationEnabled);
    }
    break;

    case BibleVizUtils.Data.LayoutButtonType.ShowDatesToggle: {
        layoutData.areDatesEnabled = !layoutData.areDatesEnabled
        HandleToggle(
            layoutData.areDatesEnabled,
            () => {thisBot.ShowDates({layoutData})},
            () => {thisBot.HideDates({layoutData})}
        );
    }
    break;

    case BibleVizUtils.Data.LayoutButtonType.ShowLabelsToggle: {
        layoutData.areLabelsEnabled = !layoutData.areLabelsEnabled;
        HandleToggle(
            layoutData.areLabelsEnabled,
            () => thisBot.ShowLabels({ layoutData }),
            () => thisBot.HideLabels({ layoutData })
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
            () => thisBot.TryShowPlaylistPath({ layoutData }),
            () => thisBot.TryHidePlaylistPath({ layoutData })
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