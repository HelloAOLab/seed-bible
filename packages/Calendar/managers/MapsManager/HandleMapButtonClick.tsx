if (thisBot.masks.isAnimatingMap) return;

const { button } = that;
const mapData = thisBot.GetMapDataById({ mapId: button.tags.mapId });

switch (button.tags.buttonType) {
  case MapButtonType.ColorPickerButton:
    thisBot.TrySetChapterSelectColorOnMap({ mapData });
    break;

  case MapButtonType.OpenAllBooksButton:
    {
      if (mapData.hasSelectAllBooksBeenCalled) {
        thisBot.RespawnAllBooksOnMap({ mapData });
      } else {
        thisBot.SelectAllBooksOnMap({ mapData });
      }
    }
    break;

  case MapButtonType.DateFormatSelectorButton:
    {
      const currentDateFormatIndex = Object.keys(DateFormats).findIndex(
        (key) => {
          return DateFormats[key] === mapData.currentDateFormat;
        }
      );

      const selectedDateformat = await os.showInput(currentDateFormatIndex, {
        title: "Select a new Date format",
        type: "list",
        items: Object.keys(DateFormats).map((dateFormatKey) => {
          return {
            label: DateFormats[dateFormatKey],
            value: dateFormatKey,
          };
        }),
      });

      if (
        selectedDateformat &&
        selectedDateformat.label !== mapData.currentDateFormat
      ) {
        thisBot.SetMapDateFormat({
          mapData,
          newDateFormat: selectedDateformat.label,
        });
      }
    }
    break;

  case MapButtonType.PlaylistSelectorButton:
    {
      const selectedPlaylist = await os.showInput(0, {
        title: "Select a playlist to show",
        type: "list",
        items: [
          {
            label: "None",
            value: "None",
          },
          {
            label: InstanceManager.tags.playlistTest.name,
            value: InstanceManager.tags.playlistTest,
          },
        ],
      });

      if (selectedPlaylist) {
        if (selectedPlaylist.value === "None") {
          if (mapData.currentPlaylistShownId)
            thisBot.HidePlaylistOnMap({ mapData });
        } else if (
          selectedPlaylist.value.id !== mapData.currentPlaylistShownId
        ) {
          thisBot.ShowPlaylistOnMap({
            mapData,
            playlistInfo: selectedPlaylist.value,
          });
        }
      }
    }
    break;

  case MapButtonType.CameraAnimationToggle:
    {
      mapData.isCameraAnimationEnabled = !mapData.isCameraAnimationEnabled;
      HandleToggle(mapData.isCameraAnimationEnabled);
    }
    break;

  case MapButtonType.ShowDatesToggle:
    {
      mapData.areDatesEnabled = !mapData.areDatesEnabled;
      HandleToggle(
        mapData.areDatesEnabled,
        () => {
          thisBot.ShowDatesOnMap({ mapData });
        },
        () => {
          thisBot.HideDatesOnMap({ mapData });
        }
      );
    }
    break;

  case MapButtonType.ShowLabelsToggle:
    {
      mapData.isLabelsEnabled = !mapData.isLabelsEnabled;
      HandleToggle(
        mapData.isLabelsEnabled,
        () => thisBot.ShowLabelsOnMap({ mapData }),
        () => thisBot.HideLabelsOnMap({ mapData })
      );
    }
    break;

  case MapButtonType.PathToggle:
    {
      mapData.isPathEnabled = !mapData.isPathEnabled;
      HandleToggle(mapData.isPathEnabled);
    }
    break;

  case MapButtonType.ChapterExpandToggle:
    {
      mapData.isChapterExpandEnabled = !mapData.isChapterExpandEnabled;
      HandleToggle(mapData.isChapterExpandEnabled);
    }
    break;

  case MapButtonType.PlaylistPathToggle:
    {
      mapData.isPlaylistPathEnabled = !mapData.isPlaylistPathEnabled;
      HandleToggle(
        mapData.isPlaylistPathEnabled,
        () => thisBot.TryShowPlaylistPathOnMap({ mapData }),
        () => thisBot.TryHidePlaylistPathOnMap({ mapData })
      );
    }
    break;

  default:
    break;
}

function HandleToggle(
  isEnabled: any,
  enableCallback = () => {},
  disableCallback = () => {}
) {
  if (isEnabled) {
    enableCallback();
    button.Activate();
  } else {
    disableCallback();
    button.Deactivate();
  }
}
