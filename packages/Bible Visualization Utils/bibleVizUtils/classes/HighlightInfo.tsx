export class HighlightInfo {
  key: any;
  typeOfPiece: any;
  color: any;

  constructor({ color, typeOfPiece, key }) {
    this.color = color;
    this.typeOfPiece = typeOfPiece;
    this.key = key;
  }
}
