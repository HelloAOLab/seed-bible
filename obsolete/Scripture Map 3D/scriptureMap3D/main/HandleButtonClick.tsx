import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";
import type { Bot } from "../../../../typings/AuxLibraryDefinitions";
import { DateFormats, type DateFormat } from "bibleVizUtils.models.canvas";

if (thisBot.masks.isAnimatingBible) return;

const {
  button,
}: {
  button: Bot;
} = that;
const layoutData: LayoutBibleData | undefined = thisBot.GetLayoutDataById({
  layoutId: button.tags.layoutId,
});

if (!layoutData) {
  throw new Error("layoutData not found at HandleButtonClick");
}

switch (button.tags.buttonType) {
  case BibleVizUtils.Data.tags.LayoutButtonType.ColorPickerButton:
    thisBot.TrySetChapterSelectColor({ layoutData });
    break;

  case BibleVizUtils.Data.tags.LayoutButtonType.OpenAllBooksButton:
    {
      if (layoutData.hasSelectAllBooksBeenCalled) {
        thisBot.RespawnAllBooks({ layoutData });
      } else {
        thisBot.SelectAllBooks({ layoutData });
      }
    }
    break;

  case BibleVizUtils.Data.tags.LayoutButtonType.DateFormatSelectorButton:
    {
      const currentDateFormatIndex = (
        Object.keys(DateFormats) as DateFormat[]
      ).findIndex((key) => {
        return DateFormats[key] === layoutData.currentDateFormat;
      });

      const selectedDateformat = await os.showInput(currentDateFormatIndex, {
        title: "Select a new Date format",
        type: "list",
        items: (Object.keys(DateFormats) as DateFormat[]).map(
          (dateFormatKey) => {
            return {
              label: DateFormats[dateFormatKey],
              value: dateFormatKey,
            };
          }
        ),
      });

      if (
        selectedDateformat &&
        selectedDateformat.label !== layoutData.currentDateFormat
      ) {
        thisBot.SetDateFormat({
          layoutData,
          newDateFormat: selectedDateformat.label,
        });
      }
    }
    break;

  // case BibleVizUtils.Data.tags.LayoutButtonType.PlaylistSelectorButton: {

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

  case BibleVizUtils.Data.tags.LayoutButtonType.CameraAnimationToggle:
    {
      if (layoutData.isCameraAnimationEnabled)
        layoutData.disableCameraAnimation();
      else layoutData.enableCameraAnimation();
      HandleToggle(layoutData.isCameraAnimationEnabled);
    }
    break;

  case BibleVizUtils.Data.tags.LayoutButtonType.ShowDatesToggle:
    {
      if (layoutData.areDatesEnabled) layoutData.disableDates();
      else layoutData.enableDates();
      HandleToggle(
        !!layoutData.areDatesEnabled,
        () => {
          thisBot.ShowDates({ layoutData });
        },
        () => {
          thisBot.HideDates({ layoutData });
        }
      );
    }
    break;

  case BibleVizUtils.Data.tags.LayoutButtonType.ShowLabelsToggle:
    {
      if (layoutData.areLabelsEnabled) layoutData.disableLabels();
      else layoutData.enableLabels();

      HandleToggle(
        layoutData.areLabelsEnabled,
        () => thisBot.ShowLabels({ layoutData }),
        () => thisBot.HideLabels({ layoutData })
      );
    }
    break;

  case BibleVizUtils.Data.tags.LayoutButtonType.PathToggle:
    {
      if (layoutData.isPathEnabled) layoutData.disablePath();
      else layoutData.enablePath();
      HandleToggle(layoutData.isPathEnabled);
    }
    break;

  case BibleVizUtils.Data.tags.LayoutButtonType.ChapterExpandToggle:
    {
      if (layoutData.isChapterExpandEnabled) layoutData.disableChapterExpand();
      else layoutData.enableChapterExpand();
      HandleToggle(layoutData.isChapterExpandEnabled);
    }
    break;

  case BibleVizUtils.Data.tags.LayoutButtonType.PlaylistPathToggle:
    {
      if (layoutData.isPlaylistPathEnabled) layoutData.disablePlaylistPath();
      else layoutData.enablePlaylistPath();
      HandleToggle(
        layoutData.isPlaylistPathEnabled,
        () => thisBot.TryShowPlaylistPath({ layoutData }),
        () => thisBot.TryHidePlaylistPath({ layoutData })
      );
    }
    break;

  default:
    break;
}

function HandleToggle(
  isEnabled: boolean,
  enableCallback: () => void = () => {},
  disableCallback: () => void = () => {}
) {
  if (isEnabled) {
    enableCallback();
    button.Activate();
  } else {
    disableCallback();
    button.Deactivate();
  }
}
