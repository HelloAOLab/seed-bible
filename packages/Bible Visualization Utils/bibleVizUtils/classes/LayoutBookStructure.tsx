import { uuid } from "casualos";

export class LayoutBookStructure {
  id: any;
  elapsedYearsRange: any;
  historicalDateRange: any;
  row: any;
  column: any;
  infoCardcontent: any;
  infoCardBackground: any;
  infoCardTransformer: any;
  dateLabel: any;
  layoutId: any;
  structureIndex: any;
  nameLabel: any;
  layoutBookData: any;

  constructor({
    layoutBookData,
    nameLabel,
    structureIndex,
    layoutId,
    dateLabel,
    infoCardTransformer,
    infoCardBackground,
    infoCardcontent,
    column,
    row,
    historicalDateRange,
    elapsedYearsRange,
  }) {
    this.layoutBookData = layoutBookData;
    this.nameLabel = nameLabel;
    this.structureIndex = structureIndex;
    this.layoutId = layoutId;
    this.dateLabel = dateLabel;
    this.infoCardTransformer = infoCardTransformer;
    this.infoCardBackground = infoCardBackground;
    this.infoCardcontent = infoCardcontent;
    this.column = column;
    this.row = row;
    this.historicalDateRange = historicalDateRange;
    this.elapsedYearsRange = elapsedYearsRange;
    this.id = uuid();
  }
}
