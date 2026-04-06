import type { LayoutBibleData } from "bibleVizUtils.models.entities.LayoutBibleData";

const {
  layoutData,
}: {
  layoutData: LayoutBibleData;
} = that;

if (layoutData.areLabelsEnabled) return;

layoutData.enableLabels();
thisBot.ShowLabels({ layoutData });
layoutData.staticLayoutPieces.settingsButtons
  ?.find((button) => {
    return (
      button.tags.buttonType ===
      BibleVizUtils.Data.tags.LayoutButtonType.ShowLabelsToggle
    );
  })
  ?.Activate?.();
