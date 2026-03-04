const { layoutData } = that;

const settingsPieces = layoutData.staticLayoutPieces.settingsButtons.flatMap(
  (button) => {
    switch (button.tags.buttonType) {
      case BibleVizUtils.Data.tags.LayoutButtonType.CameraAnimationToggle:
      case BibleVizUtils.Data.tags.LayoutButtonType.ShowLabelsToggle:
      case BibleVizUtils.Data.tags.LayoutButtonType.PathToggle:
      case BibleVizUtils.Data.tags.LayoutButtonType.ChapterExpandToggle:
      case BibleVizUtils.Data.tags.LayoutButtonType.PlaylistPathToggle:
      case BibleVizUtils.Data.tags.LayoutButtonType.ShowDatesToggle:
        return [button, button.links.background, button.links.handle];

      case BibleVizUtils.Data.tags.LayoutButtonType.ColorPickerButton:
        return [
          button,
          button.links.colorContent,
          button.links.colorBackground,
        ];

      case BibleVizUtils.Data.tags.LayoutButtonType.DateFormatSelectorButton:
      case BibleVizUtils.Data.tags.LayoutButtonType.OpenAllBooksButton:
      case BibleVizUtils.Data.tags.LayoutButtonType.PlaylistSelectorButton:
        return [button, button.links.buttonLabel, button.links.buttonIcon];
    }
  }
);
const dimension = os.getCurrentDimension();
const duration = 0.25;
animateTag(
  layoutData.staticLayoutPieces.settingsButton,
  dimension + "RotationZ",
  null
);
if (layoutData.isShowingSettings) {
  layoutData.isShowingSettings = false;
  animateTag(
    layoutData.staticLayoutPieces.settingsButton,
    dimension + "RotationZ",
    {
      toValue: Math.PI,
      duration,
      easing: { type: "sinusoidal", mode: "inout" },
    }
  );
  setTag(settingsPieces, dimension, false);
} else {
  layoutData.isShowingSettings = true;
  animateTag(
    layoutData.staticLayoutPieces.settingsButton,
    dimension + "RotationZ",
    {
      toValue: Math.PI * 2,
      duration,
      easing: { type: "sinusoidal", mode: "inout" },
    }
  );
  setTag(settingsPieces, dimension, true);
}
