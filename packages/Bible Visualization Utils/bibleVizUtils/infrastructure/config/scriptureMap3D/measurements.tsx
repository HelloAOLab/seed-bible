const Book3DMaxAmountOfColumns = 5;
const Chapter3DWidth = 0.5;
const Chapter3DPadding = 0.1;
const Chapter3DGap = 0.1;

const Book3DScaleX =
  Book3DMaxAmountOfColumns * Chapter3DWidth +
  Chapter3DPadding * 2 +
  Chapter3DGap * (Book3DMaxAmountOfColumns - 1);

export const ScriptureMap3DMeasurements = {
  MaxAmountOfColumns: 7,
  Book3DMaxAmountOfColumns,
  Chapter3DWidth,
  Chapter3DHeight: 0.5,
  Chapter3DPadding,
  Chapter3DGap,
  BookHorizontalGap: 1,
  BookVerticalGap: 1,
  LayersVerticalGap: [
    3.5, 13.5, 21.625, 30.5, 43.5, 53.5, 57.5, 61.5, 68.5, 74,
  ],
  GapBetweenBookAndLine: 1.5,
  BookHorizontalOffset: 5,
  BookLabelHeight: 1,
  BookPositionZ: 1,
  ChapterInitialScaleZ: 0.15,
  ChapterSelectedScaleZ: 0.3,
  ChapterPlaylistItemDeltaHeight: 0.075,
  PlaylistNavigationButtonVerticalGap: 1,
  PlaylistStackedEntryItemGap: 0.0375,
  PlaylistEntryItemPadding: 0.01,
  Book2DMaxColumns: 5, // TODO: Move this to a Scripture Map 2D config provider
  Book3DScaleX,
} as const;

export type ScriptureMap3DMeasurementsType = typeof ScriptureMap3DMeasurements;
