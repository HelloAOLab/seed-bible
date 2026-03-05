export class ParentDataIds {
  layoutBookId: any;
  layoutId: any;
  stackBookId: any;
  stackSectionBookId: any;
  stackSectionId: any;
  stackTestamentId: any;
  stackBibleId: any;

  constructor({
    stackBibleId,
    stackTestamentId,
    stackSectionId,
    stackBookId,
    stackSectionBookId,
    layoutId,
    layoutBookId,
  }) {
    this.stackBibleId = stackBibleId;
    this.stackTestamentId = stackTestamentId;
    this.stackSectionId = stackSectionId;
    this.stackSectionBookId = stackSectionBookId;
    this.stackBookId = stackBookId;
    this.layoutId = layoutId;
    this.layoutBookId = layoutBookId;
  }
}
